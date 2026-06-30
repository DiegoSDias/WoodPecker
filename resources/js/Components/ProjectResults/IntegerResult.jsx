import {
    buildDisplayRows,
    buildIterationHeaders,
    buildIterationRowLabels,
    cleanVariables,
    extractResultData,
    formatNumber,
    formatVariableInline,
    getLatestSolutionByMethod,
    getOverviewVariables,
} from './projectResultsUtils';

export default function IntegerResult({
    data,
    savedSolution,
    project,
    solutions,
}) {
    const simplexSaved = getLatestSolutionByMethod(solutions, 'simplex');
    const simplexData = extractResultData(simplexSaved);

    const simplexIterations = Array.isArray(simplexData?.iterations)
        ? simplexData.iterations
        : [];

    const integerIterations = extractIterations(data);

    const iterationsToShow =
        simplexIterations.length > 0 ? simplexIterations : integerIterations;

    const relaxedSource =
        data?.relaxed_solution ||
        data?.lp_solution ||
        simplexData ||
        null;

    const integerSource =
        data?.integer_solution ||
        data?.best_solution ||
        data?.ip_solution ||
        null;

    const relaxedObjective =
        relaxedSource?.objective_value ??
        relaxedSource?.optimal_solution?.objective_value ??
        relaxedSource?.solution?.objective_value ??
        simplexSaved?.z_value;

    const integerObjective =
        integerSource?.objective_value ??
        integerSource?.optimal_solution?.objective_value ??
        data?.best_solution?.objective_value ??
        savedSolution?.z_value;

    const relaxedVariables =
        cleanVariables(
            relaxedSource?.solution ||
                relaxedSource?.optimal_solution ||
                getOverviewVariables(relaxedSource)
        ) || {};

    const integerVariables =
        cleanVariables(
            integerSource?.variables ||
                integerSource?.solution ||
                integerSource?.optimal_solution ||
                data?.best_solution?.variables ||
                getOverviewVariables(data)
        ) || {};

    const relaxedVariablesText = formatVariableInline(relaxedVariables) || '-';
    const integerVariablesText = formatVariableInline(integerVariables) || '-';
    const relaxedSolutionIsInteger = hasOnlyIntegerValues(relaxedVariables);

    return (
        <div className="max-w-[64rem] space-y-10">
            <h1 className="font-inter text-[2.35rem] font-black leading-tight text-[#653018]">
                Solução Inteira (Branch & Bound)
            </h1>

            <p className="max-w-[58rem] text-lg leading-relaxed text-[#2b211b]">
                Comparativo entre a solução linear relaxada (que aceita frações)
                e a solução inteira forçada, ideal para problemas onde as
                variáveis representam unidades indivisíveis.
            </p>

            {iterationsToShow.length > 0 ? (
                <section className="space-y-8">
                    {iterationsToShow.map((iteration, index) => (
                        <div key={`integer-visible-iteration-${index}`}>
                            <div className="mb-4 flex items-center gap-4">
                                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#653018] font-inter text-lg font-black text-white">
                                    {iteration.iteration || index + 1}
                                </span>

                                <h2 className="font-inter text-xl font-black text-[#653018]">
                                    Iteração {iteration.iteration || index + 1}
                                </h2>
                            </div>

                            {Array.isArray(iteration.tableau) &&
                            iteration.tableau.length > 0 ? (
                                <IterationTable
                                    iteration={iteration}
                                    nextIteration={iterationsToShow[index + 1]}
                                    matrix={iteration.tableau}
                                    project={project}
                                />
                            ) : (
                                <SmallEmptyText text="Esta iteração não possui tabela registrada." />
                            )}
                        </div>
                    ))}
                </section>
            ) : (
                <EmptyState
                    title="Nenhuma iteração encontrada"
                    description="Não há iterações registradas para exibição."
                />
            )}

            <section>
                <h2 className="mb-6 font-inter text-2xl font-black text-[#653018]">
                    Solução
                </h2>

                <div className="overflow-hidden rounded-2xl bg-white shadow-md">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[50rem] border-collapse text-center">
                            <thead className="bg-[#eadccb] font-inter text-xl font-black text-[#653018]">
                                <tr>
                                    <th className="px-5 py-4">
                                        Tipo de Solução
                                    </th>
                                    <th className="px-5 py-4">Valor Z</th>
                                    <th className="px-5 py-4">Variáveis</th>
                                    <th className="px-5 py-4">Status</th>
                                </tr>
                            </thead>

                            <tbody>
                                <tr className="border-t border-[#eadccb]">
                                    <td className="px-5 py-4 text-base font-medium text-[#2b211b]">
                                        Relaxada (LP)
                                    </td>

                                    <td className="px-5 py-4 text-base font-medium text-[#2b211b]">
                                        {formatNumber(relaxedObjective)}
                                    </td>

                                    <td className="px-5 py-4 text-base font-medium text-[#2b211b]">
                                        {relaxedVariablesText}
                                    </td>

                                    <td className="px-5 py-4 text-base font-medium text-[#653018]">
                                        {relaxedSolutionIsInteger
                                            ? 'Ótima e inteira'
                                            : 'Ótima relaxada'}
                                    </td>
                                </tr>

                                <tr className="border-t border-[#eadccb] bg-[#fcfaf7]">
                                    <td className="px-5 py-4 text-base font-medium text-[#2b211b]">
                                        Inteira (IP)
                                    </td>

                                    <td className="px-5 py-4 text-base font-medium text-[#2b211b]">
                                        {formatNumber(integerObjective)}
                                    </td>

                                    <td className="px-5 py-4 text-base font-medium text-[#2b211b]">
                                        {integerVariablesText}
                                    </td>

                                    <td className="px-5 py-4 text-base font-semibold text-[#4cae62]">
                                        Solução inteira ótima
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <p className="mt-8 max-w-[58rem] text-base leading-relaxed text-[#2b211b]">
                    {relaxedSolutionIsInteger ? (
                        <>
                            A solução relaxada do problema já apresenta valores
                            inteiros, com valor ótimo{' '}
                            {formatNumber(relaxedObjective)} e variáveis{' '}
                            {relaxedVariablesText}. Portanto, essa solução
                            também atende à restrição de integralidade.
                        </>
                    ) : (
                        <>
                            A solução relaxada do problema produziu um valor
                            ótimo de {formatNumber(relaxedObjective)}, porém com
                            variáveis fracionárias. Aplicando o método Branch &
                            Bound, foi encontrada a melhor solução inteira
                            viável, com valor objetivo{' '}
                            {formatNumber(integerObjective)}, correspondente a{' '}
                            {integerVariablesText}. A diferença entre as
                            soluções representa o custo da restrição de
                            integralidade.
                        </>
                    )}
                </p>
            </section>
        </div>
    );
}

function IterationTable({ iteration, nextIteration, matrix, project }) {
    const displayRows = buildDisplayRows(matrix);
    const headers = buildVisibleHeaders(
        buildIterationHeaders(displayRows, project),
        displayRows
    );
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

    return {
        row: rowLabels?.[normalizedPivotRowIndex] || '-',
        column: headers?.[normalizedPivotColumnIndex] || '-',
        value: row[normalizedPivotColumnIndex],
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

function hasOnlyIntegerValues(variables) {
    const values = Object.values(variables || {})
        .map(Number)
        .filter(Number.isFinite);

    return (
        values.length > 0 &&
        values.every((value) => Math.abs(value - Math.round(value)) <= 1e-6)
    );
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
        data?.summary?.iterations,
    ];

    for (const candidate of candidates) {
        if (Array.isArray(candidate) && candidate.length > 0) {
            return candidate;
        }
    }

    return [];
}
