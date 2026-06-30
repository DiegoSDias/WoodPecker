import createPlotlyComponent from 'react-plotly.js/factory';
import Plotly from 'plotly.js-dist-min';
import { formatNumber } from './projectResultsUtils';

const Plot = createPlotlyComponent(Plotly);

const GRAPH_COLORS = {
    feasibleRegion: '#a77b5f',
    feasibleRegionFill: 'rgba(167, 123, 95, 0.28)',
    objectiveLine: '#2dae5f',
    optimalPoint: '#2f6fca',
    optimalSegment: '#2f6fca',
    axis: '#653018',
    grid: '#eadccb',
    paper: '#ffffff',
    plot: '#fbf6f1',
};

const RESTRICTION_COLORS = [
    '#c46a1d',
    '#7b4cc2',
    '#2f6fca',
    '#8f3f71',
    '#455a64',
    '#9c27b0',
    '#a65f2b',
    '#3949ab',
];

const EPSILON = 1e-6;

export default function GraphicalResult({ data = {}, project }) {
    const variableCount = getVariableCount(project);
    const constraints = Array.isArray(project?.constraints)
        ? project.constraints
        : [];

    if (variableCount !== 2) {
        return (
            <div className="max-w-[64rem] space-y-8">
                <h1 className="font-inter text-[2.35rem] font-black leading-tight text-[#653018]">
                    Método Gráfico
                </h1>

                <div className="rounded-2xl bg-white px-7 py-7 shadow-md">
                    <MethodUnavailableCard variableCount={variableCount} />
                </div>
            </div>
        );
    }

    if (isInfeasibleResult(data)) {
        return (
            <div className="max-w-[64rem] space-y-8">
                <h1 className="font-inter text-[2.35rem] font-black leading-tight text-[#653018]">
                    Método Gráfico
                </h1>

                <div className="rounded-2xl bg-white px-7 py-7 shadow-md">
                    <InfeasibleCard data={data} />
                </div>
            </div>
        );
    }

    if (!hasGraphicalData(data)) {
        return (
            <div className="max-w-[64rem] space-y-8">
                <h1 className="font-inter text-[2.35rem] font-black leading-tight text-[#653018]">
                    Método Gráfico
                </h1>

                <div className="rounded-2xl bg-white px-7 py-7 shadow-md">
                    <NoGraphicalResultCard />
                </div>
            </div>
        );
    }

    const hasMultipleSolutions = isMultipleSolution(data);

    return (
        <div className="max-w-[64rem] space-y-8">
            <h1 className="font-inter text-[2.35rem] font-black leading-tight text-[#653018]">
                Método Gráfico
            </h1>

            {hasMultipleSolutions && <MultipleSolutionNotice />}

            <div className="rounded-2xl bg-white px-7 py-7 shadow-md">
                <InteractiveGraph
                    data={data}
                    project={project}
                    constraints={constraints}
                    hasMultipleSolutions={hasMultipleSolutions}
                />
            </div>
        </div>
    );
}

