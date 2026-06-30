import {
    cleanVariables,
    extractResultData,
    formatConstraint,
    formatMethodName,
    formatNumber,
    formatOptimizationType,
    formatStatus,
    formatTerm,
    formatVariableInline,
    getBestOverviewSolution,
    getObjectiveValue,
    getOverviewVariables,
} from './projectResultsUtils';
import {
    buildFileBaseName,
    buildPrintDocument,
    buildPrintTable,
    escapeHtml,
    openPrintWindow,
} from './resultPdfUtils';

export default function OverviewResult({ project, solutions }) {
    const objectiveCoefficients =
        project?.objective_function?.coefficients ||
        project?.objectiveFunction?.coefficients ||
        [];

    const constraints = project?.constraints || [];
    const bestSolution = getBestOverviewSolution(solutions);
    const bestData = extractResultData(bestSolution);

    const objectiveValue = getObjectiveValue(bestSolution);
    const variables =
        getOverviewVariables(bestData) || getOverviewVariables(bestSolution);

    function handleDownloadPdf() {
        const html = buildOverviewPrintHtml({
            project,
            solution: bestSolution,
            data: bestData,
            objectiveValue,
            variables,
            constraints,
            objectiveCoefficients,
        });

        openPrintWindow(html);
    }

    return (
        <div className="max-w-[58rem] space-y-9">
            <h1 className="font-inter text-[2.25rem] font-black leading-tight text-[#653018]">
                Visão Geral
            </h1>

            {bestSolution ? (
                <OverviewHero
                    project={project}
                    solution={bestSolution}
                    objectiveValue={objectiveValue}
                />
            ) : (
                <EmptyState
                    title="Nenhuma solução encontrada"
                    description="Este projeto ainda não possui solução registrada."
                />
            )}

            <OverviewPanel title="Variáveis de Decisão">
                {variables && Object.keys(variables).length > 0 ? (
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                        {Object.entries(cleanVariables(variables)).map(
                            ([key, value]) => (
                                <DecisionVariableItem
                                    key={key}
                                    label={key}
                                    value={value}
                                />
                            )
                        )}
                    </div>
                ) : (
                    <SmallEmptyText text="Não há variáveis de decisão registradas para a visão geral." />
                )}
            </OverviewPanel>

            <OverviewPanel title="Restrições">
                {constraints.length > 0 ? (
                    <OverviewRestrictionsTable constraints={constraints} />
                ) : (
                    <SmallEmptyText text="Não há restrições registradas para este projeto." />
                )}
            </OverviewPanel>

            <OverviewSummary
                project={project}
                solution={bestSolution}
                objectiveValue={objectiveValue}
                variables={variables}
                objectiveCoefficients={objectiveCoefficients}
            />

            <DownloadPdfButton
                disabled={!bestSolution}
                onClick={handleDownloadPdf}
            />
        </div>
    );
}

function DownloadPdfButton({ disabled, onClick }) {
    return (
        <div className="flex justify-end">
            <button
                type="button"
                onClick={onClick}
                disabled={disabled}
                className="rounded-lg bg-[#733615] px-5 py-3 font-inter text-sm font-black text-white shadow-md transition hover:bg-[#5b2a10] disabled:cursor-not-allowed disabled:opacity-50"
            >
                Baixar PDF da Visão Geral
            </button>
        </div>
    );
}

