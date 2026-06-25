<?php

namespace App\Services\Project;

class LinearProgrammingCoreService
{
    private const EPSILON = 1e-9;

    public function solveSimplex(
        array $objectiveCoefficients,
        array $constraints,
        string $optimizationType,
        array $options = []
    ): array
    {
        $storeIterations = $options['store_iterations'] ?? true;
        $detectMultipleSolutions = $options['detect_multiple_solutions'] ?? true;
        $maxIterations = (int) ($options['max_iterations'] ?? 200);

        $problem = $this->buildProblem(
            $objectiveCoefficients,
            $constraints,
            $optimizationType
        );

        $phase1 = $this->solvePhase(
            $problem['tableau_rows'],
            $problem['basis'],
            $problem['phase1_objective'],
            $problem['eligible_phase1'],
            $problem['column_names'],
            $storeIterations,
            $maxIterations
        );

        $iterations = $phase1['iterations'];

        if (in_array($phase1['status'], ['iteration_limit', 'cycled'], true)) {
            return $this->buildFailureResult(
                $phase1['status'],
                $iterations,
                $phase1['tableau'],
                $problem['column_names'],
                $problem['decision_count'],
                []
            );
        }

        if ($phase1['status'] === 'unbounded') {
            return $this->buildFailureResult(
                'unbounded',
                $iterations,
                [],
                $problem['column_names'],
                $problem['decision_count'],
                []
            );
        }

        if (abs($phase1['objective_value']) > self::EPSILON) {
            return $this->buildFailureResult(
                'infeasible',
                $iterations,
                $phase1['tableau'],
                $problem['column_names'],
                $problem['decision_count'],
                ['phase1_objective' => $phase1['objective_value']]
            );
        }

        $phase2 = $this->solvePhase(
            $phase1['tableau_rows'],
            $phase1['basis'],
            $problem['phase2_objective'],
            $problem['eligible_phase2'],
            $problem['column_names'],
            $storeIterations,
            $maxIterations
        );

        $iterations = $this->mergeIterations(
            $iterations,
            $phase2['iterations'],
            count($iterations)
        );

        if (in_array($phase2['status'], ['iteration_limit', 'cycled'], true)) {
            return $this->buildFailureResult(
                $phase2['status'],
                $iterations,
                $phase2['tableau'],
                $problem['column_names'],
                $problem['decision_count'],
                []
            );
        }

        if ($phase2['status'] === 'unbounded') {
            return $this->buildFailureResult(
                'unbounded',
                $iterations,
                $phase2['tableau'],
                $problem['column_names'],
                $problem['decision_count'],
                []
            );
        }

        $solution = $this->extractDecisionSolution(
            $phase2['tableau_rows'],
            $phase2['basis'],
            $problem['column_names'],
            $problem['decision_count']
        );

        $objectiveValue = $phase2['objective_value'];
        if ($optimizationType === 'min') {
            $objectiveValue *= -1;
        }

        $reducedCosts = $this->extractReducedCosts(
            $phase2['tableau'],
            $problem['decision_count']
        );

        $alternativeSolutions = $detectMultipleSolutions
            ? $this->findAlternativeSolutions(
                $phase2['tableau_rows'],
                $phase2['basis'],
                $problem['phase2_objective'],
                $problem['eligible_phase2'],
                $problem['column_names'],
                $problem['decision_count']
            )
            : [];

        $flags = [];
        if ($phase1['degenerate'] || $phase2['degenerate']) {
            $flags[] = 'degenerate';
        }

        $status = 'optimal';
        if (!empty($alternativeSolutions)) {
            $status = 'multiple';
        } elseif (!empty($flags)) {
            $status = 'degenerate';
        }

        return [
            'status' => $status,
            'flags' => $flags,
            'iterations' => $storeIterations ? $iterations : [],
            'solution' => $solution,
            'objective_value' => $objectiveValue,
            'tableau_final' => $this->cleanTableau($phase2['tableau']),
            'has_multiple_solution' => !empty($alternativeSolutions),
            'alternative_solutions' => $alternativeSolutions,
            'reduced_costs' => $reducedCosts,
        ];
    }

