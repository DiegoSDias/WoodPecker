import { formatNumber } from './projectResultsUtils';

const GRAPH_COLORS = {
    feasibleRegion: '#a77b5f',
    objectiveLine: '#2dae5f',
    optimalPoint: '#2f6fca',
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

    const vertices = Array.isArray(data?.vertices) ? data.vertices : [];

    const feasibleRegion = Array.isArray(data?.feasible_region)
        ? data.feasible_region
        : [];

    const optimalSolution = data?.optimal_solution || null;
    const objectiveLine = data?.objective_line || null;

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

    return (
        <div className="max-w-[64rem] space-y-8">
            <h1 className="font-inter text-[2.35rem] font-black leading-tight text-[#653018]">
                Método Gráfico
            </h1>

            <div className="rounded-2xl bg-white px-7 py-7 shadow-md">
                <GraphCanvas
                    feasibleRegion={feasibleRegion}
                    vertices={vertices}
                    optimalSolution={optimalSolution}
                    objectiveLine={objectiveLine}
                    constraints={constraints}
                />
            </div>

            <GraphLegend constraints={constraints} />
        </div>
    );
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

function GraphCanvas({
    feasibleRegion,
    vertices,
    optimalSolution,
    objectiveLine,
    constraints,
}) {
    const regionPoints =
        feasibleRegion.length > 0 ? feasibleRegion : vertices || [];

    const restrictionLines = buildRestrictionLines(constraints);
    const objectiveSegment = buildObjectiveSegment(objectiveLine);

    const normalizedOptimalSolution = normalizeOptimalSolution(optimalSolution);

    const allPoints = [
        ...regionPoints,
        ...restrictionLines.flatMap((line) => [line.start, line.end]),
        objectiveSegment?.start,
        objectiveSegment?.end,
        normalizedOptimalSolution,
    ].filter(isValidPoint);

    if (allPoints.length === 0) {
        return (
            <SmallEmptyText text="Não existem pontos suficientes para desenhar o gráfico." />
        );
    }

    const maxX = Math.max(...allPoints.map((point) => Number(point.x)), 1);
    const maxY = Math.max(...allPoints.map((point) => Number(point.y)), 1);
    const axisMax = Math.max(1, Math.ceil(Math.max(maxX, maxY)));

    const padding = 56;
    const width = 760;
    const height = 410;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;

    function scaleX(value) {
        return padding + (Number(value) / axisMax) * graphWidth;
    }

    function scaleY(value) {
        return height - padding - (Number(value) / axisMax) * graphHeight;
    }

    const polygonPoints = regionPoints
        .filter(isValidPoint)
        .map((point) => `${scaleX(point.x)},${scaleY(point.y)}`)
        .join(' ');

    return (
        <div className="mx-auto w-full max-w-[56rem]">
            <div className="overflow-x-auto">
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="h-auto w-full"
                    role="img"
                    aria-label="Gráfico do método gráfico"
                >
                    <rect
                        x={padding}
                        y={padding}
                        width={graphWidth}
                        height={graphHeight}
                        fill="#fbf6f1"
                        stroke="#a77b5f"
                        strokeWidth="1"
                    />

                    {Array.from({ length: 6 }).map((_, index) => {
                        const axisValue = (axisMax / 5) * index;

                        return (
                            <g key={index}>
                                <line
                                    x1={scaleX(axisValue)}
                                    y1={padding}
                                    x2={scaleX(axisValue)}
                                    y2={height - padding}
                                    stroke="#eadccb"
                                    strokeWidth="1"
                                />

                                <line
                                    x1={padding}
                                    y1={scaleY(axisValue)}
                                    x2={width - padding}
                                    y2={scaleY(axisValue)}
                                    stroke="#eadccb"
                                    strokeWidth="1"
                                />

                                <text
                                    x={scaleX(axisValue)}
                                    y={height - padding + 24}
                                    textAnchor="middle"
                                    fontSize="12"
                                    fill="#653018"
                                >
                                    {formatNumber(axisValue)}
                                </text>

                                <text
                                    x={padding - 13}
                                    y={scaleY(axisValue) + 4}
                                    textAnchor="end"
                                    fontSize="12"
                                    fill="#653018"
                                >
                                    {formatNumber(axisValue)}
                                </text>
                            </g>
                        );
                    })}

                    <line
                        x1={padding}
                        y1={height - padding}
                        x2={width - padding}
                        y2={height - padding}
                        stroke="#653018"
                        strokeWidth="3"
                    />

                    <line
                        x1={padding}
                        y1={padding}
                        x2={padding}
                        y2={height - padding}
                        stroke="#653018"
                        strokeWidth="3"
                    />

                    {polygonPoints && (
                        <polygon
                            points={polygonPoints}
                            fill={GRAPH_COLORS.feasibleRegion}
                            fillOpacity="0.28"
                            stroke="#653018"
                            strokeWidth="3"
                        />
                    )}

                    {restrictionLines.map((line, index) => {
                        const color = getRestrictionColor(index);
                        const labelPoint = getLineLabelPoint(line, index);

                        return (
                            <g key={`restriction-${index}`}>
                                <line
                                    x1={scaleX(line.start.x)}
                                    y1={scaleY(line.start.y)}
                                    x2={scaleX(line.end.x)}
                                    y2={scaleY(line.end.y)}
                                    stroke={color}
                                    strokeWidth="2.5"
                                />

                                <text
                                    x={scaleX(labelPoint.x)}
                                    y={scaleY(labelPoint.y)}
                                    textAnchor="middle"
                                    fontSize="13"
                                    fontWeight="800"
                                    fill={color}
                                >
                                    R{index + 1}
                                </text>
                            </g>
                        );
                    })}

                    {objectiveSegment && (
                        <g>
                            <line
                                x1={scaleX(objectiveSegment.start.x)}
                                y1={scaleY(objectiveSegment.start.y)}
                                x2={scaleX(objectiveSegment.end.x)}
                                y2={scaleY(objectiveSegment.end.y)}
                                stroke={GRAPH_COLORS.objectiveLine}
                                strokeWidth="2.5"
                            />

                            <text
                                x={scaleX(
                                    getLineLabelPoint(objectiveSegment, 0).x
                                )}
                                y={
                                    scaleY(
                                        getLineLabelPoint(objectiveSegment, 0).y
                                    ) + 18
                                }
                                textAnchor="middle"
                                fontSize="13"
                                fontWeight="800"
                                fill={GRAPH_COLORS.objectiveLine}
                            >
                                Z
                            </text>
                        </g>
                    )}

                    {normalizedOptimalSolution && (
                        <g>
                            <circle
                                cx={scaleX(normalizedOptimalSolution.x)}
                                cy={scaleY(normalizedOptimalSolution.y)}
                                r="9"
                                fill={GRAPH_COLORS.optimalPoint}
                            />

                            <circle
                                cx={scaleX(normalizedOptimalSolution.x)}
                                cy={scaleY(normalizedOptimalSolution.y)}
                                r="14"
                                fill="none"
                                stroke={GRAPH_COLORS.optimalPoint}
                                strokeWidth="2"
                                strokeOpacity="0.35"
                            />

                            <text
                                x={scaleX(normalizedOptimalSolution.x) + 12}
                                y={scaleY(normalizedOptimalSolution.y) - 12}
                                fontSize="15"
                                fontWeight="800"
                                fill="#653018"
                            >
                                Ótimo
                            </text>
                        </g>
                    )}

                    <text
                        x={width - padding}
                        y={height - 12}
                        textAnchor="end"
                        fontSize="16"
                        fontWeight="800"
                        fill="#653018"
                    >
                        x1
                    </text>

                    <text
                        x={padding - 18}
                        y={padding - 10}
                        textAnchor="end"
                        fontSize="16"
                        fontWeight="800"
                        fill="#653018"
                    >
                        x2
                    </text>
                </svg>
            </div>
        </div>
    );
}

function GraphLegend({ constraints }) {
    return (
        <div className="flex max-w-[64rem] flex-wrap items-center gap-7 rounded-lg bg-[#fffaf4] px-8 py-4 text-base font-bold text-[#653018] shadow-sm">
            <LegendSquare
                color={GRAPH_COLORS.feasibleRegion}
                label="Área Viável"
            />

            <LegendLine
                color={GRAPH_COLORS.objectiveLine}
                label="Função Objetivo (Z)"
            />

            <LegendCircle
                color={GRAPH_COLORS.optimalPoint}
                label="Ponto Ótimo"
            />

            {constraints.map((_, index) => (
                <LegendLine
                    key={index}
                    color={getRestrictionColor(index)}
                    label={`R${index + 1}`}
                />
            ))}
        </div>
    );
}

function LegendSquare({ color, label }) {
    return (
        <div className="flex items-center gap-3">
            <span
                className="h-7 w-7 rounded"
                style={{ backgroundColor: color }}
            />
            <span>{label}</span>
        </div>
    );
}

function LegendLine({ color, label }) {
    return (
        <div className="flex items-center gap-3">
            <span
                className="block h-[2px] w-10"
                style={{ backgroundColor: color }}
            />
            <span>{label}</span>
        </div>
    );
}

function LegendCircle({ color, label }) {
    return (
        <div className="flex items-center gap-3">
            <span
                className="h-5 w-5 rounded-full"
                style={{ backgroundColor: color }}
            />
            <span>{label}</span>
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

    if (Array.isArray(objectiveCoefficients) && objectiveCoefficients.length > 0) {
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

function hasGraphicalData(data) {
    return Boolean(
        data &&
            (Array.isArray(data.vertices) ||
                Array.isArray(data.feasible_region) ||
                data.optimal_solution ||
                data.objective_line)
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
            normalizedMessage.includes('nao foi possivel encontrar vertices viaveis') ||
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
        normalizedMessage.includes('nao foi possivel encontrar vertices viaveis')
    ) {
        return 'Não existe região viável para as restrições informadas. Portanto, não há ponto ótimo para exibir no método gráfico.';
    }

    return message;
}

function getRestrictionColor(index) {
    return RESTRICTION_COLORS[index % RESTRICTION_COLORS.length];
}

function getLineLabelPoint(line, index) {
    const position = 0.48 + (index % 3) * 0.08;
    const offsetY = index % 2 === 0 ? -0.45 : 0.45;

    return {
        x:
            Number(line.start.x) +
            (Number(line.end.x) - Number(line.start.x)) * position,
        y:
            Number(line.start.y) +
            (Number(line.end.y) - Number(line.start.y)) * position +
            offsetY,
    };
}

function buildRestrictionLines(constraints) {
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
                    end: { x: 24, y },
                };
            }

            if (coefficientB === 0) {
                const x = rhs / coefficientA;

                if (!Number.isFinite(x)) {
                    return null;
                }

                return {
                    start: { x, y: 0 },
                    end: { x, y: 24 },
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

function buildObjectiveSegment(objectiveLine) {
    const coefficients = objectiveLine?.coefficients || [];
    const z = Number(objectiveLine?.z);

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

function normalizeOptimalSolution(optimalSolution) {
    if (!optimalSolution) {
        return null;
    }

    if (isInfeasibleResult({ optimal_solution: optimalSolution })) {
        return null;
    }

    const x =
        optimalSolution.x ??
        optimalSolution.x1 ??
        optimalSolution.variables?.x1 ??
        optimalSolution.values?.x1;

    const y =
        optimalSolution.y ??
        optimalSolution.x2 ??
        optimalSolution.variables?.x2 ??
        optimalSolution.values?.x2;

    const normalizedPoint = {
        x: Number(x),
        y: Number(y),
    };

    return isValidPoint(normalizedPoint) ? normalizedPoint : null;
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