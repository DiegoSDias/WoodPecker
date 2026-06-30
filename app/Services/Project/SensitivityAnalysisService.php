<?php

namespace App\Services\Project;

use App\Models\Project;

class SensitivityAnalysisService
{
    private const EPSILON = 1e-5;
    private const DECIMAL_PLACES = 2;

    public function __construct(
        protected LinearProgrammingCoreService $core,
        protected ProjectService $projectService
    ) {
    }

    public function analyze(Project $project): array
    {
        $project = $this->projectService->load($project);

        $constraints = $this->formatConstraints($project);
        $primal = $this->core->solveSimplex(
            $project->objectiveFunction->coefficients,
            $constraints,
            $project->optimization_type->value
        );

        $dualProblem = $this->core->buildDualProblem(
            $project->objectiveFunction->coefficients,
            $constraints,
            $project->optimization_type->value
        );

        $dual = $this->core->solveSimplex(
            $dualProblem['objective_function']['coefficients'],
            $dualProblem['constraints'],
            $dualProblem['optimization_type']
        );

        $shadowPrices = $this->reconstructDualVariables(
            $dualProblem,
            $dual['solution'] ?? []
        );

        $decisionVariables = $this->buildDecisionVariables($primal['solution'] ?? []);
        $shadowPriceRows = $this->buildShadowPriceRows(
            $constraints,
            $shadowPrices,
            $primal['solution'] ?? []
        );
        $reducedCostRows = $this->buildReducedCostRows(
            $project->objectiveFunction->coefficients,
            $primal['reduced_costs'] ?? [],
            $primal['solution'] ?? []
        );
        $objectiveRangeRows = $this->buildObjectiveRanges(
            $project->objectiveFunction->coefficients,
            $primal['reduced_costs'] ?? []
        );
        $rhsRangeRows = $this->buildRhsRangeRows(
            $constraints,
            $primal['solution'] ?? [],
            $shadowPrices
        );

        $analysis = [
            'status' => $primal['status'] ?? 'optimal',
            'method_used' => 'sensitivity',
            'optimization_type' => $project->optimization_type->value,
            'objective_value' => $this->roundNumber($primal['objective_value'] ?? null),
            'primal_solution' => $this->roundVariables($primal['solution'] ?? []),
            'variables' => $decisionVariables,
            'shadow_prices' => $this->roundVariables($shadowPrices),
            'shadow_price_rows' => $this->roundShadowPriceRows($shadowPriceRows),
            'reduced_costs' => $this->roundVariables($primal['reduced_costs'] ?? []),
            'reduced_cost_rows' => $reducedCostRows,
            'objective_ranges' => $objectiveRangeRows,
            'rhs_ranges' => $rhsRangeRows,
            'objective_range_rows' => $objectiveRangeRows,
            'rhs_range_rows' => $rhsRangeRows,
            'active_constraints' => $this->extractConstraintNames(
                $shadowPriceRows,
                'Ativa'
            ),
            'slack_constraints' => $this->extractConstraintNames(
                $shadowPriceRows,
                'Folga'
            ),
            'summary' => $this->buildSummary(
                $project,
                $decisionVariables,
                $shadowPriceRows,
                $objectiveRangeRows,
                $rhsRangeRows,
                $primal['objective_value'] ?? null
            ),
        ];

        $solution = $this->projectService->persistSolution(
            $project,
            'sensitivity',
            $analysis
        );

        $analysis['saved_solution_id'] = $solution->id;

        return $analysis;
    }

    private function formatConstraints(Project $project): array
    {
        return $project->constraints->map(
            fn ($constraint) => [
                'coefficients' => $constraint->coefficients,
                'operator' => $constraint->operator->value,
                'rhs_value' => $constraint->rhs_value,
            ]
        )->values()->all();
    }

    private function reconstructDualVariables(array $dualProblem, array $solution): array
    {
        $values = [];

        foreach ($dualProblem['dual_variable_map'] as $constraintIndex => $meta) {
            $variableName = 'y' . ($constraintIndex + 1);

            if ($meta['type'] === 'positive') {
                $column = $meta['columns'][0];
                $values[$variableName] = (float) ($solution['x' . ($column + 1)] ?? 0.0);
                continue;
            }

            if ($meta['type'] === 'negative') {
                $column = $meta['columns'][0];
                $values[$variableName] = -1 * (float) ($solution['x' . ($column + 1)] ?? 0.0);
                continue;
            }

            $positiveColumn = $meta['columns'][0];
            $negativeColumn = $meta['columns'][1];

            $values[$variableName] = (float) ($solution['x' . ($positiveColumn + 1)] ?? 0.0)
                - (float) ($solution['x' . ($negativeColumn + 1)] ?? 0.0);
        }

        return $values;
    }

