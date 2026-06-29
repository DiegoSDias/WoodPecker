<?php

namespace App\Services\Project;

use App\Models\Project;

class SimplexService
{
    public function __construct(
        protected LinearProgrammingCoreService $core,
        protected ProjectService $projectService
    ) {
    }

    public function solve(Project $project): array
    {
        $project = $this->projectService->load($project);

        $result = $this->core->solveSimplexWithHistory(
            $project->objectiveFunction->coefficients,
            $this->formatConstraints($project),
            $project->optimization_type->value
        );

        $solution = $this->projectService->persistSolution(
            $project,
            'simplex',
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
}