function InteractiveGraph({ data, project, constraints, hasMultipleSolutions }) {
    const vertices = normalizePointList(data?.vertices);
    const feasibleRegion = normalizePointList(data?.feasible_region);
    const regionPoints = feasibleRegion.length > 0 ? feasibleRegion : vertices;
    const orderedRegionPoints = orderPolygonPoints(regionPoints);

    const objectiveCoefficients = getObjectiveCoefficients(data, project);
    const optimalSolution = normalizeOptimalSolution(data?.optimal_solution);
    const objectiveLine = data?.objective_line || null;
    const optimalValue = getOptimalObjectiveValue(
        data,
        objectiveLine,
        objectiveCoefficients,
        optimalSolution
    );

    const objectiveSegment = buildObjectiveSegment(
        objectiveLine,
        project,
        optimalValue
    );

    const serverOptimalSegment = normalizeSegment(
        data?.optimal_segment || data?.optimalSegment
    );

    const optimalSegment = hasMultipleSolutions
        ? serverOptimalSegment ||
          buildOptimalSegment(
              orderedRegionPoints,
              objectiveCoefficients,
              optimalValue
          )
        : null;

    const axisSeedPoints = [
        ...orderedRegionPoints,
        objectiveSegment?.start,
        objectiveSegment?.end,
        optimalSolution,
        optimalSegment?.start,
        optimalSegment?.end,
        ...buildConstraintAxisPoints(constraints),
    ].filter(isValidPoint);

    if (axisSeedPoints.length === 0) {
        return (
            <SmallEmptyText text="Não existem pontos suficientes para desenhar o gráfico." />
        );
    }

    const axisMax = getAxisMax(axisSeedPoints);
    const restrictionLines = buildRestrictionLines(constraints, axisMax);

    const traces = buildPlotTraces({
        regionPoints: orderedRegionPoints,
        restrictionLines,
        objectiveSegment,
        optimalSolution,
        optimalSegment,
        constraints,
        hasMultipleSolutions,
    });

    const layout = {
        autosize: true,
        height: 540,
        paper_bgcolor: GRAPH_COLORS.paper,
        plot_bgcolor: GRAPH_COLORS.plot,
        dragmode: 'pan',
        hovermode: 'closest',
        margin: {
            l: 70,
            r: 35,
            t: 30,
            b: 90,
        },
        xaxis: {
            title: {
                text: 'x1',
                font: {
                    color: GRAPH_COLORS.axis,
                    size: 18,
                    family: 'Inter, Montserrat, sans-serif',
                },
            },
            range: [0, axisMax],
            zeroline: true,
            zerolinecolor: GRAPH_COLORS.axis,
            zerolinewidth: 3,
            gridcolor: GRAPH_COLORS.grid,
            linecolor: GRAPH_COLORS.axis,
            linewidth: 3,
            tickfont: {
                color: GRAPH_COLORS.axis,
                size: 12,
                family: 'Montserrat, sans-serif',
            },
            fixedrange: false,
        },
        yaxis: {
            title: {
                text: 'x2',
                font: {
                    color: GRAPH_COLORS.axis,
                    size: 18,
                    family: 'Inter, Montserrat, sans-serif',
                },
            },
            range: [0, axisMax],
            zeroline: true,
            zerolinecolor: GRAPH_COLORS.axis,
            zerolinewidth: 3,
            gridcolor: GRAPH_COLORS.grid,
            linecolor: GRAPH_COLORS.axis,
            linewidth: 3,
            tickfont: {
                color: GRAPH_COLORS.axis,
                size: 12,
                family: 'Montserrat, sans-serif',
            },
            scaleanchor: 'x',
            scaleratio: 1,
            fixedrange: false,
        },
        legend: {
            orientation: 'h',
            x: 0,
            y: -0.24,
            font: {
                color: GRAPH_COLORS.axis,
                size: 13,
                family: 'Montserrat, sans-serif',
            },
        },
        font: {
            family: 'Montserrat, sans-serif',
            color: GRAPH_COLORS.axis,
        },
    };

    const config = {
        responsive: true,
        displaylogo: false,
        scrollZoom: true,
        modeBarButtonsToRemove: [
            'select2d',
            'lasso2d',
            'autoScale2d',
            'toggleSpikelines',
        ],
        toImageButtonOptions: {
            format: 'png',
            filename: 'grafico-metodo-grafico',
            height: 720,
            width: 1000,
            scale: 2,
        },
    };

    return (
        <div>
            <p className="mb-4 rounded-xl bg-[#fffaf4] px-5 py-3 text-sm font-semibold text-[#653018]">
                Use o mouse para arrastar o gráfico, a roda para aproximar ou
                afastar, e os botões no canto superior para resetar a
                visualização.
            </p>

            <Plot
                data={traces}
                layout={layout}
                config={config}
                useResizeHandler
                className="h-[540px] w-full"
                style={{ width: '100%', height: '540px' }}
            />
        </div>
    );
}

