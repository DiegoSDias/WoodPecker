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
                                        {formatVariableInline(relaxedVariables) ||
                                            '-'}
                                    </td>

                                    <td className="px-5 py-4 text-base font-medium text-[#653018]">
                                        Ótimo local
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
                                        {formatVariableInline(integerVariables) ||
                                            '-'}
                                    </td>

                                    <td className="px-5 py-4 text-base font-semibold text-[#4cae62]">
                                        Região Viável
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </div>
    );
}

function IterationTable({ matrix, project }) {
    const displayRows = buildDisplayRows(matrix);
    const headers = buildIterationHeaders(displayRows, project);
    const rowLabels = buildIterationRowLabels(displayRows);

    return (
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
                                        className="px-5 py-4 text-base font-medium text-[#111111]"
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
