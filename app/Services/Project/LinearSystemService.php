<?php

namespace App\Services\Project;


class LinearSystemService
{
    private const EPSILON = 1e-10;

    public function solve(array $data): array
    {
        $matrixA = $data['matrix_a'];
        $vectorB = $data['vector_b'];

        $augmentedMatrix = $this->buildAugmentedMatrix(
            $matrixA,
            $vectorB
        );

        $reducedMatrix = $this->gaussJordan($augmentedMatrix);

        return $this->extractSolution($reducedMatrix);
    }

    private function buildAugmentedMatrix(
        array $matrixA,
        array $vectorB
    ): array {
        $augmented = [];

        foreach ($matrixA as $index => $row) {
            $augmented[] = [
                ...$row,
                $vectorB[$index]
            ];
        }

        return $augmented;
    }

    private function gaussJordan(array $matrix): array
    {
        $rows = count($matrix);
        $cols = count($matrix[0]);

        $pivotRow = 0;

        for ($pivotCol = 0; $pivotCol < $rows; $pivotCol++) {

            $maxRow = $pivotRow;

            for ($r = $pivotRow + 1; $r < $rows; $r++) {
                if (
                    abs($matrix[$r][$pivotCol]) >
                    abs($matrix[$maxRow][$pivotCol])
                ) {
                    $maxRow = $r;
                }
            }

            if (
                abs($matrix[$maxRow][$pivotCol]) <
                self::EPSILON
            ) {
                continue;
            }

            $this->swapRows(
                $matrix,
                $pivotRow,
                $maxRow
            );

            $pivot = $matrix[$pivotRow][$pivotCol];

            for ($c = 0; $c < $cols; $c++) {
                $matrix[$pivotRow][$c] /= $pivot;
            }

            for ($r = 0; $r < $rows; $r++) {

                if ($r === $pivotRow) {
                    continue;
                }

                $factor = $matrix[$r][$pivotCol];

                for ($c = 0; $c < $cols; $c++) {
                    $matrix[$r][$c] -=
                        $factor * $matrix[$pivotRow][$c];
                }
            }

            $pivotRow++;
        }

        return $matrix;
    }

    private function swapRows(
        array &$matrix,
        int $rowA,
        int $rowB
    ): void {
        if ($rowA === $rowB) {
            return;
        }

        [$matrix[$rowA], $matrix[$rowB]] = [
            $matrix[$rowB],
            $matrix[$rowA]
        ];
    }

    private function extractSolution(array $matrix): array
    {
        if ($this->hasNoSolution($matrix)) {
            return [
                'type' => 'inconsistent',
                'message' => 'O sistema não possui solução.'
            ];
        }

        if ($this->hasInfiniteSolutions($matrix)) {
            return [
                'type' => 'infinite',
                'message' => 'O sistema possui infinitas soluções.'
            ];
        }

        return [
            'type' => 'unique',
            'solution' => $this->getUniqueSolution($matrix),
            'reduced_matrix' => $matrix,
        ];
    }

    private function hasNoSolution(array $matrix): bool
    {
        foreach ($matrix as $row) {

            $coefficients = array_slice(
                $row,
                0,
                -1
            );

            $allZero = collect($coefficients)
                ->every(
                    fn ($value) =>
                    abs($value) < self::EPSILON
                );

            if (
                $allZero &&
                abs(end($row)) > self::EPSILON
            ) {
                return true;
            }
        }

        return false;
    }

    private function hasInfiniteSolutions(array $matrix): bool
    {
        $variables = count($matrix[0]) - 1;

        $rank = 0;

        foreach ($matrix as $row) {

            $hasPivot = false;

            foreach (
                array_slice($row, 0, -1)
                as $value
            ) {
                if (
                    abs($value) >
                    self::EPSILON
                ) {
                    $hasPivot = true;
                    break;
                }
            }

            if ($hasPivot) {
                $rank++;
            }
        }

        return $rank < $variables;
    }

    private function getUniqueSolution(array $matrix): array
    {
        $solution = [];

        foreach ($matrix as $index => $row) {
            $solution["x" . ($index + 1)] =
                round(end($row), 6);
        }

        return $solution;
    }
}