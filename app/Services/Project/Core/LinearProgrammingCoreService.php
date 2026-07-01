<?php

namespace App\Services\Project\Core;

class LinearProgrammingCoreService
{
    private const EPSILON = 1e-9;

        // Fun??o __construct respons?vel por executar esta etapa do service.
    public function __construct(
        protected ProblemBuilderService $problemBuilderService,
        protected SimplexEngineService $simplexEngineService,
        protected SimplexResultFormatterService $simplexResultFormatterService,
        protected SimplexSolutionExtractorService $simplexSolutionExtractorService
    ) {}

    // Encaminha a montagem do problema dual para o builder especializado.
    public function buildDualProblem(
        array $objectiveCoefficients,
        array $constraints,
        string $optimizationType
    ): array {
        return $this->problemBuilderService->buildDualProblem(
            $objectiveCoefficients,
            $constraints,
            $optimizationType
        );
    }

    // Executa o Simplex principal e devolve o resultado final do calculo.
    //SIMPLEX
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

        $problem = $this->problemBuilderService->buildProblem(
            $objectiveCoefficients,
            $constraints,
            $optimizationType
        );

        $phase1 = $this->simplexEngineService->solvePhase(
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
            return $this->simplexResultFormatterService->buildFailureResult(
                $phase1['status'],
                $iterations,
                $phase1['tableau'],
                $problem['column_names'],
                $problem['decision_count'],
                []
            );
        }

        if ($phase1['status'] === 'unbounded') {
            return $this->simplexResultFormatterService->buildFailureResult(
                'unbounded',
                $iterations,
                [],
                $problem['column_names'],
                $problem['decision_count'],
                []
            );
        }

        if (abs($phase1['objective_value']) > self::EPSILON) {
            return $this->simplexResultFormatterService->buildFailureResult(
                'infeasible',
                $iterations,
                $phase1['tableau'],
                $problem['column_names'],
                $problem['decision_count'],
                ['phase1_objective' => $phase1['objective_value']]
            );
        }

        $phase2 = $this->simplexEngineService->solvePhase(
            $phase1['tableau_rows'],
            $phase1['basis'],
            $problem['phase2_objective'],
            $problem['eligible_phase2'],
            $problem['column_names'],
            $storeIterations,
            $maxIterations
        );

        $iterations = $this->simplexResultFormatterService->mergeIterations(
            $iterations,
            $phase2['iterations'],
            count($iterations)
        );

        if (in_array($phase2['status'], ['iteration_limit', 'cycled'], true)) {
            return $this->simplexResultFormatterService->buildFailureResult(
                $phase2['status'],
                $iterations,
                $phase2['tableau'],
                $problem['column_names'],
                $problem['decision_count'],
                []
            );
        }

        if ($phase2['status'] === 'unbounded') {
            return $this->simplexResultFormatterService->buildFailureResult(
                'unbounded',
                $iterations,
                $phase2['tableau'],
                $problem['column_names'],
                $problem['decision_count'],
                []
            );
        }

        $solution = $this->simplexSolutionExtractorService->extractDecisionSolution(
            $phase2['tableau_rows'],
            $phase2['basis'],
            $problem['column_names'],
            $problem['decision_count']
        );

        $objectiveValue = $phase2['objective_value'];
        if ($optimizationType === 'min') {
            $objectiveValue *= -1;
        }

        $reducedCosts = $this->simplexSolutionExtractorService->extractReducedCosts(
        $phase2['tableau'],
        $problem['decision_count']
    );

