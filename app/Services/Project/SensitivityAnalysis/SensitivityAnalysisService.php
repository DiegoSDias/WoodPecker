<?php

namespace App\Services\Project\SensitivityAnalysis;

use App\Models\Project;
use App\Services\Project\Core\LinearProgrammingCoreService;
use App\Services\Project\Core\ProblemBuilderService;
use App\Services\Project\ProjectService;
use App\Services\Project\Support\ProjectAnalysisSupportService;

class SensitivityAnalysisService
{
    private const EPSILON = 1e-5;

    // Função __construct responsável por ligar o service principal de sensibilidade aos auxiliares corretos.
    public function __construct(
        protected LinearProgrammingCoreService $core,
        protected ProblemBuilderService $problemBuilderService,
        protected ProjectService $projectService,
        protected ProjectAnalysisSupportService $analysisSupport,
        protected SensitivityMathService $sensitivityMathService,
        protected BuildRanges $buildRanges
    ) {}

    // Executa a analise de sensibilidade e monta o retorno final para o front.
    public function analyze(Project $project): array
    {
        $project = $this->projectService->load($project);

        $constraints = $this->analysisSupport->formatConstraints($project);

        $primal = $this->core->solveSimplex(
            $project->objectiveFunction->coefficients,
        $constraints,
        $project->optimization_type->value
    );

        $dualProblem = $this->problemBuilderService->buildDualProblem(
            $project->objectiveFunction->coefficients,
            $constraints,
            $project->optimization_type->value
        );

        $dual = $this->core->solveSimplex(
            $dualProblem['objective_function']['coefficients'],
            $dualProblem['constraints'],
            $dualProblem['optimization_type']
        );

        $shadowPrices = $this->analysisSupport->reconstructDualVariables(
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

        $objectiveRangeRows = $this->buildRanges->buildObjectiveRanges(
            $project->objectiveFunction->coefficients,
            $primal['reduced_costs'] ?? [],
            $constraints,
            $primal['solution'] ?? [],
            $project->optimization_type->value
        );

        $rhsRangeRows = $this->buildRanges->buildRhsRangeRows(
            $constraints,
            $primal['solution'] ?? [],
            $shadowPrices
        );

        $analysis = [
            'status' => ! empty($primal['has_multiple_solution'])
                ? 'multiple'
                : ($primal['status'] ?? 'optimal'),
            'method_used' => 'sensitivity',
            'optimization_type' => $project->optimization_type->value,
            'objective_value' => $this->sensitivityMathService->roundNumber($primal['objective_value'] ?? null),
            'primal_solution' => $decisionVariables,
            'variables' => $decisionVariables,
            'shadow_prices' => $shadowPriceRows,
            'reduced_costs' => $reducedCostRows,
            'objective_ranges' => $objectiveRangeRows,
            'rhs_ranges' => $rhsRangeRows,
            'active_constraints' => $this->extractConstraintNames($shadowPriceRows, 'Ativa'),
            'slack_constraints' => $this->extractConstraintNames($shadowPriceRows, 'Folga'),
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

    // Monta as linhas de custos reduzidos para a tela de sensibilidade.
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
                'value' => $this->sensitivityMathService->roundNumber($variableValue),
                'reducedCost' => $this->sensitivityMathService->roundNumber($reducedCost),
                'interpretation' => abs($variableValue) > self::EPSILON
                    ? 'Variável básica'
                    : (abs($reducedCost) > self::EPSILON
                        ? 'Fora da base'
                        : 'Variável básica'),
            ];
        }

        return $rows;
    }

    // Monta as linhas dos precos-sombra e identifica restricoes ativas.
    private function buildShadowPriceRows(
        array $constraints,
        array $shadowPrices,
        array $solution
    ): array {
        $rows = [];

        foreach ($constraints as $index => $constraint) {
            $currentRhs = (float) $constraint['rhs_value'];
            $lhs = $this->sensitivityMathService->calculateLhs($constraint, $solution);

            $slack = match ($constraint['operator']) {
                '<=' => $currentRhs - $lhs,
                '>=' => $lhs - $currentRhs,
                default => abs($lhs - $currentRhs),
            };

            $rows[] = [
                'restriction' => 'R' . ($index + 1),
                'current_rhs' => $this->sensitivityMathService->roundNumber($currentRhs),
                'slack' => $this->sensitivityMathService->roundNumber($slack),
                'shadowPrice' => $this->sensitivityMathService->roundNumber(
                    (float) ($shadowPrices['y' . ($index + 1)] ?? 0.0)
                ),
                'status' => abs($slack) > self::EPSILON ? 'Folga' : 'Ativa',
            ];
        }

        return $rows;
    }

    // Monta o conjunto de variaveis de decisao com arredondamento padrao.
    private function buildDecisionVariables(array $solution): array
    {
        $variables = [];

        foreach ($solution as $name => $value) {
            if (! preg_match('/^x\d+$/i', (string) $name)) {
                continue;
            }

            $variables[strtoupper((string) $name)] = $this->sensitivityMathService->roundNumber((float) $value);
        }

        ksort($variables, SORT_NATURAL);

        return $variables;
    }

    // Extrai o nome das restricoes filtrando pelo status informado.
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

    // Monta o resumo consolidado da analise para exibir no front.
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
                fn ($value, $name) => $name . ' = ' . $this->sensitivityMathService->cleanValue((float) $value),
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
            $this->sensitivityMathService->cleanValue((float) ($objectiveValue ?? 0.0)),
            $variablesText,
            ! empty($activeConstraints) ? implode(', ', $activeConstraints) : 'nenhuma restrição ativa identificada',
            ! empty($slackConstraints) ? implode(', ', $slackConstraints) : 'nenhuma restrição com folga identificada',
            $objectiveRangesText,
            $rhsRangesText
        );
    }
}