function buildPlotTraces({
    regionPoints,
    restrictionLines,
    objectiveSegment,
    optimalSolution,
    optimalSegment,
    constraints,
    hasMultipleSolutions,
}) {
    const traces = [];

    if (regionPoints.length > 0) {
        const closedRegion = closePolygon(regionPoints);

        traces.push({
            type: 'scatter',
            mode: 'lines',
            name: 'Área Viável',
            x: closedRegion.map((point) => point.x),
            y: closedRegion.map((point) => point.y),
            fill: 'toself',
            fillcolor: GRAPH_COLORS.feasibleRegionFill,
            line: {
                color: GRAPH_COLORS.feasibleRegion,
                width: 3,
            },
            hovertemplate:
                'Área viável<br>x1: %{x:.4f}<br>x2: %{y:.4f}<extra></extra>',
            showlegend: false,
        });

        traces.push({
            type: 'scatter',
            mode: 'lines',
            name: 'Área Viável',
            x: [0, 1],
            y: [0, 1],
            line: {
                color: GRAPH_COLORS.feasibleRegion,
                width: 10,
            },
            hoverinfo: 'skip',
            visible: 'legendonly',
        });
    }

    restrictionLines.forEach((line, index) => {
        const color = getRestrictionColor(index);

        traces.push({
            type: 'scatter',
            mode: 'lines',
            name: `R${index + 1}`,
            x: [line.start.x, line.end.x],
            y: [line.start.y, line.end.y],
            line: {
                color,
                width: 3,
            },
            hovertemplate: `${
                constraints[index]
                    ? formatConstraintLabel(constraints[index], index)
                    : `R${index + 1}`
            }<br>x1: %{x:.4f}<br>x2: %{y:.4f}<extra></extra>`,
        });
    });

    if (objectiveSegment) {
        traces.push({
            type: 'scatter',
            mode: 'lines',
            name: 'Função Objetivo (Z)',
            x: [objectiveSegment.start.x, objectiveSegment.end.x],
            y: [objectiveSegment.start.y, objectiveSegment.end.y],
            line: {
                color: GRAPH_COLORS.objectiveLine,
                width: 3,
            },
            hovertemplate:
                'Função objetivo<br>x1: %{x:.4f}<br>x2: %{y:.4f}<extra></extra>',
        });
    }

    if (optimalSegment) {
        traces.push({
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Segmento Ótimo',
            x: [optimalSegment.start.x, optimalSegment.end.x],
            y: [optimalSegment.start.y, optimalSegment.end.y],
            line: {
                color: GRAPH_COLORS.optimalSegment,
                width: 8,
            },
            marker: {
                color: GRAPH_COLORS.optimalSegment,
                size: 10,
            },
            hovertemplate:
                'Segmento ótimo<br>x1: %{x:.4f}<br>x2: %{y:.4f}<extra></extra>',
        });
    }

    if (optimalSolution) {
        traces.push({
            type: 'scatter',
            mode: 'markers+text',
            name: hasMultipleSolutions
                ? 'Ponto ótimo representativo'
                : 'Ponto Ótimo',
            x: [optimalSolution.x],
            y: [optimalSolution.y],
            text: ['Ótimo'],
            textposition: 'top right',
            marker: {
                color: GRAPH_COLORS.optimalPoint,
                size: 16,
                line: {
                    color: 'rgba(47, 111, 202, 0.35)',
                    width: 8,
                },
            },
            textfont: {
                color: GRAPH_COLORS.axis,
                size: 15,
                family: 'Inter, Montserrat, sans-serif',
            },
            hovertemplate:
                'Ponto ótimo<br>x1: %{x:.4f}<br>x2: %{y:.4f}<extra></extra>',
        });
    }

    return traces;
}

function MethodUnavailableCard({ variableCount }) {
    return (
        <div className="rounded-xl border border-[#e6d6c6] bg-[#fffaf4] px-6 py-10 text-center">
            <h2 className="font-inter text-2xl font-black text-[#653018]">
                Método gráfico indisponível
            </h2>

            <p className="mx-auto mt-4 max-w-[42rem] font-montserrat text-base leading-relaxed text-[#777777]">
                O método gráfico está disponível apenas para problemas com
                exatamente 2 variáveis de decisão.
            </p>

            <p className="mx-auto mt-3 max-w-[42rem] font-montserrat text-sm leading-relaxed text-[#777777]">
                Este projeto possui{' '}
                <strong className="text-[#653018]">
                    {variableCount || 'mais de 2'}
                </strong>{' '}
                variável{variableCount === 1 ? '' : 'es'}. Para esse caso,
                utilize os métodos Simplex, Dual ou Inteiro.
            </p>
        </div>
    );
}

