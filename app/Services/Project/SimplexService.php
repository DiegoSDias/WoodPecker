<?php

namespace App\Services\Project;

use Exception;

class SimplexService
{
    protected array $tableau = [];
    protected int $numVars;
    protected int $numConstraints;
    protected string $type;

    /**
     * Método principal chamado pelo Controller.
     */
    public function solve(array $data): array
    {
        $this->numVars = $data['num_variables'];
        $this->numConstraints = $data['num_constraints'];
        $this->type = $data['optimization_type'];

        // Variável para guardar o histórico de todas as matrizes
        $history = [];

        // 1. Monta o quadro inicial
        $this->buildInitialTableau($data['objective_function'], $data['constraints']);

        // Salva a Iteração 0 (Quadro Inicial)
        $history[] = [
            'iteration' => 0,
            'tableau' => $this->tableau,
            'entering_column' => null,
            'leaving_row' => null
        ];

        // 2. Loop principal: Roda enquanto não for a solução ótima
        $maxIterations = 100;
        $iterations = 0;

        while (!$this->isOptimal() && $iterations < $maxIterations) {
            $enteringCol = $this->getEnteringVariable();
            $leavingRow = $this->getLeavingVariable($enteringCol);
            
            // Registra quem entrou e quem saiu na iteração atual antes de calcular a próxima
            $history[$iterations]['entering_column'] = $enteringCol;
            $history[$iterations]['leaving_row'] = $leavingRow;

            // Faz o cálculo matemático
            $this->pivot($leavingRow, $enteringCol);
            $iterations++;

            // Salva o novo quadro após o pivoteamento
            $history[] = [
                'iteration' => $iterations,
                'tableau' => $this->tableau,
                'entering_column' => null, // Será preenchido na próxima volta, se houver
                'leaving_row' => null
            ];
        }

        if ($iterations >= $maxIterations) {
            throw new Exception("O Simplex não convergiu após $maxIterations iterações. Possível problema ilimitado ou degenerado.");
        }

        // 3. Extrai a resposta final
        $finalSolution = $this->extractSolution();
        
        // Embutindo o histórico no retorno final
        $finalSolution['iterations_history'] = $history;

        return $finalSolution;
    }

    /**
     * Constrói a matriz (Quadro Simplex).
     * Linhas 0 até N-1 são as restrições. A última linha é a função objetivo (Z).
     */
    private function buildInitialTableau(array $objectiveFunction, array $constraints): void
    {
        $totalColumns = $this->numVars + $this->numConstraints + 1; // Variáveis de decisão + Folgas + Coluna de Resultados (RHS)
        
        // Preenche as restrições e adiciona variáveis de folga (Matriz Identidade)
        foreach ($constraints as $i => $constraint) {
            if ($constraint['operator'] !== '<=') {
                throw new Exception("Esta versão suporta apenas restrições '<='. Restrições '>=' ou '=' requerem a implementação do Método Big M.");
            }

            $row = array_fill(0, $totalColumns, 0.0); // Inicializa a linha com zeros

            // Insere os coeficientes das variáveis de decisão ($x1, $x2...)
            foreach ($constraint['coefficients'] as $j => $coef) {
                $row[$j] = (float) $coef;
            }

            // Insere a variável de folga (1 na posição correspondente à restrição atual)
            $row[$this->numVars + $i] = 1.0;

            // Insere o valor do lado direito da igualdade (RHS) na última coluna
            $row[$totalColumns - 1] = (float) $constraint['rhs_value'];

            $this->tableau[] = $row;
        }

        // Preenche a linha da Função Objetivo (Linha de Z)
        $zRow = array_fill(0, $totalColumns, 0.0);
        foreach ($objectiveFunction['coefficients'] as $j => $coef) {
            // No Simplex para Maximização, os coeficientes de Z entram com sinal invertido
            $val = (float) $coef;
            $zRow[$j] = $this->type === 'max' ? -$val : $val; 
        }
        $this->tableau[] = $zRow; // Adiciona Z como a última linha do quadro
    }

