<?php

namespace App\Services\Project;

use App\Models\Project;

class SensitivityAnalysisService
{
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

        $analysis = [
            // 'primal' => $primal,
            // 'dual' => $dual,
            'primal_solution' => $primal['solution'] ?? [],
            'shadow_prices' => $shadowPrices,
            'reduced_costs' => $primal['reduced_costs'] ?? [],
            'objective_ranges' => $this->buildObjectiveRanges(
                $project->objectiveFunction->coefficients,
                $primal['reduced_costs'] ?? []
            ),
            'rhs_ranges' => $this->buildRhsRanges(
                $constraints,
                $primal['solution'] ?? [],
                $shadowPrices
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
                'current_coefficient' => (float) $value,
                'reduced_cost' => $reducedCost,
                'allowable_increase' => abs($reducedCost),
                'allowable_decrease' => abs($reducedCost),
            ];
        }

        return $ranges;
    }

    private function buildRhsRanges(array $constraints, array $solution, array $shadowPrices): array
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

            $ranges['c' . ($index + 1)] = [
                'current_rhs' => $rhs,
                'slack' => round($slack, 6),
                'shadow_price' => (float) ($shadowPrices['y' . ($index + 1)] ?? 0.0),
                'allowable_increase' => abs($slack),
                'allowable_decrease' => abs($slack),
            ];
        }

        return $ranges;
    }
}
