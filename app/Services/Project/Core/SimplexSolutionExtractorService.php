<?php

namespace App\Services\Project\Core;

class SimplexSolutionExtractorService
{

    private const EPSILON = 1e-9;

    // Fun??o __construct respons?vel por executar esta etapa do service.
    public function __construct(
        protected SimplexEngineService $simplexEngineService,
        protected SimplexResultFormatterService $simplexResultFormatterService,
    ) {}

    // Extrai as variaveis de decisao a partir da base final do tableau.
    public function extractDecisionSolution(
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
            $namedSolution[$columnNames[$index] ?? ('x' . ($index + 1))] = $this->simplexResultFormatterService->cleanValue($solution[$index]);
        }

        return $namedSolution;
    }

    // Calcula os custos reduzidos a partir da linha objetivo final.
    public function extractReducedCosts(array $tableau, int $decisionCount): array
    {
        $objectiveRow = end($tableau);
        $reducedCosts = [];

        for ($index = 0; $index < $decisionCount; $index++) {
            $reducedCosts['x' . ($index + 1)] = $this->simplexResultFormatterService->cleanValue(-1 * $objectiveRow[$index]);
        }

        return $reducedCosts;
    }

    // Procura solucoes alternativas quando existe otimo multiplo.
    public function findAlternativeSolutions(
        array $constraintRows,
        array $basis,
        array $objectiveCoefficients,
        array $eligibleColumns,
        array $columnNames,
        int $decisionCount
    ): array {
        $tableau = $constraintRows;
        $tableau[] = $this->simplexEngineService->buildObjectiveRow(
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

    // Testa um pivô alternativo para verificar outra solucao otima.
    private function tryAlternativePivot(
        array $tableau,
        array $basis,
        int $enteringColumn,
        array $columnNames,
        int $decisionCount,
        int $rhsIndex
    ): ?array {
        $leavingRow = $this->simplexEngineService->findLeavingRow($tableau, $enteringColumn, $rhsIndex);

        if ($leavingRow === null) {
            return null;
        }

        $tableauCopy = $tableau;
        $basisCopy = $basis;
        $this->simplexEngineService->pivotTableau($tableauCopy, $leavingRow, $enteringColumn);
        $basisCopy[$leavingRow] = $enteringColumn;

        $solution = $this->extractDecisionSolution(
            array_slice($tableauCopy, 0, -1),
            $basisCopy,
            $columnNames,
            $decisionCount
        );

        return $solution;
    }
}