    /**
     * Verifica se a solução é ótima.
     * É ótima quando não há mais nenhum valor negativo na linha Z (última linha).
     */
    private function isOptimal(): bool
    {
        $zRow = end($this->tableau); // Pega a última linha

        // Varre a linha Z (ignorando a última coluna que é o resultado de Z)
        for ($i = 0; $i < count($zRow) - 1; $i++) {
            if ($zRow[$i] < -0.000001) { // Usamos margem de erro por causa de precisão de ponto flutuante no PHP
                return false; // Achou um negativo, não é ótimo
            }
        }
        return true;
    }

    /**
     * Descobre a variável que ENTRA na base (Coluna Pivô).
     * É o índice do valor mais negativo na linha Z.
     */
    private function getEnteringVariable(): int
    {
        $zRow = end($this->tableau);
        $minVal = 0;
        $enteringCol = -1;

        for ($i = 0; $i < count($zRow) - 1; $i++) {
            if ($zRow[$i] < $minVal) {
                $minVal = $zRow[$i];
                $enteringCol = $i;
            }
        }

        return $enteringCol;
    }

    /**
     * Descobre a variável que SAI da base (Linha Pivô).
     * É a linha com o menor resultado positivo da divisão (RHS / Coeficiente da Coluna Pivô).
     */
    private function getLeavingVariable(int $enteringCol): int
    {
        $leavingRow = -1;
        $minRatio = INF;
        $rhsCol = count($this->tableau[0]) - 1; // Índice da última coluna

        // Itera apenas sobre as restrições (ignora a última linha que é o Z)
        for ($i = 0; $i < $this->numConstraints; $i++) {
            $coef = $this->tableau[$i][$enteringCol];
            
            if ($coef > 0.000001) { // O coeficiente tem que ser estritamente positivo
                $ratio = $this->tableau[$i][$rhsCol] / $coef;
                
                if ($ratio < $minRatio) {
                    $minRatio = $ratio;
                    $leavingRow = $i;
                }
            }
        }

        if ($leavingRow === -1) {
            throw new Exception("Problema de solução ilimitada. Nenhum elemento positivo na coluna pivô.");
        }

        return $leavingRow;
    }

    /**
     * Realiza o escalonamento (Método de Gauss-Jordan) no quadro.
     */
    private function pivot(int $row, int $col): void
    {
        $pivotElement = $this->tableau[$row][$col];
        $totalColumns = count($this->tableau[0]);

        // 1. Divide a linha pivô inteira pelo elemento pivô (para o pivô virar 1)
        for ($j = 0; $j < $totalColumns; $j++) {
            $this->tableau[$row][$j] /= $pivotElement;
        }

        // 2. Zera os outros elementos da coluna pivô nas outras linhas (incluindo Z)
        for ($i = 0; $i < count($this->tableau); $i++) {
            if ($i !== $row) {
                $factor = $this->tableau[$i][$col];
                for ($j = 0; $j < $totalColumns; $j++) {
                    $this->tableau[$i][$j] -= $factor * $this->tableau[$row][$j];
                }
            }
        }
    }

    /**
     * Lê o quadro final para extrair o valor de Z e de cada variável (x1, x2, etc).
     */
    private function extractSolution(): array
    {
        $result = [];
        $rhsCol = count($this->tableau[0]) - 1;

        // Pega o valor de Z (canto inferior direito do quadro)
        $zRowIndex = count($this->tableau) - 1;
        $zValue = $this->tableau[$zRowIndex][$rhsCol];

        // Para cada variável de decisão original, procura se ela está na base (coluna formando vetor identidade)
        for ($j = 0; $j < $this->numVars; $j++) {
            $isBasic = true;
            $basicRow = -1;

            // Varre a coluna da variável para ver se ela tem apenas um "1" e o resto "0"
            for ($i = 0; $i < count($this->tableau); $i++) {
                $val = abs($this->tableau[$i][$j]);

                if (abs($val - 1.0) < 0.000001) {
                    if ($basicRow === -1) {
                        $basicRow = $i; // Achou o "1"
                    } else {
                        $isBasic = false; // Achou mais de um "1", não é base
                        break;
                    }
                } elseif ($val > 0.000001) {
                    $isBasic = false; // Achou um número que não é 0 nem 1
                    break;
                }
            }

            // Se for variável básica, o valor dela é o RHS daquela linha. Se não for, é 0.
            $result["x" . ($j + 1)] = $isBasic ? $this->tableau[$basicRow][$rhsCol] : 0.0;
        }

        return [
            'z_value' => $zValue,
            'variables' => $result
        ];
    }
}