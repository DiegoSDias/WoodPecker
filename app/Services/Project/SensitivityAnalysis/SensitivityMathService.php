<?php

namespace App\Services\Project\SensitivityAnalysis;

class SensitivityMathService
{
    private const EPSILON = 1e-5;
    private const DECIMAL_PLACES = 2;

    // Calcula o lado esquerdo de uma restricao usando a solucao atual.
    public function calculateLhs(array $constraint, array $solution): float
    {
        $lhs = 0.0;

        foreach (($constraint['coefficients'] ?? []) as $index => $coefficient) {
            $lhs += (float) $coefficient * (float) ($solution['x' . ($index + 1)] ?? 0.0);
        }

        return $lhs;
    }

    // Calcula o intervalo permitido para um coeficiente da funcao objetivo.
    public function calculateObjectiveCoefficientRange(
        array $coefficients,
        array $vertices,
        array $currentPoint,
        int $targetIndex,
        string $optimizationType
    ): ?array {
        $coefficients = array_values($coefficients);
        $currentPoint = array_values($currentPoint);
        $lower = -INF;
        $upper = INF;
        $otherIndex = $targetIndex === 0 ? 1 : 0;

        foreach ($vertices as $vertex) {
            $vertexValues = isset($vertex['x'], $vertex['y'])
                ? [(float) $vertex['x'], (float) $vertex['y']]
                : array_values($vertex);

            $a = $currentPoint[$targetIndex] - (float) ($vertexValues[$targetIndex] ?? 0.0);
            $b = ((float) $coefficients[$otherIndex] * (float) ($vertexValues[$otherIndex] ?? 0.0))
                - ((float) $coefficients[$otherIndex] * $currentPoint[$otherIndex]);

            if (abs($a) <= self::EPSILON) {
                $isSatisfied = $optimizationType === 'max'
                    ? 0 >= $b - self::EPSILON
                    : 0 <= $b + self::EPSILON;

                if (! $isSatisfied) {
                    return null;
                }

                continue;
            }

            $limit = $b / $a;

            if ($optimizationType === 'max') {
                if ($a > 0) {
                    $lower = max($lower, $limit);
                } else {
                    $upper = min($upper, $limit);
                }
            } else {
                if ($a > 0) {
                    $upper = min($upper, $limit);
                } else {
                    $lower = max($lower, $limit);
                }
            }
        }

        return [
            'minimum' => is_infinite($lower) ? null : $lower,
            'maximum' => is_infinite($upper) ? null : $upper,
        ];
    }

    // Identifica uma base viavel com duas variaveis para a analise bidimensional.
    public function findTwoVariableBasis(
        array $constraints,
        array $solution,
        int $targetConstraintIndex
    ): ?array {
        $activeIndexes = [];

        foreach ($constraints as $index => $constraint) {
            $rhs = (float) $constraint['rhs_value'];
            $lhs = $this->calculateLhs($constraint, $solution);

            $slack = match ($constraint['operator']) {
                '<=' => $rhs - $lhs,
                '>=' => $lhs - $rhs,
                default => abs($lhs - $rhs),
            };

            if (abs($slack) <= self::EPSILON) {
                $activeIndexes[] = $index;
            }
        }

        if (! in_array($targetConstraintIndex, $activeIndexes, true)) {
            return null;
        }

        foreach ($activeIndexes as $firstIndex) {
            foreach ($activeIndexes as $secondIndex) {
                if ($firstIndex === $secondIndex) {
                    continue;
                }

                if (
                    $firstIndex !== $targetConstraintIndex
                    && $secondIndex !== $targetConstraintIndex
                ) {
                    continue;
                }

                $matrix = [
                    [
                        (float) (array_values($constraints[$firstIndex]['coefficients'] ?? [])[0] ?? 0.0),
                        (float) (array_values($constraints[$firstIndex]['coefficients'] ?? [])[1] ?? 0.0),
                    ],
                    [
                        (float) (array_values($constraints[$secondIndex]['coefficients'] ?? [])[0] ?? 0.0),
                        (float) (array_values($constraints[$secondIndex]['coefficients'] ?? [])[1] ?? 0.0),
                    ],
                ];

                if ($this->invertTwoByTwoMatrix($matrix) !== null) {
                    return [$firstIndex, $secondIndex];
                }
            }
        }

        return null;
    }

    // Inverte uma matriz 2x2 usada nos calculos de sensibilidade.
    public function invertTwoByTwoMatrix(array $matrix): ?array
    {
        $a = (float) $matrix[0][0];
        $b = (float) $matrix[0][1];
        $c = (float) $matrix[1][0];
        $d = (float) $matrix[1][1];

        $determinant = ($a * $d) - ($b * $c);

        if (abs($determinant) <= self::EPSILON) {
            return null;
        }

        return [
            [
                $d / $determinant,
                -$b / $determinant,
            ],
            [
                -$c / $determinant,
                $a / $determinant,
            ],
        ];
    }

    // Normaliza valores muito pequenos para zero e arredonda com precisao fixa.
    public function cleanValue(float $value): string
    {
        $roundedValue = $this->roundNumber($value);

        if (abs($roundedValue) < self::EPSILON) {
            return '0';
        }

        if (abs($roundedValue - round($roundedValue)) < self::EPSILON) {
            return (string) (int) round($roundedValue);
        }

        return rtrim(rtrim(number_format($roundedValue, 2, '.', ''), '0'), '.');
    }

    // Arredonda um valor para a quantidade fixa de casas usada na tela.
    public function roundNumber(float|int|string|null $value): float
    {
        if ($value === null || $value === '') {
            return 0.0;
        }

        $number = (float) $value;
        $rounded = round($number, self::DECIMAL_PLACES);

        if (abs($rounded) < self::EPSILON) {
            return 0.0;
        }

        return $rounded;
    }
}
