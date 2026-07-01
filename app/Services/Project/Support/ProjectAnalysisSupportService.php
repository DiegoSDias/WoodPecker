<?php

namespace App\Services\Project\Support;

use App\Models\Project;

class ProjectAnalysisSupportService
{
    private const EPSILON = 1e-9;

    // Gera as restrições em um formato uniforme para os services de cálculo.
    public function formatConstraints(Project $project): array
    {
        return $project->constraints->map(
            fn($constraint) => [
                'coefficients' => array_values($constraint->coefficients ?? []),
                'operator' => $constraint->operator->value,
                'rhs_value' => $constraint->rhs_value,
            ]
        )->values()->all();
    }

    // Reconstrói as variáveis duais usando o mapeamento criado pelo problema dual e a solução encontrada.
    public function reconstructDualVariables(array $dualProblem, array $solution): array
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

    // Remove pontos repetidos usando as coordenadas x e y como chave de comparação.
    public function uniquePoints(array $points): array
    {
        $unique = [];
        $seen = [];

        foreach ($points as $point) {
            if (! isset($point['x'], $point['y'])) {
                continue;
            }

            $key = $this->pointKey((float) $point['x'], (float) $point['y']);

            if (isset($seen[$key])) {
                continue;
            }

            $seen[$key] = true;
            $unique[] = $point;
        }

        return array_values($unique);
    }

    // Verifica se um ponto respeita todas as restrições do problema.
    public function isFeasiblePoint(array $point, array $constraints): bool
    {
        $x = (float) ($point['x'] ?? 0.0);
        $y = (float) ($point['y'] ?? 0.0);

        if ($x < -self::EPSILON || $y < -self::EPSILON) {
            return false;
        }

        foreach ($constraints as $constraint) {
            $lhs = ((float) ($constraint['coefficients'][0] ?? 0.0) * $x)
                + ((float) ($constraint['coefficients'][1] ?? 0.0) * $y);
            $rhs = (float) ($constraint['rhs_value'] ?? 0.0);
            $operator = (string) ($constraint['operator'] ?? '<=');

            if ($operator === '<=' && $lhs - $rhs > self::EPSILON) {
                return false;
            }

            if ($operator === '>=' && $rhs - $lhs > self::EPSILON) {
                return false;
            }

            if ($operator === '=' && abs($lhs - $rhs) > self::EPSILON) {
                return false;
            }
        }

        return true;
    }

    // Zera variações numéricas muito pequenas antes da comparação.
    public function sanitizeCoordinate(float $value): float
    {
        if (abs($value) < self::EPSILON) {
            return 0.0;
        }

        return $value;
    }

    public function buildIntersections(array $constraints): array
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

    // Resolve a interseção entre duas retas usando as equações lineares correspondentes.
    private function solve2x2(array $left, array $right, float $b1, float $b2): ?array
    {
        $determinant = ((float) $left[0] * (float) $right[1])
            - ((float) $left[1] * (float) $right[0]);

        if (abs($determinant) < self::EPSILON) {
            return null;
        }

        $x = (($b1 * (float) $right[1]) - ((float) $left[1] * $b2)) / $determinant;
        $y = (((float) $left[0] * $b2) - ($b1 * (float) $right[0])) / $determinant;

        return [$x, $y];
    }

    // Filtra apenas os vertices que continuam viaveis.
    public function filterFeasibleVertices(array $points, array $constraints): array
    {
        $feasible = [];

        foreach ($points as $point) {
            if ($this->isFeasiblePoint($point, $constraints)) {
                $feasible[] = $point;
            }
        }

        return $this->uniquePoints($feasible);
    }

    // Gera uma chave estável para comparar pontos e eliminar duplicidades.
    private function pointKey(float $x, float $y): string
    {
        return $this->formatCoordinate($x) . ':' . $this->formatCoordinate($y);
    }

    // Normaliza a coordenada antes de montar a chave de comparação.
    private function formatCoordinate(float $value): string
    {
        return sprintf('%.6f', $this->sanitizeCoordinate($value));
    }
}
