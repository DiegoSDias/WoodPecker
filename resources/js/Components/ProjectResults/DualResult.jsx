import {
    buildDisplayRows,
    buildIterationHeaders,
    buildIterationRowLabels,
    formatConstraint,
    formatDualConstraint,
    formatNumber,
    formatOptimizationTypeShort,
    formatTerm,
    getOppositeOptimizationType,
} from './projectResultsUtils';

export default function DualResult({ data, savedSolution, project }) {
    const primalProject = data?.primal?.project || project;

    const primalColumnNames = Array.isArray(data?.primal?.solution?.column_names)
        ? data.primal.solution.column_names
        : Array.isArray(data?.primal?.column_names)
          ? data.primal.column_names
          : [];

    const dualColumnNames = Array.isArray(data?.dual?.solution?.column_names)
        ? data.dual.solution.column_names
        : Array.isArray(data?.dual?.column_names)
          ? data.dual.column_names
          : [];

    const dualProblem = buildReadableDualProblem(
        primalProject,
        data?.dual?.problem || null
    );

    const primalIterations = Array.isArray(data?.primal?.solution?.iterations)
        ? data.primal.solution.iterations
        : [];

    const dualIterations = Array.isArray(data?.dual?.solution?.iterations)
        ? data.dual.solution.iterations
        : Array.isArray(data?.iterations)
          ? data.iterations
          : [];

    const primalObjectiveValue =
        data?.primal?.solution?.objective_value ??
        data?.solution?.objective_value ??
        savedSolution?.z_value;

    const dualObjectiveValue =
        data?.dual?.solution?.objective_value ??
        data?.solution?.objective_value ??
        savedSolution?.z_value;

    return (
        <div className="max-w-[64rem] space-y-8">
            <h1 className="font-inter text-[2.35rem] font-black leading-tight text-[#653018]">
                Problema Dual
            </h1>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <DualProblemCard
                    title="Primal (Original)"
                    type="primal"
                    project={primalProject}
                    solution={data?.primal?.solution}
                />

                <DualProblemCard
                    title="Dual (Transposto)"
                    type="dual"
                    problem={dualProblem}
                    primalProject={primalProject}
                    solution={data?.dual?.solution}
                />
            </div>

            <section>
                <h2 className="mb-6 font-inter text-2xl font-black text-[#653018]">
                    Iteração Dual
                </h2>

                {dualIterations.length > 0 ? (
                    <div className="space-y-8">
                        {dualIterations.map((iteration, index) => (
                            <IterationBlock
                                key={`dual-${iteration.iteration || index}-${index}`}
                                iteration={iteration}
                                previousIteration={dualIterations[index - 1]}
                                nextIteration={dualIterations[index + 1]}
                                project={dualProblem || primalProject}
                                columnNames={dualColumnNames}
                            />
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        title="Nenhuma iteração encontrada"
                        description="Não há iterações registradas para o problema dual."
                    />
                )}
            </section>

            <section>
                <h2 className="mb-6 font-inter text-2xl font-black text-[#653018]">
                    Iteração Primal
                </h2>

                {primalIterations.length > 0 ? (
                    <div className="space-y-8">
                        {primalIterations.map((iteration, index) => (
                            <IterationBlock
                                key={`primal-${iteration.iteration || index}-${index}`}
                                iteration={iteration}
                                previousIteration={primalIterations[index - 1]}
                                nextIteration={primalIterations[index + 1]}
                                project={primalProject}
                                columnNames={primalColumnNames}
                            />
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        title="Nenhuma iteração encontrada"
                        description="Não há iterações registradas para o problema primal."
                    />
                )}
            </section>

            <section>
                <h2 className="mb-6 font-inter text-2xl font-black text-[#653018]">
                    Solução
                </h2>

                <div className="rounded-2xl bg-white px-10 py-10 shadow-sm">
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                        <DualSymbolCard
                            label="Valor Ótimo Primal"
                            imageSrc="/images/green-z.png"
                            value={primalObjectiveValue}
                            valueClassName="text-[#2dae5f]"
                        />

                        <DualSymbolCard
                            label="Valor Ótimo Dual"
                            imageSrc="/images/w.png"
                            value={dualObjectiveValue}
                            valueClassName="text-[#ff6a21]"
                        />
                    </div>

                    <p className="mx-auto mt-8 max-w-[58rem] text-center text-base leading-relaxed text-[#2b211b]">
                        O problema dual produziu o mesmo valor ótimo do problema
                        primal (Z* = {formatNumber(primalObjectiveValue)} e W* ={' '}
                        {formatNumber(dualObjectiveValue)}), confirmando o
                        Teorema da Dualidade Forte da Programação Linear. Isso
                        indica que a solução encontrada é ótima e consistente
                        para ambos os modelos.
                    </p>
                </div>
            </section>
        </div>
    );
}

function DualProblemCard({
    title,
    type,
    project,
    problem,
    primalProject,
    solution,
}) {
    const isPrimal = type === 'primal';

    const objectiveCoefficients = isPrimal
        ? project?.objective_function?.coefficients ||
          project?.objectiveFunction?.coefficients ||
          []
        : problem?.objective_function?.coefficients || [];

    const constraints = isPrimal
        ? project?.constraints || []
        : problem?.constraints || [];

    const primalType =
        project?.optimization_type?.value ||
        project?.optimization_type ||
        primalProject?.optimization_type?.value ||
        primalProject?.optimization_type;

    const optimizationType = isPrimal
        ? primalType
        : problem?.optimization_type || getOppositeOptimizationType(primalType);

    const variablePrefix = isPrimal ? 'x' : 'y';
    const objectiveLetter = isPrimal ? 'Z' : 'W';

    return (
        <div className="overflow-hidden rounded-xl bg-white shadow-md">
            <div className="flex items-center gap-3 bg-[#eadccb] px-6 py-4">
                <img
                    src={isPrimal ? '/images/sum.png' : '/images/arrows.png'}
                    alt=""
                    className="h-6 w-6 object-contain"
                />

                <h3 className="font-inter text-xl font-black text-[#653018]">
                    {title}
                </h3>
            </div>

            <div className="px-6 py-6">
                {objectiveCoefficients.length > 0 ? (
                    <div className="rounded-lg bg-[#eadccb] px-5 py-3 text-center">
                        <p className="font-inter text-base font-black text-[#653018]">
                            {formatOptimizationTypeShort(optimizationType)}.{' '}
                            {objectiveLetter} ={' '}
                            {objectiveCoefficients
                                .map((coefficient, index) =>
                                    formatTerm(
                                        coefficient,
                                        `${variablePrefix}${index + 1}`,
                                        index
                                    )
                                )
                                .join(' ')}
                        </p>
                    </div>
                ) : (
                    <SmallEmptyText text="Não há função objetivo registrada." />
                )}

                <div className="mt-6 border-l border-[#c7a995] pl-4">
                    <p className="mb-3 font-inter text-sm font-black text-[#653018]">
                        Sujeito a:
                    </p>

                    {constraints.length > 0 ? (
                        <div className="space-y-2">
                            {constraints.map((constraint, index) => (
                                <p
                                    key={constraint.id || index}
                                    className="text-sm text-[#653018]"
                                >
                                    {isPrimal
                                        ? formatConstraint(constraint)
                                        : formatDualConstraint(constraint)}
                                </p>
                            ))}
                        </div>
                    ) : (
                        <SmallEmptyText text="Não há restrições registradas." />
                    )}
                </div>
            </div>
        </div>
    );
}

function buildReadableDualProblem(primalProject, dualProblem) {
    if (!primalProject || !dualProblem) {
        return dualProblem;
    }

    const primalConstraints = primalProject?.constraints || [];
    const primalObjective =
        primalProject?.objective_function?.coefficients ||
        primalProject?.objectiveFunction?.coefficients ||
        [];

    if (primalConstraints.length === 0 || primalObjective.length === 0) {
        return dualProblem;
    }

    const primalType =
        primalProject?.optimization_type?.value ||
        primalProject?.optimization_type ||
        primalProject?.optimizationType?.value ||
        primalProject?.optimizationType;

    const dualOptimizationType = getOppositeOptimizationType(primalType);
    const dualOperator = primalType === 'max' ? '>=' : '<=';

    return {
        ...dualProblem,
        optimization_type: dualOptimizationType || dualProblem.optimization_type,
        objective_function: {
            coefficients: primalConstraints.map(
                (constraint) => Number(constraint?.rhs_value) || 0
            ),
        },
        constraints: primalObjective.map((_, variableIndex) => ({
            coefficients: primalConstraints.map((constraint) =>
                Number(constraint?.coefficients?.[variableIndex] ?? 0)
            ),
            operator: dualOperator,
            rhs_value: Number(primalObjective[variableIndex] ?? 0),
        })),
    };
}

function DualSymbolCard({ label, imageSrc, value, valueClassName }) {
    return (
        <div className="rounded-xl bg-white px-8 py-8 text-center shadow-sm">
            <p className="font-inter text-base font-black text-[#653018]">
                {label}
            </p>

            <div
                className={`mt-5 flex items-center justify-center gap-4 font-inter text-4xl font-black ${valueClassName}`}
            >
                <img
                    src={imageSrc}
                    alt=""
                    className="h-12 w-auto object-contain"
                    draggable="false"
                />

                <span>=</span>

                <span>{formatNumber(value)}</span>
            </div>
        </div>
    );
}

function IterationBlock({
    iteration,
    previousIteration,
    nextIteration,
    project,
    columnNames,
}) {
    const phaseLabel = formatPhaseLabel(
        iteration?.phase_label || iteration?.phase || ''
    );

    return (
        <div>
            <div className="mb-4 flex items-center gap-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#653018] font-inter text-lg font-black text-white">
                    {iteration.iteration || '-'}
                </span>

                <h3 className="font-inter text-xl font-black text-[#653018]">
                    Iteração {iteration.iteration || '-'}
                    {phaseLabel ? (
                        <span className="ml-3 text-sm font-semibold text-[#8a5b33]">
                            {phaseLabel}
                        </span>
                    ) : null}
                </h3>
            </div>

            {Array.isArray(iteration.tableau) && iteration.tableau.length > 0 ? (
                <IterationTable
                    iteration={iteration}
                    previousIteration={previousIteration}
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

function IterationTable({
    iteration,
    previousIteration,
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
        nextIteration?.pivotRow,
        previousIteration?.pivot_row_index,
        previousIteration?.pivot_row,
        previousIteration?.pivotRowIndex,
        previousIteration?.pivotRow
    );

    const pivotColumnIndex = getPivotIndex(
        iteration?.pivot_column_index,
        iteration?.pivot_column,
        iteration?.pivotColumnIndex,
        iteration?.pivotColumn,
        nextIteration?.pivot_column_index,
        nextIteration?.pivot_column,
        nextIteration?.pivotColumnIndex,
        nextIteration?.pivotColumn,
        previousIteration?.pivot_column_index,
        previousIteration?.pivot_column,
        previousIteration?.pivotColumnIndex,
        previousIteration?.pivotColumn
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