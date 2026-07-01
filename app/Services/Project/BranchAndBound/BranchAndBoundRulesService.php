<?php

namespace App\Services\Project\BranchAndBound;

use App\Models\Project;

class BranchAndBoundRulesService
{
    private const EPSILON = 1e-6;

    // Verifica se uma solucao relaxada ja pode ser tratada como inteira.
    public function isIntegerSolution(array $solution): bool
    {
        foreach ($solution as $value) {
            if (abs($value - round($value)) > self::EPSILON) {
                return false;
            }
        }

        return true;
    }

    // Localiza a variavel fracionaria mais relevante para criar o proximo ramo.
    public function findFractionalVariable(array $solution): ?array
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

    // Atualiza a melhor solucao inteira encontrada durante a exploracao da arvore.
    public function updateBestSolution(?array &$bestSolution, array $record, Project $project): void
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

    // Decide se o limite atual ja nao consegue superar a melhor solucao conhecida.
    public function cannotBeatIncumbent(
        Project $project,
        ?array $bestSolution,
        array $relaxation
    ): bool {
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
}
