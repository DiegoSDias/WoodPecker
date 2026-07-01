<?php

namespace App\Services\Project\SensitivityAnalysis;

use App\Services\Project\Support\ProjectAnalysisSupportService;

class BuildRanges
{
    private const EPSILON = 1e-5;

    // Função __construct responsável por ligar o gerador de intervalos aos helpers matemáticos e de grafo.
    public function __construct(
        protected SensitivityMathService $sensitivityMathService,
        protected ProjectAnalysisSupportService $analysisSupport,
    ) {}

    // Monta os intervalos de variacao dos coeficientes da funcao objetivo.
    public function buildObjectiveRanges(
        array $coefficients,
        array $reducedCosts,
        array $constraints,
        array $solution,
        string $optimizationType
    ): array {
        $coefficients = array_values($coefficients);
        $solution = array_values($solution);

        $twoVariableRanges = $this->buildTwoVariableObjectiveRanges(
            $coefficients,
            $constraints,
            $solution,
            $optimizationType
        );

        if (! empty($twoVariableRanges)) {
            return $twoVariableRanges;
        }

        $ranges = [];

        foreach ($coefficients as $index => $value) {
            $name = 'x' . ($index + 1);
            $reducedCost = (float) ($reducedCosts[$name] ?? 0.0);

            $ranges[$name] = [
                'variable' => strtoupper($name),
                'current_coefficient' => $this->sensitivityMathService->roundNumber((float) $value),
                'reduced_cost' => $this->sensitivityMathService->roundNumber($reducedCost),
                'allowable_increase' => abs($reducedCost) > self::EPSILON
                    ? $this->sensitivityMathService->roundNumber(abs($reducedCost))
                    : null,
                'allowable_decrease' => abs($reducedCost) > self::EPSILON
                    ? $this->sensitivityMathService->roundNumber(abs($reducedCost))
                    : null,
            ];
        }

        return $ranges;
    }

    // Calcula os intervalos da funcao objetivo para problemas com duas variaveis.
    private function buildTwoVariableObjectiveRanges(
        array $coefficients,
        array $constraints,
        array $solution,
        string $optimizationType
    ): array {
        $solutionValues = isset($solution['x1'], $solution['x2'])
            ? [(float) $solution['x1'], (float) $solution['x2']]
            : array_values($solution);

        if (
            count($coefficients) !== 2
            || count($solutionValues) < 2
        ) {
            return [];
        }

        $points = $this->analysisSupport->buildIntersections($constraints);
        $vertices = $this->analysisSupport->filterFeasibleVertices($points, $constraints);

        if (empty($vertices)) {
            return [];
        }

        $currentPoint = [
            (float) $solutionValues[0],
            (float) $solutionValues[1],
        ];

        $rows = [];

        foreach ($coefficients as $targetIndex => $coefficient) {
            $range = $this->sensitivityMathService->calculateObjectiveCoefficientRange(
                $coefficients,
                $vertices,
                $currentPoint,
                $targetIndex,
                $optimizationType
            );

            if ($range === null) {
                return [];
            }

            $currentCoefficient = (float) $coefficient;
            $minimum = $range['minimum'];
            $maximum = $range['maximum'];

            $rows['x' . ($targetIndex + 1)] = [
                'variable' => 'X' . ($targetIndex + 1),
                'current_coefficient' => $this->sensitivityMathService->roundNumber($currentCoefficient),
                'reduced_cost' => 0.0,
                'allowable_increase' => $maximum === null
                    ? null
                    : $this->roundNullableNumber($maximum - $currentCoefficient),
                'allowable_decrease' => $minimum === null
                    ? null
                    : $this->roundNullableNumber($currentCoefficient - $minimum),
                'minimum' => $this->roundNullableNumber($minimum),
                'maximum' => $this->roundNullableNumber($maximum),
            ];
        }

        return $rows;
    }

    // Monta os intervalos de variacao do lado direito de cada restricao.
    public function buildRhsRangeRows(
        array $constraints,
        array $solution,
        array $shadowPrices
    ): array {
        $ranges = [];

        $numberOfVariables = $this->countDecisionVariablesFromConstraints($constraints);

        foreach ($constraints as $index => $constraint) {
            $rhs = (float) $constraint['rhs_value'];
            $lhs = $this->sensitivityMathService->calculateLhs($constraint, $solution);

            $slack = match ($constraint['operator']) {
                '<=' => $rhs - $lhs,
                '>=' => $lhs - $rhs,
                default => abs($lhs - $rhs),
            };

            $isActive = abs($slack) <= self::EPSILON;

            if ($isActive) {
                $range = $this->buildActiveConstraintRhsRange(
                    $constraints,
                    $solution,
                    $index,
                    $numberOfVariables
                );
            } else {
                $range = $this->buildInactiveConstraintRhsRange(
                    $constraint,
                    $rhs,
                    $lhs
                );
            }

            $minimum = $range['minimum'];
            $maximum = $range['maximum'];

            $ranges['c' . ($index + 1)] = [
                'restriction' => 'R' . ($index + 1),
                'current_rhs' => $this->sensitivityMathService->roundNumber($rhs),
                'slack' => $this->sensitivityMathService->roundNumber($slack),
                'shadow_price' => $this->sensitivityMathService->roundNumber(
                    (float) ($shadowPrices['y' . ($index + 1)] ?? 0.0)
                ),
                'allowable_increase' => $maximum === null
                    ? null
                    : $this->sensitivityMathService->roundNumber($maximum - $rhs),
                'allowable_decrease' => $minimum === null
                    ? null
                    : $this->sensitivityMathService->roundNumber($rhs - $minimum),
                'minimum' => $minimum === null
                    ? null
                    : $this->sensitivityMathService->roundNumber($minimum),
                'maximum' => $maximum === null
                    ? null
                    : $this->sensitivityMathService->roundNumber($maximum),
                'minimum_label' => $minimum === null
                    ? 'Sem limite inferior'
                    : $this->sensitivityMathService->cleanValue((float) $minimum),
                'maximum_label' => $maximum === null
                    ? 'Sem limite superior'
                    : $this->sensitivityMathService->cleanValue((float) $maximum),
            ];
        }

        return $ranges;
    }

