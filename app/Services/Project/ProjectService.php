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
    // Cria um projeto e grava seus relacionamentos principais sem carregar solucoes por padrao.
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
            ]);
        });
    }

    // Atualiza o projeto e recarrega apenas os relacionamentos essenciais.
    public function update(Project $project, array $data): Project
    {
        return DB::transaction(function () use ($project, $data) {
            $project->update([
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'num_variables' => (int) $data['num_variables'],
                'num_constraints' => (int) $data['num_constraints'],
                'optimization_type' => $data['optimization_type'],
            ]);

            $project->objectiveFunction()->update([
                'coefficients' => $this->normalizeCoefficients(
                    $data['objective_function']['coefficients']
                ),
            ]);

            $project->constraints()->delete();

            foreach ($data['constraints'] as $constraint) {
                $project->constraints()->create([
                    'coefficients' => $this->normalizeCoefficients(
                        $constraint['coefficients']
                    ),
                    'operator' => $constraint['operator'],
                    'rhs_value' => (float) $constraint['rhs_value'],
                ]);
            }

            return $project->fresh([
                'objectiveFunction',
                'constraints',
            ]);
        });
    }

    // Carrega o projeto com os relacionamentos basicos e, opcionalmente, as solucoes.
    public function load(Project $project, bool $withSolutions = false): Project
    {
        $relations = [
            'objectiveFunction',
            'constraints',
        ];

        if ($withSolutions) {
            $relations[] = 'solutions';
        }

        return $project->load($relations);
    }

    // Retorna as solucoes gravadas para o projeto sem trazer os dados completos de cada resposta.
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

    // Persiste a solucao gerada por um metodo numerico no relacionamento solutions do projeto.
    public function persistSolution(Project $project, string $method, array $result): Solution
    {
        $solutionPayload = $method === 'integer'
            ? data_get($result, 'solution', $result)
            : $result;

        return $project->solutions()->create([
            'method_used' => $method,
            'z_value' => $this->extractObjectiveValue($result),
            'variables_result' => $solutionPayload,
        ]);
    }

    // Resolve o usuario atual ou cria o usuario tecnico interno quando nao ha autenticacao.
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

    // Converte os coeficientes recebidos para float antes de salvar no banco.
    private function normalizeCoefficients(array $coefficients): array
    {
        return array_map(
            fn ($value) => (float) $value,
            $coefficients
        );
    }

    // Extrai o valor objetivo de qualquer formato de retorno gerado pelos services.
    private function extractObjectiveValue(array $result): float
    {
        $value = data_get($result, 'objective_value');

        if ($value === null) {
            $value = data_get($result, 'solution.z');
        }

        if ($value === null) {
            $value = data_get($result, 'solution.objective_value');
        }

        if ($value === null) {
            $value = data_get($result, 'optimal_solution.objective_value');
        }

        if ($value === null) {
            $value = data_get($result, 'best_solution.objective_value');
        }

        if ($value === null) {
            $value = data_get($result, 'primal_solution.objective_value');
        }

        return (float) ($value ?? 0.0);
    }
}