    public function buildDualProblem(
        array $objectiveCoefficients,
        array $constraints,
        string $optimizationType
    ): array {
        $objectiveCoefficients = $this->normalizeVector($objectiveCoefficients);
        $constraints = $this->normalizeConstraints($constraints);

        $primalVariableCount = count($objectiveCoefficients);
        $dualObjectiveType = $optimizationType === 'max' ? 'min' : 'max';

        $dualVariableMap = [];
        $dualObjectiveCoefficients = [];
        $transformedVariables = [];

        foreach ($constraints as $index => $constraint) {
            $dualVariableMap[$index] = [
                'type' => $this->dualVariableType($constraint['operator']),
                'columns' => [],
            ];

            $rhs = (float) $constraint['rhs_value'];

            if ($dualVariableMap[$index]['type'] === 'positive') {
                $transformedVariables[] = [
                    'name' => 'y' . ($index + 1),
                    'constraint_index' => $index,
                    'sign' => 1.0,
                ];
                $dualVariableMap[$index]['columns'][] = count($transformedVariables) - 1;
                $dualObjectiveCoefficients[] = $rhs;
            } elseif ($dualVariableMap[$index]['type'] === 'negative') {
                $transformedVariables[] = [
                    'name' => 'y' . ($index + 1) . '_neg',
                    'constraint_index' => $index,
                    'sign' => -1.0,
                ];
                $dualVariableMap[$index]['columns'][] = count($transformedVariables) - 1;
                $dualObjectiveCoefficients[] = -$rhs;
            } else {
                $transformedVariables[] = [
                    'name' => 'y' . ($index + 1) . '_pos',
                    'constraint_index' => $index,
                    'sign' => 1.0,
                ];
                $dualVariableMap[$index]['columns'][] = count($transformedVariables) - 1;
                $dualObjectiveCoefficients[] = $rhs;

                $transformedVariables[] = [
                    'name' => 'y' . ($index + 1) . '_neg',
                    'constraint_index' => $index,
                    'sign' => -1.0,
                ];
                $dualVariableMap[$index]['columns'][] = count($transformedVariables) - 1;
                $dualObjectiveCoefficients[] = -$rhs;
            }
        }

        $dualConstraints = [];

        for ($variableIndex = 0; $variableIndex < $primalVariableCount; $variableIndex++) {
            $dualRow = [];

            foreach ($constraints as $constraintIndex => $constraint) {
                $coefficient = (float) $constraint['coefficients'][$variableIndex];
                $dualType = $dualVariableMap[$constraintIndex]['type'];

                if ($dualType === 'positive') {
                    $dualRow[] = $coefficient;
                } elseif ($dualType === 'negative') {
                    $dualRow[] = -$coefficient;
                } else {
                    $dualRow[] = $coefficient;
                    $dualRow[] = -$coefficient;
                }
            }

            $dualConstraints[] = [
                'coefficients' => $dualRow,
                'operator' => $optimizationType === 'max' ? '>=' : '<=',
                'rhs_value' => $objectiveCoefficients[$variableIndex],
            ];
        }

        return [
            'optimization_type' => $dualObjectiveType,
            'objective_function' => [
                'coefficients' => $dualObjectiveCoefficients,
            ],
            'constraints' => $dualConstraints,
            'variable_map' => $transformedVariables,
            'dual_variable_map' => $dualVariableMap,
        ];
    }