function MultipleSolutionNotice() {
    return (
        <div className="rounded-xl border border-[#d6bfa8] bg-[#fffaf4] px-5 py-4 font-montserrat text-sm font-semibold leading-relaxed text-[#653018]">
            Este problema possui solução múltipla. Quando identificado, o
            segmento azul mostra o conjunto de pontos ótimos. O ponto azul indica
            uma solução ótima representativa.
        </div>
    );
}

function InfeasibleCard({ data }) {
    const message =
        data?.optimal_solution?.message ||
        data?.message ||
        'Não existe região viável para as restrições informadas. Portanto, não há ponto ótimo para exibir no método gráfico.';

    return (
        <div className="rounded-xl border border-[#e6d6c6] bg-[#fffaf4] px-6 py-10 text-center">
            <h2 className="font-inter text-2xl font-black text-[#653018]">
                Sistema inviável
            </h2>

            <p className="mx-auto mt-4 max-w-[42rem] font-montserrat text-base leading-relaxed text-[#777777]">
                {normalizeBackendMessage(message)}
            </p>
        </div>
    );
}

function NoGraphicalResultCard() {
    return (
        <div className="rounded-xl border border-[#e6d6c6] bg-[#fffaf4] px-6 py-10 text-center">
            <h2 className="font-inter text-2xl font-black text-[#653018]">
                Resultado ainda não disponível
            </h2>

            <p className="mx-auto mt-4 max-w-[42rem] font-montserrat text-base leading-relaxed text-[#777777]">
                Execute o método gráfico para visualizar o gráfico deste
                projeto.
            </p>
        </div>
    );
}

function getVariableCount(project) {
    const directCount = Number(project?.num_variables);

    if (Number.isInteger(directCount) && directCount > 0) {
        return directCount;
    }

    const objectiveCoefficients =
        project?.objective_function?.coefficients ||
        project?.objectiveFunction?.coefficients ||
        project?.objective?.coefficients;

    if (
        Array.isArray(objectiveCoefficients) &&
        objectiveCoefficients.length > 0
    ) {
        return objectiveCoefficients.length;
    }

    const firstConstraintCoefficients = project?.constraints?.[0]?.coefficients;

    if (
        Array.isArray(firstConstraintCoefficients) &&
        firstConstraintCoefficients.length > 0
    ) {
        return firstConstraintCoefficients.length;
    }

    return 0;
}

function getObjectiveCoefficients(data, project) {
    const coefficients =
        data?.objective_line?.coefficients ||
        project?.objective_function?.coefficients ||
        project?.objectiveFunction?.coefficients ||
        project?.objective?.coefficients ||
        [];

    if (!Array.isArray(coefficients) || coefficients.length < 2) {
        return [];
    }

    return coefficients.slice(0, 2).map(Number);
}

function getOptimalObjectiveValue(
    data,
    objectiveLine,
    objectiveCoefficients,
    optimalSolution
) {
    const possibleValues = [
        data?.optimal_value,
        data?.objective_value,
        data?.z_value,
        data?.z,
        data?.optimal_solution?.objective_value,
        data?.optimal_solution?.optimal_value,
        data?.optimal_solution?.z_value,
        data?.optimal_solution?.z,
        data?.optimal_solution?.value,
        objectiveLine?.z,
    ];

    for (const value of possibleValues) {
        const number = Number(value);

        if (Number.isFinite(number)) {
            return number;
        }
    }

    if (
        optimalSolution &&
        Array.isArray(objectiveCoefficients) &&
        objectiveCoefficients.length >= 2
    ) {
        const [a, b] = objectiveCoefficients;

        if (Number.isFinite(a) && Number.isFinite(b)) {
            return a * optimalSolution.x + b * optimalSolution.y;
        }
    }

    return null;
}