    // Calcula o intervalo de RHS para restricoes que nao estao ativas.
    private function buildInactiveConstraintRhsRange(
        array $constraint,
        float $rhs,
        float $lhs
    ): array {
        return match ($constraint['operator']) {
            '<=' => [
                'minimum' => $lhs,
                'maximum' => null,
            ],
            '>=' => [
                'minimum' => null,
                'maximum' => $lhs,
            ],
            default => [
                'minimum' => $rhs,
                'maximum' => $rhs,
            ],
        };
    }

    // Calcula o intervalo de RHS para restricoes ativas.
    private function buildActiveConstraintRhsRange(
        array $constraints,
        array $solution,
        int $targetConstraintIndex,
        int $numberOfVariables
    ): array {
        $currentRhs = (float) $constraints[$targetConstraintIndex]['rhs_value'];

        if ($numberOfVariables !== 2) {
            return [
                'minimum' => $currentRhs,
                'maximum' => $currentRhs,
            ];
        }

        $basisIndexes = $this->sensitivityMathService->findTwoVariableBasis(
            $constraints,
            $solution,
            $targetConstraintIndex
        );

        if ($basisIndexes === null) {
            return [
                'minimum' => $currentRhs,
                'maximum' => $currentRhs,
            ];
        }

        [$firstBasisIndex, $secondBasisIndex] = $basisIndexes;

        $firstBasisCoefficients = array_values($constraints[$firstBasisIndex]['coefficients'] ?? []);
        $secondBasisCoefficients = array_values($constraints[$secondBasisIndex]['coefficients'] ?? []);

        $basisMatrix = [
            [
                (float) ($firstBasisCoefficients[0] ?? 0.0),
                (float) ($firstBasisCoefficients[1] ?? 0.0),
            ],
            [
                (float) ($secondBasisCoefficients[0] ?? 0.0),
                (float) ($secondBasisCoefficients[1] ?? 0.0),
            ],
        ];

        $inverse = $this->sensitivityMathService->invertTwoByTwoMatrix($basisMatrix);

        if ($inverse === null) {
            return [
                'minimum' => $currentRhs,
                'maximum' => $currentRhs,
            ];
        }

        if ($targetConstraintIndex === $firstBasisIndex) {
            $deltaVector = [
                $inverse[0][0],
                $inverse[1][0],
            ];
        } elseif ($targetConstraintIndex === $secondBasisIndex) {
            $deltaVector = [
                $inverse[0][1],
                $inverse[1][1],
            ];
        } else {
            return [
                'minimum' => $currentRhs,
                'maximum' => $currentRhs,
            ];
        }

        $currentX = [
            (float) ($solution['x1'] ?? 0.0),
            (float) ($solution['x2'] ?? 0.0),
        ];

        $deltaMin = -1 * INF;
        $deltaMax = INF;

        foreach ($constraints as $constraintIndex => $constraint) {
            if ($constraintIndex === $targetConstraintIndex) {
                continue;
            }

            $constraintCoefficients = array_values($constraint['coefficients'] ?? []);
            $a1 = (float) ($constraintCoefficients[0] ?? 0.0);
            $a2 = (float) ($constraintCoefficients[1] ?? 0.0);
            $constraintRhs = (float) $constraint['rhs_value'];

            $currentValue = $a1 * $currentX[0] + $a2 * $currentX[1];
            $sensitivity = $a1 * $deltaVector[0] + $a2 * $deltaVector[1];

            if (abs($sensitivity) <= self::EPSILON) {
                continue;
            }

            $limit = ($constraintRhs - $currentValue) / $sensitivity;

            if ($constraint['operator'] === '<=') {
                if ($sensitivity > 0) {
                    $deltaMax = min($deltaMax, $limit);
                } else {
                    $deltaMin = max($deltaMin, $limit);
                }
            }

            if ($constraint['operator'] === '>=') {
                if ($sensitivity > 0) {
                    $deltaMin = max($deltaMin, $limit);
                } else {
                    $deltaMax = min($deltaMax, $limit);
                }
            }

            if ($constraint['operator'] === '=') {
                $deltaMin = max($deltaMin, $limit);
                $deltaMax = min($deltaMax, $limit);
            }
        }

        foreach ([0, 1] as $variableIndex) {
            $sensitivity = $deltaVector[$variableIndex];

            if (abs($sensitivity) <= self::EPSILON) {
                continue;
            }

            $limit = -$currentX[$variableIndex] / $sensitivity;

            if ($sensitivity > 0) {
                $deltaMin = max($deltaMin, $limit);
            } else {
                $deltaMax = min($deltaMax, $limit);
            }
        }

        return [
            'minimum' => is_infinite($deltaMin) ? null : $currentRhs + $deltaMin,
            'maximum' => is_infinite($deltaMax) ? null : $currentRhs + $deltaMax,
        ];
    }

    // Converte null para null e arredonda qualquer outro valor opcional.
    private function roundNullableNumber(float|int|string|null $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return $this->sensitivityMathService->roundNumber($value);
    }

    // Conta quantas variaveis de decisao existem nas restricoes.
    private function countDecisionVariablesFromConstraints(array $constraints): int
    {
        $max = 0;

        foreach ($constraints as $constraint) {
            $max = max($max, count($constraint['coefficients'] ?? []));
        }

        return $max;
    }
}