    private function buildProblem(
        array $objectiveCoefficients,
        array $constraints,
        string $optimizationType
    ): array {
        $objectiveCoefficients = $this->normalizeVector($objectiveCoefficients);
        $constraints = $this->normalizeConstraints($constraints);

        if ($optimizationType === 'min') {
            $objectiveCoefficients = array_map(
                fn (float $value) => -$value,
                $objectiveCoefficients
            );
        }

        $decisionCount = count($objectiveCoefficients);
        $metadata = [];
        $columnNames = [];
        $artificialColumns = [];

        for ($index = 0; $index < $decisionCount; $index++) {
            $columnNames[] = 'x' . ($index + 1);
        }

        $slackCount = 0;
        $surplusCount = 0;
        $artificialCount = 0;

        foreach ($constraints as $index => $constraint) {
            $operator = $constraint['operator'];
            $metadata[$index] = [
                'operator' => $operator,
                'slack_index' => null,
                'surplus_index' => null,
                'artificial_index' => null,
            ];

            if ($operator === '<=') {
                $metadata[$index]['slack_index'] = count($columnNames);
                $columnNames[] = 's' . (++$slackCount);
            } elseif ($operator === '>=') {
                $metadata[$index]['surplus_index'] = count($columnNames);
                $columnNames[] = 'e' . (++$surplusCount);

                $metadata[$index]['artificial_index'] = count($columnNames);
                $columnNames[] = 'a' . (++$artificialCount);
                $artificialColumns[] = $metadata[$index]['artificial_index'];
            } else {
                $metadata[$index]['artificial_index'] = count($columnNames);
                $columnNames[] = 'a' . (++$artificialCount);
                $artificialColumns[] = $metadata[$index]['artificial_index'];
            }
        }

        $columnCount = count($columnNames);
        $constraintRows = [];
        $basis = [];

        foreach ($constraints as $index => $constraint) {
            $row = array_fill(0, $columnCount + 1, 0.0);

            foreach ($constraint['coefficients'] as $columnIndex => $value) {
                $row[$columnIndex] = (float) $value;
            }

            $meta = $metadata[$index];

            if ($meta['slack_index'] !== null) {
                $row[$meta['slack_index']] = 1.0;
                $basis[$index] = $meta['slack_index'];
            }

            if ($meta['surplus_index'] !== null) {
                $row[$meta['surplus_index']] = -1.0;
            }

            if ($meta['artificial_index'] !== null) {
                $row[$meta['artificial_index']] = 1.0;
                $basis[$index] = $meta['artificial_index'];
            }

            $row[$columnCount] = (float) $constraint['rhs_value'];
            $constraintRows[] = $row;
        }

        $phase1Objective = array_fill(0, $columnCount, 0.0);
        foreach ($artificialColumns as $columnIndex) {
            $phase1Objective[$columnIndex] = -1.0;
        }

        $phase2Objective = array_fill(0, $columnCount, 0.0);
        for ($i = 0; $i < $decisionCount; $i++) {
            $phase2Objective[$i] = $objectiveCoefficients[$i];
        }

        return [
            'decision_count' => $decisionCount,
            'column_names' => $columnNames,
            'constraint_rows' => $constraintRows,
            'tableau_rows' => $constraintRows,
            'basis' => $basis,
            'phase1_objective' => $phase1Objective,
            'phase2_objective' => $phase2Objective,
            'eligible_phase1' => array_keys($columnNames),
            'eligible_phase2' => $this->buildEligiblePhase2($columnNames),
        ];
    }

    private function buildEligiblePhase2(array $columnNames): array
    {
        $eligible = [];

        foreach ($columnNames as $index => $name) {
            if (str_starts_with($name, 'a')) {
                continue;
            }

            $eligible[] = $index;
        }

        return $eligible;
    }

    private function normalizeConstraints(array $constraints): array
    {
        $normalized = [];

        foreach ($constraints as $constraint) {
            $coefficients = $this->normalizeVector($constraint['coefficients']);
            $rhsValue = (float) $constraint['rhs_value'];
            $operator = $constraint['operator'];

            if ($rhsValue < 0) {
                $coefficients = array_map(
                    fn (float $value) => -$value,
                    $coefficients
                );
                $rhsValue *= -1;
                $operator = $this->flipOperator($operator);
            }

            $normalized[] = [
                'coefficients' => $coefficients,
                'operator' => $operator,
                'rhs_value' => $rhsValue,
            ];
        }

        return $normalized;
    }

