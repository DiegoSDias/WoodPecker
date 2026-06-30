import {
    buildDisplayRows,
    buildIterationHeaders,
    buildIterationRowLabels,
    formatNumber,
    formatOptimizationType,
    formatTerm,
    formatVariableInline,
} from './projectResultsUtils';

export default function SimplexResult({ data, savedSolution, project }) {
    const objectiveValue = data.objective_value ?? savedSolution?.z_value;
    const iterations = extractIterations(data);
    const columnNames = Array.isArray(data?.column_names)
        ? data.column_names
        : [];

    return (
        <div className="max-w-[64rem] space-y-9">
            <h1 className="font-inter text-[2.35rem] font-black leading-tight text-[#653018]">
                Método Simplex
            </h1>

            {iterations.length > 0 ? (
                <div className="space-y-9">
                    {iterations.map((iteration, index) => (
                        <SimplexIteration
                            key={`${iteration.iteration || index}-${index}`}
                            iteration={iteration}
                            nextIteration={iterations[index + 1]}
                            project={project}
                            columnNames={columnNames}
                        />
                    ))}
                </div>
            ) : (
                <EmptyState
                    title="Nenhuma iteração encontrada"
                    description="Não há iterações registradas para o método Simplex."
                />
            )}

            <SimplexSummary
                data={data}
                objectiveValue={objectiveValue}
                project={project}
            />
        </div>
    );
}

function SimplexIteration({
    iteration,
    nextIteration,
    project,
    columnNames,
}) {
    const phaseLabel = formatPhaseLabel(
        iteration.phase_label || iteration.phase || ''
    );

    return (
        <div>
            <div className="mb-4 flex items-center gap-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#653018] font-inter text-lg font-black text-white">
                    {iteration.iteration || '-'}
                </span>

                <h2 className="font-inter text-xl font-black text-[#653018]">
                    Iteração {iteration.iteration || '-'}
                    {phaseLabel ? (
                        <span className="ml-3 text-sm font-semibold text-[#8a5b33]">
                            {phaseLabel}
                        </span>
                    ) : null}
                </h2>
            </div>

            {Array.isArray(iteration.tableau) && iteration.tableau.length > 0 ? (
                <IterationTable
                    iteration={iteration}
                    nextIteration={nextIteration}
                    matrix={iteration.tableau}
                    project={project}
                    columnNames={columnNames}
                />
            ) : (
                <SmallEmptyText text="Esta iteração não possui tabela registrada." />
            )}
        </div>
    );
}

function SimplexSummary({ data, objectiveValue, project }) {
    const solution = data.solution || {};
    const variablesText = formatVariableInline(solution);

    return (
        <div>
            <h2 className="mb-4 font-inter text-xl font-black text-[#653018]">
                Resumo da Resolução
            </h2>

            <p className="max-w-[58rem] text-lg leading-relaxed text-[#2b211b]">
                O método Simplex encontrou o valor da função objetivo igual a{' '}
                {formatNumber(objectiveValue)}
                {variablesText ? `, com ${variablesText}.` : '.'}
            </p>

            {project?.objective_function?.coefficients?.length > 0 && (
                <p className="mt-3 max-w-[58rem] text-lg leading-relaxed text-[#2b211b]">
                    Função objetivo:{' '}
                    {formatOptimizationType(project?.optimization_type)} Z ={' '}
                    {project.objective_function.coefficients
                        .map((coefficient, index) =>
                            formatTerm(coefficient, `x${index + 1}`, index)
                        )
                        .join(' ')}
                    .
                </p>
            )}
        </div>
    );
}

