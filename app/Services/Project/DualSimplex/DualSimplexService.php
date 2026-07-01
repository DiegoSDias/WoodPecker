<?php

namespace App\Services\Project\DualSimplex;

use App\Models\Project;
use App\Services\Project\Core\LinearProgrammingCoreService;
use App\Services\Project\Core\ProblemBuilderService;
use App\Services\Project\Support\ProjectAnalysisSupportService;
use App\Services\Project\ProjectService;

class DualSimplexService
{
    // Injeta o núcleo de cálculo, o service de projetos e o apoio compartilhado de análise.
    public function __construct(
        protected ProblemBuilderService $problemBuilderService,
        protected LinearProgrammingCoreService $core,
        protected ProjectService $projectService,
        protected ProjectAnalysisSupportService $analysisSupport
    ) {
    }

    // Executa o método dual, reconstrói os preços-sombra e salva o resultado final.
    public function solve(Project $project): array
    {
        $project = $this->projectService->load($project);

        $primal = $this->core->solveSimplexWithHistory(
            $project->objectiveFunction->coefficients,
            $this->analysisSupport->formatConstraints($project),
            $project->optimization_type->value
        );

        $dualProblem = $this->problemBuilderService->buildDualProblem(
            $project->objectiveFunction->coefficients,
            $this->analysisSupport->formatConstraints($project),
            $project->optimization_type->value
        );

        $dualResult = $this->core->solveSimplexWithHistory(
            $dualProblem['objective_function']['coefficients'],
            $dualProblem['constraints'],
            $dualProblem['optimization_type']
        );

        $shadowPrices = $this->analysisSupport->reconstructDualVariables(
            $dualProblem,
            $dualResult['solution'] ?? []
        );

        $result = [
            'primal' => [
                'solution' => $primal,
            ],
            'dual' => [
                // Talvez tirar
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
}