    private function flipOperator(string $operator): string
    {
        return match ($operator) {
            '<=' => '>=',
            '>=' => '<=',
            default => '=',
        };
    }

    private function dualVariableType(string $operator): string
    {
        return match ($operator) {
            '<=' => 'positive',
            '>=' => 'negative',
            default => 'free',
        };
    }

    private function solvePhase(
        array $constraintRows,
        array $basis,
        array $objectiveCoefficients,
        array $eligibleColumns,
        array $columnNames,
        bool $storeIterations,
        int $maxIterations
    ): array {
        $tableau = $constraintRows;
        $tableau[] = $this->buildObjectiveRow(
            $constraintRows,
            $basis,
            $objectiveCoefficients
        );

        $iterations = [];
        $degenerate = false;
        $objectiveRowIndex = count($tableau) - 1;
        $rhsIndex = count($tableau[0]) - 1;
        $seenBases = [];
        $loopCounter = 0;

        while (true) {
            if (++$loopCounter > $maxIterations) {
                return [
                    'status' => 'iteration_limit',
                    'iterations' => $iterations,
                    'tableau_rows' => array_slice($tableau, 0, -1),
                    'tableau' => $this->cleanTableau($tableau),
                    'basis' => $basis,
                    'objective_value' => $tableau[$objectiveRowIndex][$rhsIndex],
                    'degenerate' => $degenerate,
                ];
            }

            $basisKey = implode(',', $basis);
            if (isset($seenBases[$basisKey])) {
                return [
                    'status' => 'cycled',
                    'iterations' => $iterations,
                    'tableau_rows' => array_slice($tableau, 0, -1),
                    'tableau' => $this->cleanTableau($tableau),
                    'basis' => $basis,
                    'objective_value' => $tableau[$objectiveRowIndex][$rhsIndex],
                    'degenerate' => true,
                ];
            }
            $seenBases[$basisKey] = true;

            $enteringColumn = $this->findEnteringColumn(
                $tableau[$objectiveRowIndex],
                $eligibleColumns
            );

            if ($enteringColumn === null) {
                break;
            }

            $leavingRow = $this->findLeavingRow($tableau, $enteringColumn, $rhsIndex);

            if ($leavingRow === null) {
                return [
                    'status' => 'unbounded',
                    'iterations' => $iterations,
                    'tableau_rows' => array_slice($tableau, 0, -1),
                    'tableau' => $this->cleanTableau($tableau),
                    'basis' => $basis,
                    'objective_value' => $tableau[$objectiveRowIndex][$rhsIndex],
                    'degenerate' => $degenerate,
                ];
            }

            $pivotValue = $tableau[$leavingRow][$enteringColumn];
            $ratio = $tableau[$leavingRow][$rhsIndex] / $pivotValue;
            $leavingVariableIndex = $basis[$leavingRow];
            $leavingVariableName = $columnNames[$leavingVariableIndex] ?? null;

            if (abs($ratio) < self::EPSILON) {
                $degenerate = true;
            }

            $this->pivotTableau($tableau, $leavingRow, $enteringColumn);
            $basis[$leavingRow] = $enteringColumn;

            if ($storeIterations) {
                $iterations[] = [
                    'iteration' => count($iterations) + 1,
                    'entering_variable' => $columnNames[$enteringColumn] ?? ('x' . ($enteringColumn + 1)),
                    'leaving_variable' => $leavingVariableName ?? ('x' . ($leavingVariableIndex + 1)),
                    'pivot' => $this->cleanValue($pivotValue),
                    'tableau' => $this->cleanTableau($tableau),
                ];
            }
        }

        return [
            'status' => 'optimal',
            'iterations' => $iterations,
            'tableau_rows' => array_slice($tableau, 0, -1),
            'tableau' => $this->cleanTableau($tableau),
            'basis' => $basis,
            'objective_value' => $tableau[$objectiveRowIndex][$rhsIndex],
            'degenerate' => $degenerate,
        ];
    }

