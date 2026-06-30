export function extractProject(responseData) {
    return (
        responseData?.data?.project ||
        responseData?.project ||
        responseData?.data ||
        null
    );
}

export function extractSolutions(responseData) {
    const solutions =
        responseData?.data?.solutions ||
        responseData?.solutions ||
        responseData?.data ||
        [];

    return Array.isArray(solutions) ? solutions : [];
}

export function extractResultData(result) {
    if (!result) {
        return null;
    }

    let current = result;
    let guard = 0;

    while (current && typeof current === 'object' && guard < 5) {
        guard += 1;

        if (current.variables_result) {
            current = current.variables_result;
            continue;
        }

        if (current.data && typeof current.data === 'object') {
            current = current.data;
            continue;
        }

        break;
    }

    return current;
}

export function getLatestSolutionByMethod(solutions, method) {
    if (!Array.isArray(solutions) || method === 'overview') {
        return null;
    }

    return (
        [...solutions]
            .filter((solution) => solution.method_used === method)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] ||
        null
    );
}

export function getBestOverviewSolution(solutions) {
    if (!Array.isArray(solutions) || solutions.length === 0) {
        return null;
    }

    const graphicalSolution = getLatestSolutionByMethod(solutions, 'graphical');

    if (hasConfirmedMultipleResult(graphicalSolution)) {
        return graphicalSolution;
    }

    return (
        getLatestSolutionByMethod(solutions, 'simplex') ||
        getLatestSolutionByMethod(solutions, 'integer') ||
        graphicalSolution ||
        getLatestSolutionByMethod(solutions, 'dual') ||
        solutions[0]
    );
}

function hasConfirmedMultipleResult(solution) {
    if (!solution || solution.method_used !== 'graphical') {
        return false;
    }

    const data = extractResultData(solution);

    if (!data) {
        return false;
    }

    if (data.has_multiple_solution === true || data.hasMultipleSolution === true) {
        return true;
    }

    if (data.optimal_segment || data.optimalSegment) {
        return true;
    }

    const optimalVertices = data.optimal_vertices || data.optimalVertices;

    return Array.isArray(optimalVertices) && optimalVertices.length >= 2;
}

export function getObjectiveValue(solution) {
    const data = extractResultData(solution);

    return (
        data?.objective_value ??
        data?.optimal_solution?.objective_value ??
        data?.best_solution?.objective_value ??
        data?.primal_solution?.objective_value ??
        data?.solution?.objective_value ??
        data?.solution?.z ??
        data?.solution?.objective ??
        solution?.z_value
    );
}

export function getOverviewVariables(data) {
    if (!data) {
        return null;
    }

    const candidates = [
        data.primal_solution,
        data.optimal_solution,
        data.relaxed_solution,
        data.integer_solution,
        data.lp_solution,
        data.ip_solution,
        data.primal,
        data.dual,
        data.best_solution?.variables,
        data.best_solution?.solution,
        data.solution?.primal_solution,
        data.solution?.relaxed_solution,
        data.solution?.integer_solution,
        data.solution?.solution,
        data.solution?.variables,
        data.solution,
        data.variables,
        data.variables_result,
    ];

    for (const candidate of candidates) {
        const normalized = findDecisionVariables(candidate);
        if (Object.keys(normalized).length > 0) {
            return normalized;
        }
    }

    return null;
}

export function cleanVariables(variables) {
    if (!variables || typeof variables !== 'object' || Array.isArray(variables)) {
        return {};
    }

    return Object.entries(variables).reduce((accumulator, [key, value]) => {
        if (/^[xy]\d+$/i.test(key)) {
            accumulator[key] = value;
        }

        return accumulator;
    }, {});
}

export function findDecisionVariables(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {};
    }

    const direct = cleanVariables(value);
    if (Object.keys(direct).length > 0) {
        return direct;
    }

    const nestedCandidates = [
        value.solution,
        value.variables,
        value.primal_solution,
        value.relaxed_solution,
        value.integer_solution,
        value.lp_solution,
        value.ip_solution,
        value.primal,
        value.dual,
        value.best_solution?.variables,
        value.best_solution?.solution,
        value.variables_result,
        value.data,
    ];

    for (const nestedCandidate of nestedCandidates) {
        const nested = findDecisionVariables(nestedCandidate);
        if (Object.keys(nested).length > 0) {
            return nested;
        }
    }

    return {};
}

export function getOppositeOptimizationType(type) {
    if (type === 'max') {
        return 'min';
    }

    if (type === 'min') {
        return 'max';
    }

    return null;
}