function OverviewHero({ project, solution, objectiveValue }) {
    const data = extractResultData(solution);

    return (
        <div
            className="rounded-2xl bg-cover bg-center px-10 py-8 text-white shadow-md"
            style={{
                backgroundImage: "url('/images/wood-background.png')",
            }}
        >
            <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_18rem]">
                <div>
                    <div className="mb-8 flex items-center gap-3">
                        <img
                            src="/images/checkmark-circle-outline.png"
                            alt=""
                            className="h-6 w-6 object-contain"
                        />

                        <h2 className="font-inter text-3xl font-black">
                            Solução Encontrada
                        </h2>
                    </div>

                    <p className="font-inter text-lg font-black">
                        Valor Ótimo da Função Objetivo
                    </p>

                    <p className="mt-5 flex items-center gap-3 font-inter text-4xl font-black">
                        <img
                            src="/images/white-z.png"
                            alt="Z"
                            className="h-10 w-auto object-contain"
                        />

                        <span>=</span>

                        <span>{formatNumber(objectiveValue)}</span>
                    </p>
                </div>

                <div className="space-y-5 pt-5">
                    <p className="text-base">
                        <strong>Tipo:</strong>{' '}
                        {formatOptimizationType(project?.optimization_type)}
                    </p>

                    <p className="text-base">
                        <strong>Método:</strong>{' '}
                        {formatMethodName(solution?.method_used)}
                    </p>

                    <p className="text-base">
                        <strong>Status:</strong>{' '}
                        {formatOverviewStatus(solution, data)}
                    </p>
                </div>
            </div>
        </div>
    );
}

function DecisionVariableItem({ label, value }) {
    return (
        <div className="flex items-center justify-center gap-5">
            <span className="font-inter text-2xl font-black text-[#653018]">
                {label.toUpperCase()} =
            </span>

            <div className="min-w-[14rem] rounded-xl bg-white px-10 py-3 text-center shadow-md">
                <span className="font-inter text-2xl font-black text-[#111111]">
                    {formatNumber(value)}
                </span>
            </div>
        </div>
    );
}

function OverviewPanel({ title, children }) {
    return (
        <section className="overflow-hidden rounded-2xl bg-white shadow-md">
            <div className="bg-[#eadccb] px-7 py-4">
                <h2 className="font-inter text-2xl font-black text-[#653018]">
                    {title}
                </h2>
            </div>

            <div className="px-8 py-7">{children}</div>
        </section>
    );
}

function OverviewRestrictionsTable({ constraints }) {
    return (
        <div className="grid grid-cols-[1fr_1.2fr] gap-6 text-center">
            <div>
                <p className="mb-4 font-inter text-lg font-black text-[#653018]">
                    Restrição
                </p>

                <div className="space-y-4">
                    {constraints.map((_, index) => (
                        <p
                            key={index}
                            className="text-lg font-medium text-[#653018]"
                        >
                            R{index + 1}
                        </p>
                    ))}
                </div>
            </div>

            <div>
                <p className="mb-4 font-inter text-lg font-black text-[#653018]">
                    Expressão
                </p>

                <div className="space-y-4">
                    {constraints.map((constraint, index) => (
                        <p
                            key={constraint.id || index}
                            className="text-lg font-medium text-[#653018]"
                        >
                            {formatConstraint(constraint)}
                        </p>
                    ))}
                </div>
            </div>
        </div>
    );
}