function IterationTable({
    iteration,
    nextIteration,
    matrix,
    project,
    columnNames,
}) {
    const displayRows = buildDisplayRows(matrix);

    const baseHeaders =
        Array.isArray(columnNames) && columnNames.length > 0
            ? columnNames
            : buildIterationHeaders(displayRows, project);

    const headers = buildVisibleHeaders(baseHeaders, displayRows);
    const rowLabels = buildIterationRowLabels(displayRows);

    const pivotRowIndex = getPivotIndex(
        iteration?.pivot_row_index,
        iteration?.pivot_row,
        iteration?.pivotRowIndex,
        iteration?.pivotRow,
        nextIteration?.pivot_row_index,
        nextIteration?.pivot_row,
        nextIteration?.pivotRowIndex,
        nextIteration?.pivotRow
    );

    const pivotColumnIndex = getPivotIndex(
        iteration?.pivot_column_index,
        iteration?.pivot_column,
        iteration?.pivotColumnIndex,
        iteration?.pivotColumn,
        nextIteration?.pivot_column_index,
        nextIteration?.pivot_column,
        nextIteration?.pivotColumnIndex,
        nextIteration?.pivotColumn
    );

    const pivotInfo = buildPivotInfo({
        pivotRowIndex,
        pivotColumnIndex,
        rows: displayRows,
        rowLabels,
        headers,
    });

    return (
        <div>
            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[42rem] border-collapse text-center">
                        <thead className="bg-[#eadccb] font-inter text-xl font-black text-[#653018]">
                            <tr>
                                <th className="px-5 py-4">Base</th>

                                {headers.map((header) => (
                                    <th key={header} className="px-5 py-4">
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {displayRows.map((row, rowIndex) => (
                                <tr
                                    key={rowIndex}
                                    className="border-t border-[#eadccb]"
                                >
                                    <td className="px-5 py-4 font-semibold text-[#111111]">
                                        {rowLabels[rowIndex] === 'Z' ? (
                                            <img
                                                src="/images/white-z.png"
                                                alt="Z"
                                                className="mx-auto h-9 w-auto object-contain invert"
                                            />
                                        ) : (
                                            rowLabels[rowIndex]
                                        )}
                                    </td>

                                    {headers.map((_, columnIndex) => (
                                        <td
                                            key={columnIndex}
                                            className={getCellClassName(
                                                rowIndex,
                                                columnIndex,
                                                pivotRowIndex,
                                                pivotColumnIndex,
                                                displayRows
                                            )}
                                        >
                                            {formatNumber(row[columnIndex])}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <PivotMessage pivotInfo={pivotInfo} />
        </div>
    );
}

function PivotMessage({ pivotInfo }) {
    return (
        <p className="mt-3 max-w-[58rem] text-sm leading-relaxed text-[#653018]">
            <span className="font-inter font-black">Pivô utilizado:</span>{' '}
            {pivotInfo ? (
                <>
                    linha <span className="font-semibold">{pivotInfo.row}</span>,
                    coluna{' '}
                    <span className="font-semibold">{pivotInfo.column}</span>,
                    valor{' '}
                    <span className="font-semibold">
                        {formatNumber(pivotInfo.value)}
                    </span>
                    .
                </>
            ) : (
                'não informado nesta iteração.'
            )}
        </p>
    );
}

function buildPivotInfo({
    pivotRowIndex,
    pivotColumnIndex,
    rows,
    rowLabels,
    headers,
}) {
    const normalizedPivotRowIndex = normalizePivotRowIndex(
        pivotRowIndex,
        rows
    );

    const normalizedPivotColumnIndex =
        normalizePivotColumnIndex(pivotColumnIndex);

    if (
        !Number.isInteger(normalizedPivotRowIndex) ||
        !Number.isInteger(normalizedPivotColumnIndex)
    ) {
        return null;
    }

    const row = rows?.[normalizedPivotRowIndex];

    if (!Array.isArray(row)) {
        return null;
    }

    const value = row[normalizedPivotColumnIndex];

    return {
        row: rowLabels?.[normalizedPivotRowIndex] || '-',
        column: headers?.[normalizedPivotColumnIndex] || '-',
        value,
    };
}

function getCellClassName(
    rowIndex,
    columnIndex,
    pivotRowIndex,
    pivotColumnIndex,
    rows
) {
    const normalizedPivotRowIndex = normalizePivotRowIndex(
        pivotRowIndex,
        rows
    );

    const normalizedPivotColumnIndex =
        normalizePivotColumnIndex(pivotColumnIndex);

    const isPivotCell =
        Number.isInteger(normalizedPivotRowIndex) &&
        Number.isInteger(normalizedPivotColumnIndex) &&
        rowIndex === normalizedPivotRowIndex &&
        columnIndex === normalizedPivotColumnIndex;

    return [
        'px-5 py-4 text-base font-medium text-[#111111]',
        isPivotCell ? 'bg-[#f4d8b6] font-black text-[#653018]' : '',
    ]
        .filter(Boolean)
        .join(' ');
}

function getPivotIndex(...values) {
    for (const value of values) {
        const number = Number(value);

        if (Number.isInteger(number) && number >= 0) {
            return number;
        }
    }

    return null;
}

function normalizePivotRowIndex(pivotRowIndex, rows) {
    if (!Number.isInteger(pivotRowIndex)) {
        return null;
    }

    const rowCount = Array.isArray(rows) ? rows.length : 0;

    if (rowCount === 0) {
        return pivotRowIndex;
    }

    /*
     * Quando o backend envia pivot_row_index contando apenas as linhas das
     * restrições, a linha Z não entra na contagem. Como a tabela exibida tem Z
     * na primeira linha, somamos 1.
     */
    if (pivotRowIndex >= 0 && pivotRowIndex < rowCount - 1) {
        return pivotRowIndex + 1;
    }

    return pivotRowIndex;
}

function normalizePivotColumnIndex(pivotColumnIndex) {
    if (!Number.isInteger(pivotColumnIndex)) {
        return null;
    }

    return pivotColumnIndex;
}

function formatPhaseLabel(phase) {
    if (!phase) {
        return '';
    }

    const normalized = String(phase)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '');

    if (normalized === 'phase1' || normalized === 'fase1') {
        return 'Fase 1';
    }

    if (normalized === 'phase2' || normalized === 'fase2') {
        return 'Fase 2';
    }

    return String(phase)
        .replace(/phase/gi, 'Fase ')
        .replace(/fase/gi, 'Fase ')
        .replace(/\s+/g, ' ')
        .trim();
}

function buildVisibleHeaders(headers, rows) {
    const visibleHeaders = [...headers];
    const rowLength = rows?.[0]?.length || 0;

    if (rowLength > 0 && visibleHeaders.length === rowLength - 1) {
        visibleHeaders.push('RHS');
        return visibleHeaders;
    }

    if (visibleHeaders.length > 0) {
        visibleHeaders[visibleHeaders.length - 1] = 'RHS';
    }

    return visibleHeaders;
}

function EmptyState({ title, description }) {
    return (
        <div className="rounded-2xl bg-[#fffaf4] px-8 py-20 text-center shadow-md">
            <p className="font-inter text-2xl font-black text-[#653018]">
                {title}
            </p>

            <p className="mx-auto mt-3 max-w-[36rem] text-base leading-relaxed text-[#777777]">
                {description}
            </p>
        </div>
    );
}

function SmallEmptyText({ text }) {
    return <p className="text-sm leading-relaxed text-[#777777]">{text}</p>;
}

function extractIterations(data) {
    const candidates = [
        data?.iterations,
        data?.iterations_history,
        data?.variables_result?.iterations,
        data?.variables_result?.iterations_history,
        data?.result?.iterations,
        data?.result?.iterations_history,
        data?.solution?.iterations,
        data?.solution?.iterations_history,
        data?.data?.iterations,
        data?.data?.iterations_history,
        data?.saved_solution?.iterations,
    ];

    for (const candidate of candidates) {
        if (Array.isArray(candidate) && candidate.length > 0) {
            return candidate;
        }
    }

    return [];
}