    private function buildObjectiveRanges(array $coefficients, array $reducedCosts): array
    {
        $ranges = [];

        foreach ($coefficients as $index => $value) {
            $name = 'x' . ($index + 1);
            $reducedCost = (float) ($reducedCosts[$name] ?? 0.0);

            $ranges[$name] = [
                'variable' => strtoupper($name),
                'current_coefficient' => $this->roundNumber((float) $value),
                'reduced_cost' => $this->roundNumber($reducedCost),
                'allowable_increase' => $this->roundNumber(abs($reducedCost)),
                'allowable_decrease' => $this->roundNumber(abs($reducedCost)),
            ];
        }

        return $ranges;
    }

    private function buildReducedCostRows(
        array $coefficients,
        array $reducedCosts,
        array $solution
    ): array {
        $rows = [];

        foreach ($coefficients as $index => $value) {
            $name = 'x' . ($index + 1);
            $reducedCost = (float) ($reducedCosts[$name] ?? 0.0);
            $variableValue = (float) ($solution[$name] ?? 0.0);

            $rows[] = [
                'variable' => strtoupper($name),
                'value' => $this->roundNumber($variableValue),
                'reducedCost' => $this->roundNumber($reducedCost),
                'interpretation' => abs($variableValue) > self::EPSILON
                    ? 'Variável básica'
                    : (abs($reducedCost) > self::EPSILON
                        ? 'Fora da base'
                        : 'Variável básica'),
            ];
        }

        return $rows;
    }

    private function buildShadowPriceRows(
        array $constraints,
        array $shadowPrices,
        array $solution
    ): array {
        $rows = [];

        foreach ($constraints as $index => $constraint) {
            $currentRhs = (float) $constraint['rhs_value'];
            $lhs = 0.0;

            foreach ($constraint['coefficients'] as $variableIndex => $coefficient) {
                $lhs += (float) $coefficient * (float) (
                    $solution['x' . ($variableIndex + 1)] ?? 0.0
                );
            }

            $slack = match ($constraint['operator']) {
                '<=' => $currentRhs - $lhs,
                '>=' => $lhs - $currentRhs,
                default => abs($lhs - $currentRhs),
            };

            $rows[] = [
                'restriction' => 'R' . ($index + 1),
                'current_rhs' => $this->roundNumber($currentRhs),
                'slack' => $this->roundNumber($slack),
                'shadowPrice' => $this->roundNumber(
                    (float) ($shadowPrices['y' . ($index + 1)] ?? 0.0)
                ),
                'status' => abs($slack) > self::EPSILON ? 'Folga' : 'Ativa',
            ];
        }

        return $rows;
    }

    private function buildRhsRangeRows(
        array $constraints,
        array $solution,
        array $shadowPrices
    ): array
    {
        $ranges = [];

        foreach ($constraints as $index => $constraint) {
            $lhs = 0.0;
            foreach ($constraint['coefficients'] as $variableIndex => $coefficient) {
                $lhs += (float) $coefficient * (float) ($solution['x' . ($variableIndex + 1)] ?? 0.0);
            }

            $rhs = (float) $constraint['rhs_value'];
            $slack = match ($constraint['operator']) {
                '<=' => $rhs - $lhs,
                '>=' => $lhs - $rhs,
                default => abs($lhs - $rhs),
            };

            $allowableIncrease = abs($slack);
            $allowableDecrease = abs($slack);

            $ranges['c' . ($index + 1)] = [
                'restriction' => 'R' . ($index + 1),
                'current_rhs' => $this->roundNumber($rhs),
                'slack' => $this->roundNumber($slack),
                'shadow_price' => $this->roundNumber(
                    (float) ($shadowPrices['y' . ($index + 1)] ?? 0.0)
                ),
                'allowable_increase' => $this->roundNumber($allowableIncrease),
                'allowable_decrease' => $this->roundNumber($allowableDecrease),
                'minimum' => $this->roundNumber($rhs - $allowableDecrease),
                'maximum' => $this->roundNumber($rhs + $allowableIncrease),
            ];
        }

        return $ranges;
    }