function hasGraphicalData(data) {
    return Boolean(
        data &&
            (Array.isArray(data.vertices) ||
                Array.isArray(data.feasible_region) ||
                data.optimal_solution ||
                data.objective_line)
    );
}

function isMultipleSolution(data) {
    if (data?.has_multiple_solution || data?.hasMultipleSolution) {
        return true;
    }

    if (data?.optimal_segment || data?.optimalSegment) {
        return true;
    }

    if (
        Array.isArray(data?.alternative_solutions) &&
        data.alternative_solutions.length > 0
    ) {
        return true;
    }

    const status =
        data?.status ||
        data?.optimal_solution?.status ||
        data?.solution_status ||
        data?.result_status ||
        '';

    const message =
        data?.message ||
        data?.optimal_solution?.message ||
        data?.description ||
        '';

    const combined = normalizeText(`${status} ${message}`);

    return (
        combined.includes('multipla') ||
        combined.includes('multiple') ||
        combined.includes('infinitas solucoes') ||
        combined.includes('solucoes infinitas')
    );
}

function isInfeasibleResult(data) {
    const status =
        data?.status ||
        data?.optimal_solution?.status ||
        data?.solution_status ||
        data?.result_status;

    if (typeof status === 'string') {
        const normalizedStatus = normalizeText(status);

        if (
            normalizedStatus.includes('infeasible') ||
            normalizedStatus.includes('inviavel') ||
            normalizedStatus.includes('impossivel')
        ) {
            return true;
        }
    }

    const message =
        data?.message ||
        data?.optimal_solution?.message ||
        data?.description ||
        '';

    if (typeof message === 'string') {
        const normalizedMessage = normalizeText(message);

        if (
            normalizedMessage.includes(
                'nao foi possivel encontrar vertices viaveis'
            ) ||
            normalizedMessage.includes('nao existe regiao viavel') ||
            normalizedMessage.includes('sistema inviavel') ||
            normalizedMessage.includes('sistema impossivel')
        ) {
            return true;
        }
    }

    if (
        Array.isArray(data?.vertices) &&
        data.vertices.length === 0 &&
        data?.optimal_solution?.status
    ) {
        return true;
    }

    return false;
}