        $alternativeSolutions = $detectMultipleSolutions
            ? $this->simplexSolutionExtractorService->findAlternativeSolutions(
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
            'tableau_final' => $this->simplexResultFormatterService->cleanTableau($phase2['tableau']),
            'has_multiple_solution' => !empty($alternativeSolutions),
            'alternative_solutions' => $alternativeSolutions,
            'reduced_costs' => $reducedCosts,
        ];
    }

    // Executa o Simplex registrando o historico das iteracoes para exibicao detalhada.
    //SIMPLEX
    public function solveSimplexWithHistory(
        array $objectiveCoefficients,
        array $constraints,
        string $optimizationType,
        array $options = []
    ): array {
        $storeIterations = $options['store_iterations'] ?? true;
        $detectMultipleSolutions = $options['detect_multiple_solutions'] ?? true;
        $maxIterations = (int) ($options['max_iterations'] ?? 200);

        $problem = $this->problemBuilderService->buildProblem(
            $objectiveCoefficients,
            $constraints,
            $optimizationType
        );

        $requiresTwoPhase = $this->simplexEngineService->requiresTwoPhase($problem['column_names']);

        if (! $requiresTwoPhase) {
            $initialIteration = [
                'iteration' => 1,
                'phase' => 'phase2',
                'phase_label' => null,
                'status' => 'initial',
                'tableau' => $this->simplexResultFormatterService->cleanTableau([
                    ...$problem['tableau_rows'],
                    $this->simplexEngineService->buildObjectiveRow(
                        $problem['tableau_rows'],
                        $problem['basis'],
                        $problem['phase2_objective']
                    ),
                ]),
            ];

            $phase2 = $this->simplexEngineService->solvePhase(
                $problem['tableau_rows'],
                $problem['basis'],
                $problem['phase2_objective'],
                $problem['eligible_phase2'],
                $problem['column_names'],
                $storeIterations,
                $maxIterations
            );

            $iterations = [$initialIteration];
            $iterations = $this->simplexResultFormatterService->mergeIterations(
                $iterations,
                $phase2['iterations'],
                count($iterations),
                'phase2',
                'Fase 2'
            );

            if (in_array($phase2['status'], ['iteration_limit', 'cycled'], true)) {
                return $this->simplexResultFormatterService->buildDetailedFailureResult(
                    $phase2['status'],
                    $iterations,
                    $phase2['tableau'],
                    $problem['column_names'],
                    []
                );
            }

            if ($phase2['status'] === 'unbounded') {
                return $this->simplexResultFormatterService->buildDetailedFailureResult(
                    'unbounded',
                    $iterations,
                    $phase2['tableau'],
                    $problem['column_names'],
                    []
                );
            }

            $solution = $this->simplexSolutionExtractorService->extractDecisionSolution(
                $phase2['tableau_rows'],
                $phase2['basis'],
                $problem['column_names'],
                $problem['decision_count']
            );

            $objectiveValue = $phase2['objective_value'];
            if ($optimizationType === 'min') {
                $objectiveValue *= -1;
            }

            $reducedCosts = $this->simplexSolutionExtractorService->extractReducedCosts(
                $phase2['tableau'],
                $problem['decision_count']
            );

            $alternativeSolutions = $detectMultipleSolutions
                ? $this->simplexSolutionExtractorService->findAlternativeSolutions(
                    $phase2['tableau_rows'],
                    $phase2['basis'],
                    $problem['phase2_objective'],
                    $problem['eligible_phase2'],
                    $problem['column_names'],
                    $problem['decision_count']
                )
                : [];

            $flags = [];
            if ($phase2['degenerate']) {
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
                'tableau_final' => $this->simplexResultFormatterService->cleanTableau($phase2['tableau']),
                'has_multiple_solution' => !empty($alternativeSolutions),
                'alternative_solutions' => $alternativeSolutions,
                'reduced_costs' => $reducedCosts,
                'column_names' => $problem['column_names'],
            ];
        }

        $initialIteration = [
            'iteration' => 1,
            'phase' => 'phase1',
            'phase_label' => 'Fase 1',
            'status' => 'initial',
            'tableau' => $this->simplexResultFormatterService->cleanTableau([
                ...$problem['tableau_rows'],
                $this->simplexEngineService->buildObjectiveRow(
                    $problem['tableau_rows'],
                    $problem['basis'],
                    $problem['phase1_objective']
                ),
            ]),
        ];

        $phase1 = $this->simplexEngineService->solvePhase(
            $problem['tableau_rows'],
            $problem['basis'],
            $problem['phase1_objective'],
            $problem['eligible_phase1'],
            $problem['column_names'],
            $storeIterations,
            $maxIterations
        );

        $iterations = [$initialIteration];
        $iterations = $this->simplexResultFormatterService->mergeIterations(
            $iterations,
            $phase1['iterations'],
            count($iterations),
            'phase1',
            'Fase 1'
        );

        if (in_array($phase1['status'], ['iteration_limit', 'cycled'], true)) {
            return $this->simplexResultFormatterService->buildDetailedFailureResult(
                $phase1['status'],
                $iterations,
                $phase1['tableau'],
                $problem['column_names'],
                []
            );
        }

        if ($phase1['status'] === 'unbounded') {
            return $this->simplexResultFormatterService->buildDetailedFailureResult(
                'unbounded',
                $iterations,
                [],
                $problem['column_names'],
                []
            );
        }

        if (abs($phase1['objective_value']) > self::EPSILON) {
            return $this->simplexResultFormatterService->buildDetailedFailureResult(
                'infeasible',
                $iterations,
                $phase1['tableau'],
                $problem['column_names'],
                ['phase1_objective' => $phase1['objective_value']]
            );
        }

        $transitionTableau = $this->simplexResultFormatterService->cleanTableau([
            ...$phase1['tableau_rows'],
            $this->simplexEngineService->buildObjectiveRow(
                $phase1['tableau_rows'],
                $phase1['basis'],
                $problem['phase2_objective']
            ),
        ]);

        $iterations[] = [
            'iteration' => count($iterations) + 1,
            'phase' => 'transition',
            'phase_label' => 'Transição',
            'status' => 'phase_change',
            'tableau' => $transitionTableau,
        ];

        $phase2 = $this->simplexEngineService->solvePhase(
            $phase1['tableau_rows'],
            $phase1['basis'],
            $problem['phase2_objective'],
            $problem['eligible_phase2'],
            $problem['column_names'],
            $storeIterations,
            $maxIterations
        );

        $iterations = $this->simplexResultFormatterService->mergeIterations(
            $iterations,
            $phase2['iterations'],
            count($iterations),
            'phase2',
            'Fase 2'
        );

        if (in_array($phase2['status'], ['iteration_limit', 'cycled'], true)) {
            return $this->simplexResultFormatterService->buildDetailedFailureResult(
                $phase2['status'],
                $iterations,
                $phase2['tableau'],
                $problem['column_names'],
                []
            );
        }

        if ($phase2['status'] === 'unbounded') {
            return $this->simplexResultFormatterService->buildDetailedFailureResult(
                'unbounded',
                $iterations,
                $phase2['tableau'],
                $problem['column_names'],
                []
            );
        }

        $solution = $this->simplexSolutionExtractorService->extractDecisionSolution(
            $phase2['tableau_rows'],
            $phase2['basis'],
            $problem['column_names'],
            $problem['decision_count']
        );

        $objectiveValue = $phase2['objective_value'];
        if ($optimizationType === 'min') {
            $objectiveValue *= -1;
        }

        $reducedCosts = $this->simplexSolutionExtractorService->extractReducedCosts(
            $phase2['tableau'],
            $problem['decision_count']
        );

        $alternativeSolutions = $detectMultipleSolutions
            ? $this->simplexSolutionExtractorService->findAlternativeSolutions(
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
            'tableau_final' => $this->simplexResultFormatterService->cleanTableau($phase2['tableau']),
            'has_multiple_solution' => !empty($alternativeSolutions),
            'alternative_solutions' => $alternativeSolutions,
            'reduced_costs' => $reducedCosts,
            'column_names' => $problem['column_names'],
        ];
    }
}