function OverviewSummary({
    project,
    solution,
    objectiveValue,
    variables,
    objectiveCoefficients,
}) {
    if (!solution) {
        return null;
    }

    return (
        <div>
            <h2 className="mb-4 font-inter text-xl font-black text-[#653018]">
                Resumo da Resolução
            </h2>

            <p className="max-w-[54rem] text-lg leading-relaxed text-[#2b211b]">
                Foi encontrada uma solução pelo método{' '}
                {formatMethodName(solution.method_used)} para o problema de{' '}
                {formatOptimizationType(project?.optimization_type).toLowerCase()}
                . O valor da função objetivo é {formatNumber(objectiveValue)}
                {variables && Object.keys(variables).length > 0
                    ? `, com ${formatVariableInline(variables)}.`
                    : '.'}
            </p>

            {objectiveCoefficients.length > 0 && (
                <p className="mt-3 max-w-[54rem] text-lg leading-relaxed text-[#2b211b]">
                    Função objetivo:{' '}
                    {formatOptimizationType(project?.optimization_type)} Z ={' '}
                    {objectiveCoefficients
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

function formatOverviewStatus(solution, data) {
    const status = data?.status;

    if (status !== 'multiple') {
        return formatStatus(status);
    }

    if (hasConfirmedMultipleSolution(solution, data)) {
        return formatStatus(status);
    }

    return formatStatus('optimal');
}

function hasConfirmedMultipleSolution(solution, data) {
    if (!data) {
        return false;
    }

    const method = solution?.method_used;

    if (method === 'graphical') {
        if (
            data.has_multiple_solution === true ||
            data.hasMultipleSolution === true
        ) {
            return true;
        }

        if (data.optimal_segment || data.optimalSegment) {
            return true;
        }

        const optimalVertices = data.optimal_vertices || data.optimalVertices;
        if (Array.isArray(optimalVertices) && optimalVertices.length >= 2) {
            return true;
        }
    }

    const alternatives = data.alternative_solutions || data.alternativeSolutions;
    if (!Array.isArray(alternatives) || alternatives.length === 0) {
        return false;
    }

    const currentVariables = cleanVariables(
        getOverviewVariables(data) || getOverviewVariables(solution) || {}
    );

    return alternatives.some((alternative) =>
        hasDifferentVariables(currentVariables, cleanVariables(alternative))
    );
}

function hasDifferentVariables(currentVariables, alternativeVariables) {
    const keys = Object.keys({
        ...currentVariables,
        ...alternativeVariables,
    });

    if (keys.length === 0) {
        return false;
    }

    return keys.some((key) => {
        const currentValue = Number(currentVariables[key] ?? 0);
        const alternativeValue = Number(alternativeVariables[key] ?? 0);

        return Math.abs(currentValue - alternativeValue) > 1e-6;
    });
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

function buildOverviewPrintHtml({
    project,
    solution,
    data,
    objectiveValue,
    variables,
    constraints,
    objectiveCoefficients,
}) {
    const projectName = project?.title || project?.name || '-';
    const cleanDecisionVariables = cleanVariables(variables || {});
    const variablesRows = Object.entries(cleanDecisionVariables).map(
        ([variable, value]) => [variable.toUpperCase(), formatNumber(value)]
    );
    const restrictionsRows = constraints.map((constraint, index) => [
        `R${index + 1}`,
        formatConstraint(constraint),
    ]);
    const objectiveText =
        objectiveCoefficients.length > 0
            ? `${formatOptimizationType(project?.optimization_type)} Z = ${objectiveCoefficients
                  .map((coefficient, index) =>
                      formatTerm(coefficient, `x${index + 1}`, index)
                  )
                  .join(' ')}`
            : '-';
    const variablesText =
        variablesRows.length > 0
            ? formatVariableInline(cleanDecisionVariables)
            : '-';
    const contentHtml = `
        <h2>Variáveis de Decisão</h2>
        ${
            variablesRows.length > 0
                ? buildPrintTable(['Variável', 'Valor'], variablesRows)
                : '<p>Não há variáveis de decisão registradas.</p>'
        }

        <h2>Restrições</h2>
        ${
            restrictionsRows.length > 0
                ? buildPrintTable(['Restrição', 'Expressão'], restrictionsRows)
                : '<p>Não há restrições registradas.</p>'
        }
    `;
    const summaryHtml = `
        <h2>Resumo da Resolução</h2>
        <p>Foi encontrada uma solução pelo método ${escapeHtml(
            formatMethodName(solution?.method_used)
        )} para o problema de ${escapeHtml(
        formatOptimizationType(project?.optimization_type).toLowerCase()
    )}. O valor da função objetivo é ${escapeHtml(
        formatNumber(objectiveValue)
    )}${variablesText !== '-' ? `, com ${escapeHtml(variablesText)}.` : '.'}</p>
    `;

    return buildPrintDocument({
        documentTitle: `${buildFileBaseName(projectName)}-visao-geral`,
        title: 'Resultado da Visão Geral',
        metaRows: [
            ['Projeto', projectName],
            ['Tipo', formatOptimizationType(project?.optimization_type)],
            ['Método', formatMethodName(solution?.method_used)],
            ['Status', formatOverviewStatus(solution, data)],
            ['Valor ótimo', formatNumber(objectiveValue)],
            ['Função objetivo', objectiveText],
        ],
        contentHtml,
        summaryHtml,
    });
}