    private function buildDecisionVariables(array $solution): array
    {
        $variables = [];

        foreach ($solution as $name => $value) {
            if (! preg_match('/^x\d+$/i', (string) $name)) {
                continue;
            }

            $variables[strtoupper((string) $name)] = $this->roundNumber((float) $value);
        }

        ksort($variables, SORT_NATURAL);

        return $variables;
    }

    private function extractConstraintNames(array $rows, string $status): array
    {
        return array_values(array_map(
            fn (array $row) => $row['restriction'],
            array_filter(
                $rows,
                fn (array $row) => ($row['status'] ?? null) === $status
            )
        ));
    }

    private function buildSummary(
        Project $project,
        array $decisionVariables,
        array $shadowPriceRows,
        array $objectiveRangeRows,
        array $rhsRangeRows,
        float|int|string|null $objectiveValue
    ): string {
        $optimization = strtolower($project->optimization_type->value);
        $variablesText = ! empty($decisionVariables)
            ? implode(', ', array_map(
                fn ($value, $name) => $name . ' = ' . $this->cleanValue((float) $value),
                $decisionVariables,
                array_keys($decisionVariables)
            ))
            : 'sem variáveis ótimas identificadas';

        $activeConstraints = array_values(array_map(
            fn (array $row) => $row['restriction'],
            array_filter(
                $shadowPriceRows,
                fn (array $row) => ($row['status'] ?? null) === 'Ativa'
            )
        ));

        $slackConstraints = array_values(array_map(
            fn (array $row) => $row['restriction'],
            array_filter(
                $shadowPriceRows,
                fn (array $row) => ($row['status'] ?? null) === 'Folga'
            )
        ));

        $objectiveRangesText = count($objectiveRangeRows) > 0
            ? count($objectiveRangeRows) . ' intervalos de coeficientes analisados'
            : 'nenhum intervalo de coeficiente disponível';

        $rhsRangesText = count($rhsRangeRows) > 0
            ? count($rhsRangeRows) . ' intervalos de RHS analisados'
            : 'nenhum intervalo de RHS disponível';

        return sprintf(
            'A análise de sensibilidade para o problema de %s encontrou Z = %s, com %s. As restrições ativas são %s, enquanto as restrições com folga são %s. Também foram avaliados %s e %s, permitindo observar como pequenas variações nos coeficientes e nos lados direitos podem afetar a solução ótima.',
            $optimization,
            $this->cleanValue((float) ($objectiveValue ?? 0.0)),
            $variablesText,
            ! empty($activeConstraints) ? implode(', ', $activeConstraints) : 'nenhuma restrição ativa identificada',
            ! empty($slackConstraints) ? implode(', ', $slackConstraints) : 'nenhuma restrição com folga identificada',
            $objectiveRangesText,
            $rhsRangesText
        );
    }

    private function cleanValue(float $value): string
    {
        $roundedValue = $this->roundNumber($value);

        if (abs($roundedValue) < self::EPSILON) {
            return '0';
        }

        if (abs($roundedValue - round($roundedValue)) < self::EPSILON) {
            return (string) (int) round($roundedValue);
        }

        return rtrim(rtrim(number_format($roundedValue, 2, '.', ''), '0'), '.');
    }

    private function roundShadowPriceRows(array $rows): array
    {
        return array_map(function (array $row): array {
            if (array_key_exists('current_rhs', $row)) {
                $row['current_rhs'] = $this->roundNumber($row['current_rhs']);
            }

            if (array_key_exists('slack', $row)) {
                $row['slack'] = $this->roundNumber($row['slack']);
            }

            if (array_key_exists('shadowPrice', $row)) {
                $row['shadowPrice'] = $this->roundNumber($row['shadowPrice']);
            }

            return $row;
        }, $rows);
    }

    private function roundVariables(array $values): array
    {
        $rounded = [];

        foreach ($values as $key => $value) {
            if (is_numeric($value)) {
                $rounded[$key] = $this->roundNumber((float) $value);
                continue;
            }

            $rounded[$key] = $value;
        }

        return $rounded;
    }

    private function roundNumber(float|int|string|null $value): float
    {
        if ($value === null || $value === '') {
            return 0.0;
        }

        $number = (float) $value;
        $rounded = round($number, self::DECIMAL_PLACES);

        if (abs($rounded) < self::EPSILON) {
            return 0.0;
        }

        return $rounded;
    }
}