    private function buildObjectiveRow(
        array $constraintRows,
        array $basis,
        array $objectiveCoefficients
    ): array {
        $columnCount = count($objectiveCoefficients);
        $objectiveRow = array_fill(0, $columnCount + 1, 0.0);

        for ($columnIndex = 0; $columnIndex < $columnCount; $columnIndex++) {
            $objectiveRow[$columnIndex] = -$objectiveCoefficients[$columnIndex];
        }

        foreach ($constraintRows as $rowIndex => $row) {
            $basicColumn = $basis[$rowIndex] ?? null;
            if ($basicColumn === null) {
                continue;
            }

            $coefficient = $objectiveCoefficients[$basicColumn] ?? 0.0;
            if (abs($coefficient) < self::EPSILON) {
                continue;
            }

            for ($columnIndex = 0; $columnIndex <= $columnCount; $columnIndex++) {
                $objectiveRow[$columnIndex] += $coefficient * $row[$columnIndex];
            }
        }

        return $this->cleanRow($objectiveRow);
    }

    private function findEnteringColumn(array $objectiveRow, array $eligibleColumns): ?int
    {
        $enteringColumn = null;
        $mostNegative = -self::EPSILON;

        foreach ($eligibleColumns as $columnIndex) {
            if ($columnIndex >= count($objectiveRow) - 1) {
                continue;
            }

            $value = $objectiveRow[$columnIndex];
            if ($value < $mostNegative) {
                $mostNegative = $value;
                $enteringColumn = $columnIndex;
            }
        }

        return $enteringColumn;
    }

    private function findLeavingRow(array $tableau, int $enteringColumn, int $rhsIndex): ?int
    {
        $leavingRow = null;
        $minimumRatio = null;

        for ($rowIndex = 0; $rowIndex < count($tableau) - 1; $rowIndex++) {
            $pivotValue = $tableau[$rowIndex][$enteringColumn];
            if ($pivotValue <= self::EPSILON) {
                continue;
            }

            $ratio = $tableau[$rowIndex][$rhsIndex] / $pivotValue;

            if ($ratio < -self::EPSILON) {
                continue;
            }

            if ($minimumRatio === null || $ratio < $minimumRatio - self::EPSILON) {
                $minimumRatio = $ratio;
                $leavingRow = $rowIndex;
            }
        }

        return $leavingRow;
    }

    private function pivotTableau(array &$tableau, int $pivotRow, int $pivotColumn): void
    {
        $rowCount = count($tableau);
        $columnCount = count($tableau[0]);
        $pivotValue = $tableau[$pivotRow][$pivotColumn];

        for ($columnIndex = 0; $columnIndex < $columnCount; $columnIndex++) {
            $tableau[$pivotRow][$columnIndex] /= $pivotValue;
        }

        for ($rowIndex = 0; $rowIndex < $rowCount; $rowIndex++) {
            if ($rowIndex === $pivotRow) {
                continue;
            }

            $factor = $tableau[$rowIndex][$pivotColumn];
            if (abs($factor) < self::EPSILON) {
                continue;
            }

            for ($columnIndex = 0; $columnIndex < $columnCount; $columnIndex++) {
                $tableau[$rowIndex][$columnIndex] -= $factor * $tableau[$pivotRow][$columnIndex];
            }
        }

        $tableau = $this->cleanTableau($tableau);
    }

