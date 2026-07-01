<?php

namespace App\Http\Controllers\Project;

use App\Http\Controllers\Controller;
use App\Http\Requests\Project\StoreProjectRequest;
use App\Models\Project;
use App\Services\Project\BranchAndBound\BranchAndBoundService;
use App\Services\Project\DualSimplex\DualSimplexService;
use App\Services\Project\GraphicMethod\GraphicalMethodService;
use App\Services\Project\ProjectService;
use App\Services\Project\SensitivityAnalysis\SensitivityAnalysisService;
use App\Services\Project\Simplex\SimplexService;
use Symfony\Component\HttpFoundation\Response;

class ProjectController extends Controller
{
    public function __construct(
        protected ProjectService $projectService,
        protected SimplexService $simplexService,
        protected GraphicalMethodService $graphicalMethodService,
        protected BranchAndBoundService $branchAndBoundService,
        protected DualSimplexService $dualSimplexService,
        protected SensitivityAnalysisService $sensitivityAnalysisService
    ) {
    }

    public function show(Project $project)
    {
        try {
            return $this->sendResponse(
                ['project' => $this->projectService->load($project)],
                'Projeto carregado com sucesso!',
                Response::HTTP_OK
            );

        } catch (\Throwable $th) {
            return $this->sendError(
                ['detalhe' => $th->getMessage()],
                'Erro ao carregar projeto',
                Response::HTTP_NOT_FOUND
            );
        }
    }

    public function store(StoreProjectRequest $request)
    {
        try {
            $data = $request->validated();
            $project = $this->projectService->create($data);

            return $this->sendResponse(
                ['project' => $project],
                'Projeto criado com sucesso!',
                Response::HTTP_CREATED
            );
            
        } catch (\Throwable $th) {
            return $this->sendError(
                ['detalhe' => $th->getMessage()],
                'Erro ao criar projeto',
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }
    }

    public function solveSimplex(Project $project)
    {
        try {
            return $this->sendResponse(
                $this->simplexService->solve($project),
                'Simplex executado com sucesso!',
                Response::HTTP_OK
            );
        } catch (\Throwable $th) {
            return $this->sendError(
                ['detalhe' => $th->getMessage()],
                'Erro ao executar Simplex',
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }
    }

    public function solveGraphical(Project $project)
    {
        try {
            return $this->sendResponse(
                $this->graphicalMethodService->solve($project),
                'Metodo grafico executado com sucesso!',
                Response::HTTP_OK
            );
        } catch (\Throwable $th) {
            return $this->sendError(
                ['detalhe' => $th->getMessage()],
                'Erro ao executar metodo grafico',
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }
    }

    public function solveInteger(Project $project)
    {
        try {
            return $this->sendResponse(
                $this->branchAndBoundService->solve($project),
                'Programacao inteira executada com sucesso!',
                Response::HTTP_OK
            );
        } catch (\Throwable $th) {
            return $this->sendError(
                ['detalhe' => $th->getMessage()],
                'Erro ao executar programacao inteira',
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }
    }

    public function solveDual(Project $project)
    {
        try {
            return $this->sendResponse(
                $this->dualSimplexService->solve($project),
                'Dual simplex executado com sucesso!',
                Response::HTTP_OK
            );
        } catch (\Throwable $th) {
            return $this->sendError(
                ['detalhe' => $th->getMessage()],
                'Erro ao executar dual simplex',
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }
    }

    public function solveSensitivity(Project $project)
    {
        try {
            return $this->sendResponse(
                $this->sensitivityAnalysisService->analyze($project),
                'Analise de sensibilidade executada com sucesso!',
                Response::HTTP_OK
            );
        } catch (\Throwable $th) {
            return $this->sendError(
                ['detalhe' => $th->getMessage()],
                'Erro ao executar analise de sensibilidade',
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }
    }

    public function solutions(Project $project)
    {
        try {
            return $this->sendResponse(
                ['solutions' => $this->projectService->getSolutions($project)],
                'Solucoes carregadas com sucesso!',
                Response::HTTP_OK
            );
        } catch (\Throwable $th) {
            return $this->sendError(
                ['detalhe' => $th->getMessage()],
                'Erro ao listar solucoes',
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }
    }
}
