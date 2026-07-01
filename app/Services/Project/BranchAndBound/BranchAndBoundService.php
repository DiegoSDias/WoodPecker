<?php

namespace App\Services\Project\BranchAndBound;

use App\Models\Project;
use App\Services\Project\ProjectService;

class BranchAndBoundService
{
    // Função __construct responsável por ligar o serviço principal do Branch and Bound.
    public function __construct(
        protected ProjectService $projectService,
        protected ExploreNodeService $exploreNodeService,
        protected FormatBoundService $formatBoundService,
        protected BranchAndBoundRulesService $branchAndBoundRulesService,
    ) {}

    // Executa o metodo principal do service e devolve o resultado final.
    public function solve(Project $project): array
    {
        $project = $this->projectService->load($project);

        $iterations = [];
        $summary = [
            'nodes_explored' => 0,
            'branched_nodes' => 0,
            'integer_nodes' => 0,
            'pruned_nodes' => 0,
            'max_depth' => 0,
            'termination_reason' => null,
        ];

        $bestSolution = null;
        $nextId = 0;

        $this->exploreNodeService->exploreNode(
            $project,
            [],
            null,
            0,
            $iterations,
            $summary,
            $bestSolution,
            $nextId
        );

        $result = [
            'status' => $this->resolveStatus($bestSolution, $summary),
            'summary' => $this->buildSummary($summary, $bestSolution),
            'best_solution' => $this->formatBoundService->formatBestSolution($bestSolution),
            'best_path_ids' => $this->buildBestPathIds($iterations, $bestSolution['node_id'] ?? null),
            'iterations' => $iterations,
            'solution' => $this->formatBoundService->formatBestSolution($bestSolution),
        ];

        $solution = $this->projectService->persistSolution(
            $project,
            'integer',
            $result
        );

        $result['saved_solution_id'] = $solution->id;

        return $result;
    }

    // Reconstrói o caminho da melhor solução a partir da arvore explorada.
    private function buildBestPathIds(array $iterations, ?int $bestNodeId): array
    {
        if ($bestNodeId === null) {
            return [];
        }

        $parentMap = [];
        foreach ($iterations as $iteration) {
            $parentMap[$iteration['node_id']] = $iteration['parent_id'];
        }

        $path = [];
        $current = $bestNodeId;

        while ($current !== null && isset($parentMap[$current])) {
            $path[] = $current;
            $current = $parentMap[$current];
        }

        if ($current !== null) {
            $path[] = $current;
        }

        return array_reverse($path);
    }

    // Monta o resumo consolidado da exploracao da arvore.
    private function buildSummary(array $summary, ?array $bestSolution): array
    {
        return [
            'nodes_explored' => $summary['nodes_explored'],
            'branched_nodes' => $summary['branched_nodes'],
            'integer_nodes' => $summary['integer_nodes'],
            'pruned_nodes' => $summary['pruned_nodes'],
            'max_depth' => $summary['max_depth'],
            'termination_reason' => $summary['termination_reason'],
            'best_objective_value' => $bestSolution['objective_value'] ?? null,
        ];
    }

    // Define o status final do Branch and Bound.
    private function resolveStatus(?array $bestSolution, array $summary): string
    {
        if ($bestSolution !== null) {
            return 'optimal';
        }

        return $summary['termination_reason'] ?? 'no_integer_solution';
    }
}
