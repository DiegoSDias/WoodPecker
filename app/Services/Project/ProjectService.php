<?php

namespace App\Services\Project;

use App\Models\Project;
use App\Models\Solution;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ProjectService
{
    public function create(array $data): Project
    {
        return DB::transaction(function () use ($data) {
            $project = Project::create([
                'user_id' => $this->resolveUserId(),
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'num_variables' => (int) $data['num_variables'],
                'num_constraints' => (int) $data['num_constraints'],
                'optimization_type' => $data['optimization_type'],
            ]);

            $project->objectiveFunction()->create([
                'coefficients' => $this->normalizeCoefficients(
                    $data['objective_function']['coefficients']
                ),
            ]);

            foreach ($data['constraints'] as $constraint) {
                $project->constraints()->create([
                    'coefficients' => $this->normalizeCoefficients(
                        $constraint['coefficients']
                    ),
                    'operator' => $constraint['operator'],
                    'rhs_value' => (float) $constraint['rhs_value'],
                ]);
            }

            return $project->load([
                'objectiveFunction',
                'constraints',
                'solutions',
            ]);
        });
    }

    public function load(Project $project): Project
    {
        return $project->load([
            'objectiveFunction',
            'constraints',
            'solutions',
        ]);
    }

    public function getSolutions(Project $project): array
    {
        return $project->solutions()
            ->latest()
            ->get()
            ->map(function (Solution $solution) {
                return [
                    'id' => $solution->id,
                    'method_used' => $solution->method_used,
                    'z_value' => $solution->z_value,
                    'variables_result' => $solution->variables_result,
                    'created_at' => $solution->created_at,
                ];
            })
            ->values()
            ->all();
    }

    public function persistSolution(Project $project, string $method, array $result): Solution
    {
        return $project->solutions()->create([
            'method_used' => $method,
            'z_value' => $this->extractObjectiveValue($result),
            'variables_result' => $result,
        ]);
    }

    private function resolveUserId(): int
    {
        $authUserId = Auth::id();
        if ($authUserId) {
            return (int) $authUserId;
        }

        $systemUser = User::query()->where('email', 'system@woodpecker.local')->first();
        if ($systemUser) {
            return (int) $systemUser->id;
        }

        return (int) User::query()->create([
            'name' => 'System',
            'email' => 'system@woodpecker.local',
            'password' => Hash::make(Str::random(32)),
        ])->id;
    }

    private function normalizeCoefficients(array $coefficients): array
    {
        return array_map(
            fn ($value) => (float) $value,
            $coefficients
        );
    }

    private function extractObjectiveValue(array $result): float
    {
        $value = data_get($result, 'objective_value');

        if ($value === null) {
            $value = data_get($result, 'solution.z');
        }

        if ($value === null) {
            $value = data_get($result, 'best_solution.objective_value');
        }

        return (float) ($value ?? 0.0);
    }
}