export function formatOptimizationType(type) {
    if (!type) {
        return '-';
    }

    if (type === 'max') {
        return 'Maximização';
    }

    if (type === 'min') {
        return 'Minimização';
    }

    return String(type);
}

export function formatOptimizationTypeShort(type) {
    if (!type) {
        return '-';
    }

    if (type === 'max') {
        return 'MAX';
    }

    if (type === 'min') {
        return 'MIN';
    }

    return String(type).toUpperCase();
}

export function formatMethodName(method) {
    const labels = {
        simplex: 'Simplex',
        graphical: 'Método Gráfico',
        integer: 'Solução Inteira',
        dual: 'Problema Dual',
        sensitivity: 'Análise de Sensibilidade',
    };

    return labels[method] || method || '-';
}

export function formatStatus(status) {
    if (!status) {
        return 'Solução salva';
    }

    const labels = {
        optimal: 'Solução ótima encontrada',
        multiple: 'Solução múltipla encontrada',
        infeasible: 'Problema inviável',
        unbounded: 'Problema ilimitado',
        integer: 'Região Viável',
    };

    return labels[status] || status;
}

export function formatTerm(coefficient, variable, index) {
    const number = Number(coefficient);
    const absolute = Math.abs(number);
    const sign = number < 0 ? '-' : index === 0 ? '' : '+';

    return `${sign} ${formatNumber(absolute)}${variable}`.trim();
}

export function formatConstraint(constraint) {
    const coefficients = constraint.coefficients || [];

    const leftSide = coefficients
        .map((coefficient, index) =>
            formatTerm(coefficient, `x${index + 1}`, index)
        )
        .join(' ');

    return `${leftSide} ${constraint.operator || ''} ${formatNumber(
        constraint.rhs_value
    )}`;
}

export function formatDualConstraint(constraint) {
    const coefficients = constraint.coefficients || [];

    const leftSide = coefficients
        .map((coefficient, index) =>
            formatTerm(coefficient, `y${index + 1}`, index)
        )
        .join(' ');

    return `${leftSide} ${constraint.operator || ''} ${formatNumber(
        constraint.rhs_value
    )}`;
}

export function formatVariableInline(variables) {
    const entries = Object.entries(findDecisionVariables(variables || {}));

    return entries
        .map(([key, value]) => `${key} = ${formatNumber(value)}`)
        .join(', ');
}

export function formatNumber(value) {
    if (value === null || value === undefined || value === '') {
        return '-';
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return String(value);
    }

    const roundedInteger = Math.round(number);

    if (Math.abs(number - roundedInteger) < 0.0001) {
        return new Intl.NumberFormat('pt-BR', {
            maximumFractionDigits: 0,
        }).format(roundedInteger);
    }

    const roundedValue = Math.round(number * 100) / 100;

    if (Object.is(roundedValue, -0)) {
        return '0';
    }

    return new Intl.NumberFormat('pt-BR', {
        maximumFractionDigits: 2,
    }).format(roundedValue);
}

export function formatDateTimeShort(value) {
    if (!value) {
        return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '-';
    }

    return (
        date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }) +
        '\n' +
        date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
        })
    );
}

export function buildDisplayRows(matrix) {
    if (!Array.isArray(matrix) || matrix.length === 0) {
        return [];
    }

    if (matrix.length <= 1) {
        return matrix;
    }

    const objectiveRow = matrix[matrix.length - 1];
    const constraintRows = matrix.slice(0, matrix.length - 1);

    return [objectiveRow, ...constraintRows];
}

export function buildIterationRowLabels(rows) {
    if (!Array.isArray(rows)) {
        return [];
    }

    return rows.map((_, index) => {
        if (index === 0) {
            return 'Z';
        }

        return `X${index}`;
    });
}

export function buildIterationHeaders(rows, project) {
    const columnCount = rows?.[0]?.length || 0;

    if (columnCount === 0) {
        return [];
    }

    const variableCount = getProjectVariableCount(project, rows);
    const headers = [];

    for (let index = 1; index <= variableCount; index += 1) {
        headers.push(`X${index}`);
    }

    let slackIndex = 1;

    while (headers.length < columnCount - 1) {
        headers.push(`F${slackIndex}`);
        slackIndex += 1;
    }

    headers.push('RHS');

    return headers;
}

function getProjectVariableCount(project, rows) {
    const projectVariableCount =
        Number(project?.num_variables) ||
        Number(project?.objective_function?.coefficients?.length) ||
        Number(project?.objectiveFunction?.coefficients?.length) ||
        0;

    const columnCount = rows?.[0]?.length || 0;

    if (projectVariableCount > 0 && projectVariableCount < columnCount) {
        return projectVariableCount;
    }

    return Math.max(columnCount - 2, 1);
}
