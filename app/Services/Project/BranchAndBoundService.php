<?php

namespace App\Services\Project;

use App\Models\Project;

class BranchAndBoundService
{
    private const MAX_NODES = 64;
    private const MAX_DEPTH = 20;
    private const EPSILON = 1e-6;

    public function __construct(
        protected LinearProgrammingCoreService $core,
        protected ProjectService $projectService
    ) {}

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

        $this->exploreNode(
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
            'best_solution' => $this->formatBestSolution($bestSolution),
            'best_path_ids' => $this->buildBestPathIds($iterations, $bestSolution['node_id'] ?? null),
            'iterations' => $iterations,
            'solution' => $this->formatBestSolution($bestSolution)
        ];

        $solution = $this->projectService->persistSolution(
            $project,
            'integer',
            $result
        );

        $result['saved_solution_id'] = $solution->id;

        return $result;
    }

    private function exploreNode(
        Project $project,
        array $extraConstraints,
        ?int $parentId,
        int $depth,
        array &$iterations,
        array &$summary,
        ?array &$bestSolution,
        int &$nextId
    ): void 
    {
        if ($summary['nodes_explored'] >= self::MAX_NODES || $depth > self::MAX_DEPTH) {
            $summary['termination_reason'] ??= 'limit';
            return;
        }

        $nodeId = ++$nextId;
        $summary['nodes_explored']++;
        $summary['max_depth'] = max($summary['max_depth'], $depth);

        $constraints = array_merge($this->formatConstraints($project), $extraConstraints);
        $relaxation = $this->core->solveSimplex(
            $project->objectiveFunction->coefficients,
            $constraints,
            $project->optimization_type->value,
            [
                'store_iterations' => false,
                'detect_multiple_solutions' => false,
                'max_iterations' => 100,
            ]
        );

        $record = [
            'iteration' => count($iterations) + 1,
            'node_id' => $nodeId,
            'parent_id' => $parentId,
            'depth' => $depth,
            'status' => $relaxation['status'] ?? 'unknown',
            'objective_value' => $relaxation['objective_value'] ?? null,
            'solution' => $relaxation['solution'] ?? [],
            'branch_variable' => null,
            'branch_value' => null,
            'new_bound' => $this->formatLatestBound($extraConstraints),
            'pruned_reason' => null,
        ];

        if (in_array($relaxation['status'], ['infeasible', 'unbounded', 'iteration_limit', 'cycled'], true)) {
            $record['status'] = 'pruned';
            $record['pruned_reason'] = $relaxation['status'];
            $summary['pruned_nodes']++;
            $summary['termination_reason'] ??= $relaxation['status'];
            $iterations[] = $record;
            return;
        }

        if ($this->cannotBeatIncumbent($project, $bestSolution, $relaxation)) {
            $record['status'] = 'pruned';
            $record['pruned_reason'] = 'bound_not_better';
            $summary['pruned_nodes']++;
            $iterations[] = $record;
            return;
        }

        if ($this->isIntegerSolution($record['solution'])) {
            $record['status'] = 'integer';
            $summary['integer_nodes']++;
            $this->updateBestSolution($bestSolution, $record, $project);
            $iterations[] = $record;
            return;
        }

        $fractional = $this->findFractionalVariable($record['solution']);
        if ($fractional === null) {
            $record['status'] = 'integer';
            $summary['integer_nodes']++;
            $this->updateBestSolution($bestSolution, $record, $project);
            $iterations[] = $record;
            return;
        }

        $record['status'] = 'branch';
        $record['branch_variable'] = $fractional['name'];
        $record['branch_value'] = $fractional['value'];
        $summary['branched_nodes']++;
        $iterations[] = $record;

        $leftConstraints = $extraConstraints;
        $leftConstraints[] = $this->buildBoundConstraint(
            $fractional['index'],
            '<=',
            floor($fractional['value']),
            $project->num_variables
        );

        $rightConstraints = $extraConstraints;
        $rightConstraints[] = $this->buildBoundConstraint(
            $fractional['index'],
            '>=',
            ceil($fractional['value']),
            $project->num_variables
        );

        $this->exploreNode(
            $project,
            $leftConstraints,
            $nodeId,
            $depth + 1,
            $iterations,
            $summary,
            $bestSolution,
            $nextId
        );

        $this->exploreNode(
            $project,
            $rightConstraints,
            $nodeId,
            $depth + 1,
            $iterations,
            $summary,
            $bestSolution,
            $nextId
        );
    }

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

    private function formatBestSolution(?array $bestSolution): ?array
    {
        if ($bestSolution === null) {
            return null;
        }

        return [
            'node_id' => $bestSolution['node_id'],
            'parent_id' => $bestSolution['parent_id'],
            'depth' => $bestSolution['depth'],
            'objective_value' => $bestSolution['objective_value'],
            'variables' => $bestSolution['solution'],
        ];
    }

    private function resolveStatus(?array $bestSolution, array $summary): string
    {
        if ($bestSolution !== null) {
            return 'optimal';
        }

        return $summary['termination_reason'] ?? 'no_integer_solution';
    }

    private function formatConstraints(Project $project): array
    {
        return $project->constraints->map(
            fn($constraint) => [
                'coefficients' => $constraint->coefficients,
                'operator' => $constraint->operator->value,
                'rhs_value' => $constraint->rhs_value,
            ]
        )->values()->all();
    }

    private function formatLatestBound(array $extraConstraints): ?array
    {
        if (empty($extraConstraints)) {
            return null;
        }

        $bound = end($extraConstraints);

        return [
            'coefficients' => $bound['coefficients'],
            'operator' => $bound['operator'],
            'rhs_value' => $bound['rhs_value'],
            'label' => $this->boundToLabel($bound),
        ];
    }

    private function boundToLabel(array $bound): string
    {
        $variableIndex = array_search(1.0, $bound['coefficients'], true);
        $variableName = $variableIndex === false ? 'x?' : 'x' . ($variableIndex + 1);

        return $variableName . ' ' . $bound['operator'] . ' ' . $bound['rhs_value'];
    }

    private function buildBoundConstraint(
        int $variableIndex,
        string $operator,
        float $rhs,
        int $variableCount
    ): array 
    {
        $coefficients = array_fill(0, $variableCount, 0.0);
        $coefficients[$variableIndex] = 1.0;

        return [
            'coefficients' => $coefficients,
            'operator' => $operator,
            'rhs_value' => $rhs,
        ];
    }

    private function isIntegerSolution(array $solution): bool
    {
        foreach ($solution as $value) {
            if (abs($value - round($value)) > self::EPSILON) {
                return false;
            }
        }

        return true;
    }

    private function findFractionalVariable(array $solution): ?array
    {
        $bestIndex = null;
        $bestFraction = 0.0;

        foreach ($solution as $name => $value) {
            $fraction = abs($value - round($value));
            if ($fraction <= self::EPSILON) {
                continue;
            }

            if ($fraction > $bestFraction) {
                $bestFraction = $fraction;
                $bestIndex = (int) substr($name, 1) - 1;
            }
        }

        if ($bestIndex === null) {
            return null;
        }

        $variableName = 'x' . ($bestIndex + 1);

        return [
            'index' => $bestIndex,
            'name' => $variableName,
            'value' => (float) $solution[$variableName],
        ];
    }

    private function updateBestSolution(?array &$bestSolution, array $record, Project $project): void
    {
        $candidate = [
            'node_id' => $record['node_id'],
            'parent_id' => $record['parent_id'],
            'depth' => $record['depth'],
            'objective_value' => $record['objective_value'],
            'solution' => $record['solution'],
        ];

        if ($bestSolution === null) {
            $bestSolution = $candidate;
            return;
        }

        $current = (float) $candidate['objective_value'];
        $best = (float) $bestSolution['objective_value'];

        if ($project->optimization_type->value === 'max' && $current > $best + self::EPSILON) {
            $bestSolution = $candidate;
        }

        if ($project->optimization_type->value === 'min' && $current < $best - self::EPSILON) {
            $bestSolution = $candidate;
        }
    }

    private function cannotBeatIncumbent(
        Project $project,
        ?array $bestSolution,
        array $relaxation
    ): bool 
    {
        if ($bestSolution === null) {
            return false;
        }

        $current = (float) ($relaxation['objective_value'] ?? 0.0);
        $best = (float) ($bestSolution['objective_value'] ?? 0.0);

        if ($project->optimization_type->value === 'max') {
            return $current <= $best + self::EPSILON;
        }

        return $current >= $best - self::EPSILON;
    }

    private function solutionRespectsConstraints(array $solution, array $constraints): bool
    {
        if (empty($solution)) {
            return false;
        }

        foreach ($constraints as $constraint) {
            $lhs = 0.0;

            foreach ($constraint['coefficients'] as $index => $coefficient) {
                $lhs += (float) $coefficient * (float) ($solution['x' . ($index + 1)] ?? 0.0);
            }

            $rhs = (float) $constraint['rhs_value'];

            if ($constraint['operator'] === '<=' && $lhs - $rhs > self::EPSILON) {
                return false;
            }

            if ($constraint['operator'] === '>=' && $rhs - $lhs > self::EPSILON) {
                return false;
            }

            if ($constraint['operator'] === '=' && abs($lhs - $rhs) > self::EPSILON) {
                return false;
            }
        }

        return true;
    }

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
}

