import {
    extractResultData,
    formatNumber,
    formatOptimizationType,
    getLatestSolutionByMethod,
    getObjectiveValue,
    getOverviewVariables,
} from './projectResultsUtils';

export default function SensitivityResult({
    data = {},
    project,
    solutions = [],
}) {
    const sensitivityData = normalizeSensitivityData(data, project, solutions);

    if (!hasSensitivityData(sensitivityData)) {
        return (
            <div className="max-w-[64rem] space-y-8">
                <h1 className="font-inter text-[2.35rem] font-black leading-tight text-[#653018]">
                    Análise de Sensibilidade
                </h1>

                <div className="rounded-2xl bg-[#fffaf4] px-8 py-20 text-center shadow-md">
                    <p className="font-inter text-2xl font-black text-[#653018]">
                        Resultado ainda não disponível
                    </p>

                    <p className="mx-auto mt-3 max-w-[36rem] text-base leading-relaxed text-[#777777]">
                        Execute a análise de sensibilidade para visualizar preço
                        sombra, custos reduzidos e intervalos de variação.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[64rem] space-y-10">
            <h1 className="font-inter text-[2.35rem] font-black leading-tight text-[#653018]">
                Análise de Sensibilidade
            </h1>

            <SensitivitySummaryCard data={sensitivityData} project={project} />

            <TableSection
                title="Preço Sombra"
                description="O preço sombra representa a variação no valor ótimo da função objetivo causada pelo aumento de uma unidade no lado direito da restrição."
                columns={['Restrição', 'Preço Sombra', 'Status']}
                rows={sensitivityData.shadowPrices}
                emptyText="Nenhum preço sombra foi encontrado para este resultado."
                renderRow={(row, index) => (
                    <tr key={row.restriction || index}>
                        <TableCell>
                            {normalizeRestrictionName(
                                row.restriction,
                                index
                            )}
                        </TableCell>

                        <TableCell>{formatNumber(row.shadowPrice)}</TableCell>

                        <TableCell>
                            <StatusText active={row.status === 'Ativa'}>
                                {row.status || '-'}
                            </StatusText>
                        </TableCell>
                    </tr>
                )}
            />

            <TableSection
                title="Custos Reduzidos"
                description="O custo reduzido indica quanto o coeficiente da função objetivo deve melhorar para que uma variável não básica entre na solução ótima."
                columns={['Variável', 'Valor', 'Custo Reduzido', 'Interpretação']}
                rows={sensitivityData.reducedCosts}
                emptyText="Nenhum custo reduzido foi encontrado para este resultado."
                renderRow={(row, index) => (
                    <tr key={row.variable || index}>
                        <TableCell>
                            {normalizeVariableName(row.variable, index)}
                        </TableCell>

                        <TableCell>{formatNumber(row.value)}</TableCell>

                        <TableCell>
                            <StrongNumber>
                                {formatNumber(row.reducedCost)}
                            </StrongNumber>
                        </TableCell>

                        <TableCell>{row.interpretation || '-'}</TableCell>
                    </tr>
                )}
            />

            <TableSection
                title="Intervalos de Sensibilidade"
                columns={['Restrição', 'RHS Atual', 'Mínimo', 'Máximo', 'Folga']}
                rows={sensitivityData.ranges}
                emptyText="Nenhum intervalo de sensibilidade foi encontrado para este resultado."
                renderRow={(row, index) => (
                    <tr key={row.restriction || index}>
                        <TableCell>
                            {normalizeRestrictionName(
                                row.restriction,
                                index
                            )}
                        </TableCell>

                        <TableCell>{formatNumber(row.currentRhs)}</TableCell>
                        <TableCell>{formatNumber(row.minimum)}</TableCell>
                        <TableCell>{formatNumber(row.maximum)}</TableCell>
                        <TableCell>{formatNumber(row.slack)}</TableCell>
                    </tr>
                )}
            />

            <section>
                <h2 className="font-inter text-[1.7rem] font-black text-[#653018]">
                    Resumo da Resolução
                </h2>

                <p className="mt-6 text-base leading-relaxed text-[#333333]">
                    {sensitivityData.summary}
                </p>
            </section>
        </div>
    );
}

function SensitivitySummaryCard({ data, project }) {
    return (
        <section
            className="overflow-hidden rounded-2xl bg-cover bg-center px-12 py-9 text-white shadow-md"
            style={{
                backgroundImage: "url('/images/wood-background.png')",
            }}
        >
            <div className="grid gap-8 lg:grid-cols-2">
                <div>
                    <p className="font-inter text-xl font-black">
                        Variáveis Ótimas:
                    </p>

                    <div className="mt-4 space-y-2 text-lg">
                        {data.optimalVariables.length > 0 ? (
                            data.optimalVariables.map(([variable, value]) => (
                                <p key={variable}>
                                    {normalizeVariableName(variable)} ={' '}
                                    {formatNumber(value)}
                                </p>
                            ))
                        ) : (
                            <p>-</p>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-lg">
                        <strong>Tipo:</strong>{' '}
                        {formatOptimizationType(
                            project?.optimization_type?.value ||
                                project?.optimization_type
                        )}
                    </p>

                    <p className="text-lg">
                        <strong>Restrições Ativas:</strong>{' '}
                        {data.activeRestrictions.length > 0
                            ? data.activeRestrictions
                                  .map((item, index) =>
                                      normalizeRestrictionName(item, index)
                                  )
                                  .join(', ')
                            : '-'}
                    </p>

                    <p className="text-lg">
                        <strong>Restrições com Folga:</strong>{' '}
                        {data.slackRestrictions.length > 0
                            ? data.slackRestrictions
                                  .map((item, index) =>
                                      normalizeRestrictionName(item, index)
                                  )
                                  .join(', ')
                            : '-'}
                    </p>
                </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-center">
                <span className="font-inter text-xl font-black">
                    Valor Ótimo atual:
                </span>

                <span className="flex items-center gap-3 font-inter text-[2.3rem] font-black">
                    <img
                        src="/images/Z.png"
                        alt="Z"
                        className="h-14 w-14 object-contain brightness-0 invert"
                    />

                    <span>=</span>

                    <span>{formatNumber(data.objectiveValue)}</span>
                </span>
            </div>
        </section>
    );
}

function TableSection({
    title,
    description = '',
    columns,
    rows,
    emptyText,
    renderRow,
}) {
    return (
        <section>
            <h2 className="font-inter text-[1.7rem] font-black text-[#653018]">
                {title}
            </h2>

            <div className="mt-7 overflow-hidden rounded-xl bg-white shadow-sm">
                <table className="w-full border-collapse text-center">
                    <thead>
                        <tr className="bg-[#eadccb]">
                            {columns.map((column) => (
                                <th
                                    key={column}
                                    className="px-5 py-4 font-inter text-lg font-black text-[#653018]"
                                >
                                    {column}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {rows.length > 0 ? (
                            rows.map(renderRow)
                        ) : (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="px-5 py-8 text-sm text-[#777777]"
                                >
                                    {emptyText}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {description && (
                <p className="mt-6 text-base leading-relaxed text-[#333333]">
                    {description}
                </p>
            )}
        </section>
    );
}

function TableCell({ children }) {
    return (
        <td className="border-t border-[#eadccb] px-5 py-4 text-sm text-[#333333]">
            {children}
        </td>
    );
}

function StrongNumber({ children }) {
    return (
        <span className="font-inter font-black text-[#653018]">
            {children}
        </span>
    );
}

function StatusText({ children, active }) {
    return (
        <span
            className={`font-inter font-black ${
                active ? 'text-[#834A2A]' : 'text-[#834A2A]'
            }`}
        >
            {children}
        </span>
    );
}

function normalizeSensitivityData(data, project, solutions) {
    const source = extractSensitivitySource(data);
    const auxiliarySolutionData = getAuxiliarySolutionData(solutions);

    const optimalVariables = normalizeOptimalVariables(
        source,
        data,
        auxiliarySolutionData
    );

    const objectiveValue = normalizeObjectiveValue(
        source,
        data,
        auxiliarySolutionData
    );

    const shadowPrices = normalizeShadowPrices(source, project);
    const reducedCosts = normalizeReducedCosts(source, optimalVariables);
    const ranges = normalizeRanges(source, project, shadowPrices);

    const activeRestrictions = normalizeRestrictionList(
        source?.active_constraints ||
            source?.active_restrictions ||
            source?.binding_constraints ||
            source?.binding_restrictions
    );

    const slackRestrictions = normalizeRestrictionList(
        source?.slack_constraints ||
            source?.slack_restrictions ||
            source?.non_binding_constraints ||
            source?.non_binding_restrictions
    );

    const inferredActiveRestrictions =
        activeRestrictions.length > 0
            ? activeRestrictions
            : shadowPrices
                  .filter((row) => row.status === 'Ativa')
                  .map((row) => row.restriction);

    const inferredSlackRestrictions =
        slackRestrictions.length > 0
            ? slackRestrictions
            : shadowPrices
                  .filter((row) => row.status === 'Folga')
                  .map((row) => row.restriction);

    return {
        optimalVariables,
        objectiveValue,
        shadowPrices,
        reducedCosts,
        ranges,
        activeRestrictions: inferredActiveRestrictions,
        slackRestrictions: inferredSlackRestrictions,
        summary: normalizeSummary({
            source,
            optimalVariables,
            objectiveValue,
            activeRestrictions: inferredActiveRestrictions,
            slackRestrictions: inferredSlackRestrictions,
        }),
    };
}

function getAuxiliarySolutionData(solutions) {
    const preferredSolution =
        getLatestSolutionByMethod(solutions, 'simplex') ||
        getLatestSolutionByMethod(solutions, 'integer') ||
        getLatestSolutionByMethod(solutions, 'graphical') ||
        getLatestSolutionByMethod(solutions, 'dual') ||
        null;

    if (!preferredSolution) {
        return {};
    }

    const resultData = extractResultData(preferredSolution) || {};

    return {
        solution: preferredSolution,
        resultData,
        variables: getOverviewVariables(resultData),
        objectiveValue: getObjectiveValue(preferredSolution),
    };
}

function extractSensitivitySource(data) {
    if (!data || typeof data !== 'object') {
        return {};
    }

    return (
        data.sensitivity_analysis ||
        data.sensitivity ||
        data.analysis ||
        data.result ||
        data.solution ||
        data
    );
}

function normalizeOptimalVariables(source, data, auxiliarySolutionData) {
    const auxiliaryVariables = normalizeVariableEntries(
        auxiliarySolutionData?.variables
    );

    if (auxiliaryVariables.length > 0) {
        return auxiliaryVariables;
    }

    const candidates = [
        source?.optimal_variables,
        source?.decision_variables,
        source?.primal_variables,
        source?.variables,
        source?.solution?.variables,
        source?.optimal_solution?.variables,
        source?.optimal_solution,
        data?.optimal_solution?.variables,
        data?.optimal_solution,
        data?.variables,
    ];

    for (const candidate of candidates) {
        const variables = normalizeVariableEntries(candidate);

        if (variables.length > 0) {
            return variables;
        }
    }

    return [];
}

function normalizeVariableEntries(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return [];
    }

    return Object.entries(value)
        .filter(([key, item]) => /^x\d+$/i.test(key) && isNumericValue(item))
        .map(([key, item]) => [key.toUpperCase(), Number(item)]);
}

function normalizeObjectiveValue(source, data, auxiliarySolutionData) {
    const auxiliaryValue = Number(auxiliarySolutionData?.objectiveValue);

    if (Number.isFinite(auxiliaryValue)) {
        return auxiliaryValue;
    }

    const candidates = [
        source?.objective_value,
        source?.optimal_value,
        source?.z_value,
        source?.z,
        source?.optimal_solution?.objective_value,
        source?.optimal_solution?.z,
        data?.objective_value,
        data?.optimal_value,
        data?.z_value,
        data?.z,
        data?.optimal_solution?.objective_value,
        data?.optimal_solution?.z,
    ];

    for (const candidate of candidates) {
        const number = Number(candidate);

        if (Number.isFinite(number)) {
            return number;
        }
    }

    return null;
}

function normalizeShadowPrices(source, project) {
    const raw =
        source?.shadow_prices ||
        source?.shadowPrices ||
        source?.dual_values ||
        source?.dualValues ||
        source?.restrictions_shadow_prices ||
        [];

    const rows = normalizeArrayRows(raw).map((row, index) => {
        const restriction =
            row.restriction ||
            row.constraint ||
            row.name ||
            row.label ||
            `R${index + 1}`;

        const shadowPrice =
            row.shadow_price ??
            row.shadowPrice ??
            row.price ??
            row.value ??
            row.dual_value ??
            row.dualValue ??
            0;

        const slack =
            row.slack ??
            row.folga ??
            row.remaining ??
            row.surplus ??
            null;

        return {
            restriction: normalizeRestrictionName(restriction, index),
            shadowPrice,
            status: normalizeRestrictionStatus(row.status, slack),
        };
    });

    if (rows.length > 0) {
        return rows;
    }

    return normalizeProjectConstraints(project).map((constraint, index) => ({
        restriction: `R${index + 1}`,
        shadowPrice: 0,
        status: normalizeRestrictionStatus(null, constraint.slack),
    }));
}

function normalizeReducedCosts(source, optimalVariables) {
    const raw =
        source?.reduced_costs ||
        source?.reducedCosts ||
        source?.costs_reduced ||
        source?.variables_reduced_costs ||
        [];

    const rows = normalizeArrayRows(raw).map((row, index) => {
        const variable =
            row.variable ||
            row.name ||
            row.label ||
            `X${index + 1}`;

        const value =
            row.value ??
            row.variable_value ??
            row.variableValue ??
            row.solution_value ??
            0;

        const reducedCost =
            row.reduced_cost ??
            row.reducedCost ??
            row.cost ??
            row.value_reduced ??
            0;

        return {
            variable: normalizeVariableName(variable, index),
            value,
            reducedCost,
            interpretation:
                row.interpretation ||
                row.status ||
                inferReducedCostInterpretation(value, reducedCost),
        };
    });

    if (rows.length > 0) {
        return rows;
    }

    return optimalVariables.map(([variable, value]) => ({
        variable,
        value,
        reducedCost: 0,
        interpretation: Number(value) > 0 ? 'Variável básica' : 'Fora da base',
    }));
}

function normalizeRanges(source, project, shadowPrices) {
    const raw =
        source?.sensitivity_ranges ||
        source?.ranges ||
        source?.rhs_ranges ||
        source?.rhsRanges ||
        source?.intervals ||
        [];

    const rows = normalizeArrayRows(raw).map((row, index) => ({
        restriction: normalizeRestrictionName(
            row.restriction ||
                row.constraint ||
                row.name ||
                row.label ||
                `R${index + 1}`,
            index
        ),
        currentRhs:
            row.current_rhs ??
            row.currentRhs ??
            row.rhs ??
            row.rhs_value ??
            row.current ??
            null,
        minimum:
            row.minimum ??
            row.min ??
            row.lower_bound ??
            row.lowerBound ??
            row.allowable_min ??
            null,
        maximum:
            row.maximum ??
            row.max ??
            row.upper_bound ??
            row.upperBound ??
            row.allowable_max ??
            null,
        slack:
            row.slack ??
            row.folga ??
            row.remaining ??
            null,
    }));

    if (rows.length > 0) {
        return rows;
    }

    const projectConstraints = normalizeProjectConstraints(project);

    if (projectConstraints.length > 0) {
        return projectConstraints.map((constraint, index) => ({
            restriction: `R${index + 1}`,
            currentRhs: constraint.rhs,
            minimum: null,
            maximum: null,
            slack:
                shadowPrices[index]?.status === 'Folga'
                    ? constraint.slack
                    : 0,
        }));
    }

    return [];
}

function normalizeSummary({
    source,
    optimalVariables,
    objectiveValue,
    activeRestrictions,
    slackRestrictions,
}) {
    if (source?.summary || source?.resolution_summary) {
        return source.summary || source.resolution_summary;
    }

    const variablesText =
        optimalVariables.length > 0
            ? optimalVariables
                  .map(
                      ([variable, value]) =>
                          `${variable.toLowerCase()} = ${formatNumber(value)}`
                  )
                  .join(', ')
            : 'sem variáveis ótimas identificadas';

    const activeText =
        activeRestrictions.length > 0
            ? activeRestrictions
                  .map((item, index) =>
                      normalizeRestrictionName(item, index)
                  )
                  .join(', ')
            : 'nenhuma restrição ativa identificada';

    const slackText =
        slackRestrictions.length > 0
            ? slackRestrictions
                  .map((item, index) =>
                      normalizeRestrictionName(item, index)
                  )
                  .join(', ')
            : 'nenhuma restrição com folga identificada';

    return `A solução ótima encontrada apresenta valor Z = ${formatNumber(
        objectiveValue
    )}, com ${variablesText}. As restrições ativas são ${activeText}, enquanto as restrições com folga são ${slackText}. Os preços sombra, custos reduzidos e intervalos apresentados indicam como alterações nos recursos e coeficientes podem impactar a solução ótima.`;
}

function normalizeArrayRows(value) {
    if (Array.isArray(value)) {
        return value;
    }

    if (value && typeof value === 'object') {
        return Object.entries(value).map(([key, item]) => ({
            ...(typeof item === 'object' && item !== null
                ? item
                : { value: item }),
            name: key,
        }));
    }

    return [];
}

function normalizeRestrictionList(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.map((item, index) => {
        if (typeof item === 'string') {
            return normalizeRestrictionName(item, index);
        }

        return normalizeRestrictionName(
            item?.name || item?.restriction || item?.constraint || `R${index + 1}`,
            index
        );
    });
}

function normalizeRestrictionName(value, index = 0) {
    if (!value) {
        return `R${index + 1}`;
    }

    const text = String(value).trim();

    const yMatch = text.match(/^y(\d+)$/i);

    if (yMatch) {
        return `R${yMatch[1]}`;
    }

    const rMatch = text.match(/^r(\d+)$/i);

    if (rMatch) {
        return `R${rMatch[1]}`;
    }

    const numberMatch = text.match(/\d+/);

    if (
        normalizeText(text).includes('constraint') ||
        normalizeText(text).includes('restricao')
    ) {
        return numberMatch ? `R${numberMatch[0]}` : `R${index + 1}`;
    }

    return text.toUpperCase();
}

function normalizeVariableName(value, index = 0) {
    if (!value) {
        return `X${index + 1}`;
    }

    const text = String(value).trim();
    const xMatch = text.match(/^x(\d+)$/i);

    if (xMatch) {
        return `X${xMatch[1]}`;
    }

    return text.toUpperCase();
}

function normalizeRestrictionStatus(status, slack) {
    if (status) {
        const normalized = String(status).toLowerCase();

        if (
            normalized.includes('ativa') ||
            normalized.includes('active') ||
            normalized.includes('binding')
        ) {
            return 'Ativa';
        }

        if (
            normalized.includes('folga') ||
            normalized.includes('slack') ||
            normalized.includes('non')
        ) {
            return 'Folga';
        }
    }

    const slackNumber = Number(slack);

    if (Number.isFinite(slackNumber) && Math.abs(slackNumber) > 0.0001) {
        return 'Folga';
    }

    return 'Ativa';
}

function inferReducedCostInterpretation(value, reducedCost) {
    const valueNumber = Number(value);
    const reducedCostNumber = Number(reducedCost);

    if (Number.isFinite(valueNumber) && Math.abs(valueNumber) > 0.0001) {
        return 'Variável básica';
    }

    if (
        Number.isFinite(reducedCostNumber) &&
        Math.abs(reducedCostNumber) > 0.0001
    ) {
        return 'Fora da base';
    }

    return 'Variável básica';
}

function normalizeProjectConstraints(project) {
    const constraints = Array.isArray(project?.constraints)
        ? project.constraints
        : [];

    return constraints.map((constraint) => ({
        rhs: constraint?.rhs_value ?? null,
        slack: constraint?.slack ?? null,
    }));
}

function hasSensitivityData(data) {
    return (
        data.optimalVariables.length > 0 ||
        data.shadowPrices.length > 0 ||
        data.reducedCosts.length > 0 ||
        data.ranges.length > 0 ||
        data.objectiveValue !== null
    );
}

function isNumericValue(value) {
    return Number.isFinite(Number(value));
}

function normalizeText(value) {
    return String(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}