<?php

namespace App\Services\Project;

use App\Models\Project;
use RuntimeException;

class GraphicalMethodService
{
    private const EPSILON = 1e-9;

    public function __construct(
        protected LinearProgrammingCoreService $core,
        protected ProjectService $projectService
    ) {
    }

    public function solve(Project $project): array
    {
        $project = $this->projectService->load($project);

        if ((int) $project->num_variables !== 2) {
            throw new RuntimeException('O metodo grafico exige exatamente 2 variaveis.');
        }

        $constraints = $this->formatConstraints($project);
        $objective = $project->objectiveFunction->coefficients;
        $intersections = $this->buildIntersections($constraints);
        $feasibleVertices = $this->filterFeasibleVertices($intersections, $constraints);
        $orderedVertices = $this->orderVertices($feasibleVertices);
        $optimalResult = $this->findOptimalResult(
            $orderedVertices,
            $objective,
            $project->optimization_type->value
        );
        $optimal = $optimalResult['optimal_solution'];

        $result = [
            'status' => $optimalResult['status'],
            'objective_value' => $optimalResult['objective_value'],
            'intersection_points' => $intersections,
            'vertices' => $orderedVertices,
            'objective_line' => $this->buildObjectiveLine($objective, $optimal),
            'optimal_solution' => $optimal,
            'optimal_vertices' => $optimalResult['optimal_vertices'],
            'optimal_segment' => $optimalResult['optimal_segment'],
            'has_multiple_solution' => $optimalResult['has_multiple_solution'],
            'solution' => $orderedVertices
        ];
  
        $solution = $this->projectService->persistSolution(
            $project,
            'graphical',
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

    private function buildIntersections(array $constraints): array
    {
        $lines = $constraints;
        $lines[] = [
            'coefficients' => [1, 0],
            'operator' => '=',
            'rhs_value' => 0,
        ];
        $lines[] = [
            'coefficients' => [0, 1],
            'operator' => '=',
            'rhs_value' => 0,
        ];

        $points = [];

        for ($i = 0; $i < count($lines); $i++) {
            for ($j = $i + 1; $j < count($lines); $j++) {
                $point = $this->solve2x2(
                    $lines[$i]['coefficients'],
                    $lines[$j]['coefficients'],
                    (float) $lines[$i]['rhs_value'],
                    (float) $lines[$j]['rhs_value']
                );

                if ($point === null) {
                    continue;
                }

                $points[] = [
                    'x' => $this->sanitizeCoordinate($point[0]),
                    'y' => $this->sanitizeCoordinate($point[1]),
                    'constraints' => [$i + 1, $j + 1],
                ];
            }
        }

        return $this->uniquePoints($points);
    }

    private function filterFeasibleVertices(array $points, array $constraints): array
    {
        $feasible = [];

        foreach ($points as $point) {
            if ($this->isFeasiblePoint($point, $constraints)) {
                $feasible[] = $point;
            }
        }

        return $this->uniquePoints($feasible);
    }

    private function isFeasiblePoint(array $point, array $constraints): bool
    {
        $x = (float) $point['x'];
        $y = (float) $point['y'];

        if ($x < -self::EPSILON || $y < -self::EPSILON) {
            return false;
        }

        foreach ($constraints as $constraint) {
            $lhs = ((float) $constraint['coefficients'][0] * $x)
                + ((float) $constraint['coefficients'][1] * $y);
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

    private function orderVertices(array $vertices): array
    {
        if (empty($vertices)) {
            return [];
        }

        $centerX = array_sum(array_column($vertices, 'x')) / count($vertices);
        $centerY = array_sum(array_column($vertices, 'y')) / count($vertices);

        usort($vertices, function (array $left, array $right) use ($centerX, $centerY) {
            $angleLeft = atan2($left['y'] - $centerY, $left['x'] - $centerX);
            $angleRight = atan2($right['y'] - $centerY, $right['x'] - $centerX);

            return $angleLeft <=> $angleRight;
        });

        return array_values($vertices);
    }

    private function findOptimalResult(array $vertices, array $objective, string $optimizationType): array
    {
        $bestVertex = null;
        $bestValue = null;
        $bestVertices = [];

        foreach ($vertices as $vertex) {
            $value = ((float) $objective[0] * (float) $vertex['x'])
                + ((float) $objective[1] * (float) $vertex['y']);

            if ($bestVertex === null) {
                $bestVertex = $vertex;
                $bestValue = $value;
                $bestVertices = [$vertex];
                continue;
            }

            if ($optimizationType === 'max' && $value > $bestValue + 1e-9) {
                $bestVertex = $vertex;
                $bestValue = $value;
                $bestVertices = [$vertex];
                continue;
            }

            if ($optimizationType === 'min' && $value < $bestValue - 1e-9) {
                $bestVertex = $vertex;
                $bestValue = $value;
                $bestVertices = [$vertex];
                continue;
            }

            if (abs($value - $bestValue) <= 1e-9) {
                $bestVertices[] = $vertex;
            }
        }

        if ($bestVertex === null) {
            return [
                'status' => 'infeasible',
                'objective_value' => null,
                'optimal_solution' => [
                    'status' => 'infeasible',
                    'message' => 'Nao foi possivel encontrar vertices viaveis.',
                ],
                'optimal_vertices' => [],
                'optimal_segment' => null,
                'has_multiple_solution' => false,
            ];
        }

        $optimalVertices = $this->cleanVertices($this->uniquePoints($bestVertices));
        $hasMultipleSolution = count($optimalVertices) >= 2;

        return [
            'status' => $hasMultipleSolution ? 'multiple' : 'optimal',
            'objective_value' => $this->cleanValue($bestValue),
            'optimal_solution' => [
                'x1' => $this->cleanValue((float) $bestVertex['x']),
                'x2' => $this->cleanValue((float) $bestVertex['y']),
                'objective_value' => $this->cleanValue($bestValue),
                'status' => $hasMultipleSolution ? 'multiple' : 'optimal',
            ],
            'optimal_vertices' => $optimalVertices,
            'optimal_segment' => $hasMultipleSolution
                ? $this->buildOptimalSegment($optimalVertices)
                : null,
            'has_multiple_solution' => $hasMultipleSolution,
        ];
    }

    private function cleanVertices(array $vertices): array
    {
        return array_values(array_map(
            fn (array $vertex) => [
                'x' => $this->cleanValue((float) $vertex['x']),
                'y' => $this->cleanValue((float) $vertex['y']),
            ],
            $vertices
        ));
    }

    private function buildOptimalSegment(array $vertices): ?array
    {
        if (count($vertices) < 2) {
            return null;
        }

        $bestSegment = null;
        $bestDistance = -1.0;

        for ($firstIndex = 0; $firstIndex < count($vertices); $firstIndex++) {
            for ($secondIndex = $firstIndex + 1; $secondIndex < count($vertices); $secondIndex++) {
                $first = $vertices[$firstIndex];
                $second = $vertices[$secondIndex];
                $distance = (($first['x'] - $second['x']) ** 2)
                    + (($first['y'] - $second['y']) ** 2);

                if ($distance > $bestDistance) {
                    $bestDistance = $distance;
                    $bestSegment = [
                        'start' => $first,
                        'end' => $second,
                    ];
                }
            }
        }

        return $bestSegment;
    }

    private function buildObjectiveLine(array $objective, array $optimal): array
    {
        if (($optimal['status'] ?? null) === 'infeasible') {
            return [
                'coefficients' => $objective,
                'z' => null,
            ];
        }

        return [
            'coefficients' => $objective,
            'z' => $optimal['objective_value'] ?? null,
        ];
    }

    private function solve2x2(array $left, array $right, float $b1, float $b2): ?array
    {
        $determinant = ((float) $left[0] * (float) $right[1]) - ((float) $left[1] * (float) $right[0]);

        if (abs($determinant) < self::EPSILON) {
            return null;
        }

        $x = (($b1 * (float) $right[1]) - ((float) $left[1] * $b2)) / $determinant;
        $y = (((float) $left[0] * $b2) - ($b1 * (float) $right[0])) / $determinant;

        return [$x, $y];
    }

    private function uniquePoints(array $points): array
    {
        $unique = [];
        $seen = [];

        foreach ($points as $point) {
            $key = $this->pointKey($point['x'], $point['y']);
            if (isset($seen[$key])) {
                continue;
            }

            $seen[$key] = true;
            $unique[] = $point;
        }

        return array_values($unique);
    }

    private function cleanValue(float $value): float
    {
        return $this->sanitizeCoordinate($value);
    }

    private function sanitizeCoordinate(float $value): float
    {
        if (abs($value) < self::EPSILON) {
            return 0.0;
        }

        return $value;
    }

    private function pointKey(float $x, float $y): string
    {
        return $this->formatCoordinate($x) . ':' . $this->formatCoordinate($y);
    }

    private function formatCoordinate(float $value): string
    {
        $normalized = $this->sanitizeCoordinate($value);

        return sprintf('%.6f', $normalized);
    }
}
