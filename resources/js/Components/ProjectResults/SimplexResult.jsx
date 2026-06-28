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
    const iterations = Array.isArray(data.iterations) ? data.iterations : [];

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
                            project={project}
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

function SimplexIteration({ iteration, project }) {
    return (
        <div>
            <div className="mb-4 flex items-center gap-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#653018] font-inter text-lg font-black text-white">
                    {iteration.iteration || '-'}
                </span>

                <h2 className="font-inter text-xl font-black text-[#653018]">
                    Iteração {iteration.iteration || '-'}
                </h2>
            </div>

            {Array.isArray(iteration.tableau) && iteration.tableau.length > 0 ? (
                <IterationTable matrix={iteration.tableau} project={project} />
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