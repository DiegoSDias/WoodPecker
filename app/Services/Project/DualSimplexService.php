<?php

namespace App\Services\Project;

use App\Models\Project;

class DualSimplexService
{
    public function __construct(
        protected LinearProgrammingCoreService $core,
        protected ProjectService $projectService
    ) {
    }

    public function solve(Project $project): array
    {
        $project = $this->projectService->load($project);

        $primal = $this->core->solveSimplexWithHistory(
            $project->objectiveFunction->coefficients,
            $this->formatConstraints($project),
            $project->optimization_type->value
        );

        $dualProblem = $this->core->buildDualProblem(
            $project->objectiveFunction->coefficients,
            $this->formatConstraints($project),
            $project->optimization_type->value
        );

        $dualResult = $this->core->solveSimplexWithHistory(
            $dualProblem['objective_function']['coefficients'],
            $dualProblem['constraints'],
            $dualProblem['optimization_type']
        );

        $shadowPrices = $this->reconstructDualVariables(
            $dualProblem,
            $dualResult['solution'] ?? []
        );

        $result = [
            'primal' => [
                'solution' => $primal,
            ],
            'dual' => [
                'problem' => $dualProblem,
                'solution' => $dualResult,
            ],
            'solution' => [
                'primal_solution' => $primal['solution'] ?? [],
                'dual_solution' => $shadowPrices,
                'objective_value' => $primal['objective_value'] ?? null,
                'shadow_prices' => $shadowPrices,
                'reduced_costs' => $primal['reduced_costs'] ?? [],
            ],
        ];

        $solution = $this->projectService->persistSolution(
            $project,
            'dual',
            $result
        );

        $result['saved_solution_id'] = $solution->id;

        return $result;
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
}