    private function extractDecisionSolution(
        array $constraintRows,
        array $basis,
        array $columnNames,
        int $decisionCount
    ): array {
        $solution = array_fill(0, $decisionCount, 0.0);
        $rhsIndex = count($constraintRows[0]) - 1;

        foreach ($basis as $rowIndex => $columnIndex) {
            if ($columnIndex < $decisionCount) {
                $solution[$columnIndex] = $constraintRows[$rowIndex][$rhsIndex];
            }
        }

        $namedSolution = [];
        for ($index = 0; $index < $decisionCount; $index++) {
            $namedSolution[$columnNames[$index] ?? ('x' . ($index + 1))] = $this->cleanValue($solution[$index]);
        }

        return $namedSolution;
    }

    private function extractReducedCosts(array $tableau, int $decisionCount): array
    {
        $objectiveRow = end($tableau);
        $reducedCosts = [];

        for ($index = 0; $index < $decisionCount; $index++) {
            $reducedCosts['x' . ($index + 1)] = $this->cleanValue(-1 * $objectiveRow[$index]);
        }

        return $reducedCosts;
    }

    private function findAlternativeSolutions(
        array $constraintRows,
        array $basis,
        array $objectiveCoefficients,
        array $eligibleColumns,
        array $columnNames,
        int $decisionCount
    ): array {
        $tableau = $constraintRows;
        $tableau[] = $this->buildObjectiveRow(
            $constraintRows,
            $basis,
            $objectiveCoefficients
        );

        $objectiveRow = end($tableau);
        $rhsIndex = count($tableau[0]) - 1;
        $alternatives = [];

        foreach ($eligibleColumns as $columnIndex) {
            if ($columnIndex >= $decisionCount) {
                continue;
            }

            if (abs($objectiveRow[$columnIndex]) > self::EPSILON) {
                continue;
            }

            $candidate = $this->tryAlternativePivot(
                $tableau,
                $basis,
                $columnIndex,
                $columnNames,
                $decisionCount,
                $rhsIndex
            );

            if ($candidate !== null) {
                $alternatives[] = $candidate;
            }
        }

        return array_values(array_unique($alternatives, SORT_REGULAR));
    }

    private function tryAlternativePivot(
        array $tableau,
        array $basis,
        int $enteringColumn,
        array $columnNames,
        int $decisionCount,
        int $rhsIndex
    ): ?array {
        $leavingRow = $this->findLeavingRow($tableau, $enteringColumn, $rhsIndex);

        if ($leavingRow === null) {
            return null;
        }

        $tableauCopy = $tableau;
        $basisCopy = $basis;
        $this->pivotTableau($tableauCopy, $leavingRow, $enteringColumn);
        $basisCopy[$leavingRow] = $enteringColumn;

        $solution = $this->extractDecisionSolution(
            array_slice($tableauCopy, 0, -1),
            $basisCopy,
            $columnNames,
            $decisionCount
        );

        return $solution;
    }

    private function buildFailureResult(
        string $status,
        array $iterations,
        array $tableau,
        array $columnNames,
        int $decisionCount,
        array $extra
    ): array {
        return array_merge([
            'status' => $status,
            'flags' => [],
            'iterations' => $iterations,
            'solution' => [],
            'objective_value' => 0.0,
            'tableau_final' => $this->cleanTableau($tableau),
            'has_multiple_solution' => false,
            'alternative_solutions' => [],
            'reduced_costs' => [],
        ], $extra);
    }

    private function mergeIterations(array $first, array $second, int $offset): array
    {
        foreach ($second as $index => $iteration) {
            $iteration['iteration'] = $offset + $index + 1;
            $first[] = $iteration;
        }

        return $first;
    }

    private function normalizeVector(array $vector): array
    {
        return array_map(
            fn ($value) => (float) $value,
            $vector
        );
    }

    private function cleanTableau(array $tableau): array
    {
        return array_map(
            fn (array $row) => $this->cleanRow($row),
            $tableau
        );
    }

    private function cleanRow(array $row): array
    {
        return array_map(
            fn ($value) => $this->cleanValue((float) $value),
            $row
        );
    }

    private function cleanValue(float $value): float
    {
        if (abs($value) < self::EPSILON) {
            return 0.0;
        }

        return round($value, 6);
    }
}