function normalizeText(value) {
    return String(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function normalizeBackendMessage(message) {
    const normalizedMessage = normalizeText(message);

    if (
        normalizedMessage.includes(
            'nao foi possivel encontrar vertices viaveis'
        )
    ) {
        return 'Não existe região viável para as restrições informadas. Portanto, não há ponto ótimo para exibir no método gráfico.';
    }

    return message;
}

function normalizePointList(points) {
    if (!Array.isArray(points)) {
        return [];
    }

    return points.map(normalizePoint).filter(isValidPoint);
}

function normalizePoint(point) {
    if (!point) {
        return null;
    }

    const x = point.x ?? point.x1 ?? point[0];
    const y = point.y ?? point.x2 ?? point[1];

    return {
        x: Number(x),
        y: Number(y),
    };
}

function normalizeOptimalSolution(optimalSolution) {
    if (!optimalSolution) {
        return null;
    }

    if (isInfeasibleResult({ optimal_solution: optimalSolution })) {
        return null;
    }

    return normalizePoint(optimalSolution);
}

function normalizeSegment(segment) {
    if (!segment || typeof segment !== 'object') {
        return null;
    }

    const start = normalizePoint(segment.start || segment[0]);
    const end = normalizePoint(segment.end || segment[1]);

    if (!isValidPoint(start) || !isValidPoint(end)) {
        return null;
    }

    return { start, end };
}

function orderPolygonPoints(points) {
    const normalizedPoints = normalizePointList(points);

    if (normalizedPoints.length <= 2) {
        return normalizedPoints;
    }

    const center = {
        x:
            normalizedPoints.reduce((sum, point) => sum + point.x, 0) /
            normalizedPoints.length,
        y:
            normalizedPoints.reduce((sum, point) => sum + point.y, 0) /
            normalizedPoints.length,
    };

    return [...normalizedPoints].sort((firstPoint, secondPoint) => {
        const firstAngle = Math.atan2(
            firstPoint.y - center.y,
            firstPoint.x - center.x
        );

        const secondAngle = Math.atan2(
            secondPoint.y - center.y,
            secondPoint.x - center.x
        );

        return firstAngle - secondAngle;
    });
}

function closePolygon(points) {
    if (points.length === 0) {
        return [];
    }

    return [...points, points[0]];
}

function getAxisMax(points) {
    const maxX = Math.max(...points.map((point) => Number(point.x)), 1);
    const maxY = Math.max(...points.map((point) => Number(point.y)), 1);
    const max = Math.max(maxX, maxY);

    return Math.max(1, Math.ceil(max * 1.15));
}

function getRestrictionColor(index) {
    return RESTRICTION_COLORS[index % RESTRICTION_COLORS.length];
}

function buildRestrictionLines(constraints, axisLimit = 24) {
    if (!Array.isArray(constraints)) {
        return [];
    }

    return constraints
        .map((constraint) => {
            const [a = 0, b = 0] = constraint.coefficients || [];
            const rhs = Number(constraint.rhs_value);
            const coefficientA = Number(a);
            const coefficientB = Number(b);

            if (!Number.isFinite(rhs)) {
                return null;
            }

            if (coefficientA === 0 && coefficientB === 0) {
                return null;
            }

            if (coefficientA === 0) {
                if (coefficientB === 0) {
                    return null;
                }

                const y = rhs / coefficientB;

                if (!Number.isFinite(y)) {
                    return null;
                }

                return {
                    start: { x: 0, y },
                    end: { x: axisLimit, y },
                };
            }

            if (coefficientB === 0) {
                const x = rhs / coefficientA;

                if (!Number.isFinite(x)) {
                    return null;
                }

                return {
                    start: { x, y: 0 },
                    end: { x, y: axisLimit },
                };
            }

            const yIntercept = rhs / coefficientB;
            const xIntercept = rhs / coefficientA;

            if (!Number.isFinite(yIntercept) || !Number.isFinite(xIntercept)) {
                return null;
            }

            return {
                start: { x: 0, y: yIntercept },
                end: { x: xIntercept, y: 0 },
            };
        })
        .filter(Boolean);
}

function buildObjectiveSegment(objectiveLine, project, optimalValue = null) {
    const coefficients =
        objectiveLine?.coefficients ||
        project?.objective_function?.coefficients ||
        project?.objectiveFunction?.coefficients ||
        project?.objective?.coefficients ||
        [];

    const z = Number(objectiveLine?.z ?? optimalValue);

    if (coefficients.length < 2 || !Number.isFinite(z)) {
        return null;
    }

    const [a, b] = coefficients.map(Number);

    if (!Number.isFinite(a) || !Number.isFinite(b)) {
        return null;
    }

    if (a === 0 && b === 0) {
        return null;
    }

    if (a === 0) {
        if (b === 0) {
            return null;
        }

        const y = z / b;

        if (!Number.isFinite(y)) {
            return null;
        }

        return {
            start: { x: 0, y },
            end: { x: 24, y },
        };
    }

    if (b === 0) {
        const x = z / a;

        if (!Number.isFinite(x)) {
            return null;
        }

        return {
            start: { x, y: 0 },
            end: { x, y: 24 },
        };
    }

    const yIntercept = z / b;
    const xIntercept = z / a;

    if (!Number.isFinite(yIntercept) || !Number.isFinite(xIntercept)) {
        return null;
    }

    return {
        start: { x: 0, y: yIntercept },
        end: { x: xIntercept, y: 0 },
    };
}

function buildOptimalSegment(regionPoints, objectiveCoefficients, optimalValue) {
    const points = normalizePointList(regionPoints);

    if (
        points.length < 2 ||
        !Array.isArray(objectiveCoefficients) ||
        objectiveCoefficients.length < 2 ||
        !Number.isFinite(Number(optimalValue))
    ) {
        return null;
    }

    const [a, b] = objectiveCoefficients.map(Number);
    const targetValue = Number(optimalValue);

    if (!Number.isFinite(a) || !Number.isFinite(b)) {
        return null;
    }

    const intersectionPoints = [];

    for (let index = 0; index < points.length; index += 1) {
        const currentPoint = points[index];
        const nextPoint = points[(index + 1) % points.length];

        const currentValue = a * currentPoint.x + b * currentPoint.y;
        const nextValue = a * nextPoint.x + b * nextPoint.y;

        const currentDelta = currentValue - targetValue;
        const nextDelta = nextValue - targetValue;

        if (Math.abs(currentDelta) <= EPSILON) {
            intersectionPoints.push(currentPoint);
        }

        if (Math.abs(nextDelta) <= EPSILON) {
            intersectionPoints.push(nextPoint);
        }

        if (currentDelta * nextDelta < 0) {
            const ratio =
                (targetValue - currentValue) / (nextValue - currentValue);

            const intersection = {
                x: currentPoint.x + ratio * (nextPoint.x - currentPoint.x),
                y: currentPoint.y + ratio * (nextPoint.y - currentPoint.y),
            };

            if (isValidPoint(intersection)) {
                intersectionPoints.push(intersection);
            }
        }
    }

    const uniquePoints = deduplicatePoints(intersectionPoints);

    if (uniquePoints.length < 2) {
        return null;
    }

    return getFarthestSegment(uniquePoints);
}

function deduplicatePoints(points) {
    const uniquePoints = [];

    points.forEach((point) => {
        const alreadyExists = uniquePoints.some(
            (existingPoint) =>
                Math.abs(existingPoint.x - point.x) <= EPSILON &&
                Math.abs(existingPoint.y - point.y) <= EPSILON
        );

        if (!alreadyExists) {
            uniquePoints.push(point);
        }
    });

    return uniquePoints;
}

function getFarthestSegment(points) {
    let bestSegment = null;
    let bestDistance = -1;

    for (let firstIndex = 0; firstIndex < points.length; firstIndex += 1) {
        for (
            let secondIndex = firstIndex + 1;
            secondIndex < points.length;
            secondIndex += 1
        ) {
            const firstPoint = points[firstIndex];
            const secondPoint = points[secondIndex];

            const distance =
                Math.pow(firstPoint.x - secondPoint.x, 2) +
                Math.pow(firstPoint.y - secondPoint.y, 2);

            if (distance > bestDistance) {
                bestDistance = distance;
                bestSegment = {
                    start: firstPoint,
                    end: secondPoint,
                };
            }
        }
    }

    return bestSegment;
}

function formatConstraintLabel(constraint, index) {
    const coefficients = Array.isArray(constraint?.coefficients)
        ? constraint.coefficients
        : [];

    const x1 = formatNumber(Number(coefficients[0] || 0));
    const x2 = formatNumber(Number(coefficients[1] || 0));
    const operator = constraint?.operator || '<=';
    const rhs = formatNumber(Number(constraint?.rhs_value || 0));

    return `R${index + 1}: ${x1}x1 + ${x2}x2 ${operator} ${rhs}`;
}

function isValidPoint(point) {
    return (
        point &&
        Number.isFinite(Number(point.x)) &&
        Number.isFinite(Number(point.y))
    );
}

function SmallEmptyText({ text }) {
    return <p className="text-sm leading-relaxed text-[#777777]">{text}</p>;
}

function buildConstraintAxisPoints(constraints) {
    if (!Array.isArray(constraints)) {
        return [];
    }

    const points = [{ x: 0, y: 0 }];

    constraints.forEach((constraint) => {
        const [a = 0, b = 0] = constraint.coefficients || [];
        const rhs = Number(constraint.rhs_value);
        const coefficientA = Number(a);
        const coefficientB = Number(b);

        if (!Number.isFinite(rhs)) {
            return;
        }

        if (coefficientA !== 0) {
            points.push({ x: rhs / coefficientA, y: 0 });
        }

        if (coefficientB !== 0) {
            points.push({ x: 0, y: rhs / coefficientB });
        }
    });

    return points.filter(
        (point) => isValidPoint(point) && point.x >= 0 && point.y >= 0
    );
}
