import { formatNumber } from './projectResultsUtils';

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

export default function GraphicalResult({ data, project }) {
    const vertices = Array.isArray(data.vertices) ? data.vertices : [];

    const feasibleRegion = Array.isArray(data.feasible_region)
        ? data.feasible_region
        : [];

    const optimalSolution = data.optimal_solution || null;
    const objectiveLine = data.objective_line || null;
    const constraints = project?.constraints || [];

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

    const allPoints = [
        ...regionPoints,
        ...restrictionLines.flatMap((line) => [line.start, line.end]),
        objectiveSegment?.start,
        objectiveSegment?.end,
        optimalSolution
            ? {
                  x: optimalSolution.x1,
                  y: optimalSolution.x2,
              }
            : null,
    ].filter(
        (point) =>
            point &&
            Number.isFinite(Number(point.x)) &&
            Number.isFinite(Number(point.y))
    );

    if (allPoints.length === 0) {
        return <SmallEmptyText text="Não existem pontos para desenhar." />;
    }

    const maxX = Math.max(...allPoints.map((point) => Number(point.x)), 1);
    const maxY = Math.max(...allPoints.map((point) => Number(point.y)), 1);
    const axisMax = Math.ceil(Math.max(maxX, maxY));
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
        .filter(
            (point) =>
                Number.isFinite(Number(point.x)) &&
                Number.isFinite(Number(point.y))
        )
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
                            fill="#a77b5f"
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
                                stroke="#2dae5f"
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
                                fill="#2dae5f"
                            >
                                Z
                            </text>
                        </g>
                    )}

                    {optimalSolution && (
                        <g>
                            <circle
                                cx={scaleX(optimalSolution.x1)}
                                cy={scaleY(optimalSolution.x2)}
                                r="9"
                                fill="#dc3545"
                            />

                            <text
                                x={scaleX(optimalSolution.x1) + 12}
                                y={scaleY(optimalSolution.x2) - 12}
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
            <LegendSquare color="#a77b5f" label="Área Viável" />
            <LegendLine color="#2dae5f" label="Função Objetivo (Z)" />
            <LegendCircle color="#dc3545" label="Ponto Ótimo" />

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
                const y = rhs / coefficientB;

                return {
                    start: { x: 0, y },
                    end: { x: 24, y },
                };
            }

            if (coefficientB === 0) {
                const x = rhs / coefficientA;

                return {
                    start: { x, y: 0 },
                    end: { x, y: 24 },
                };
            }

            return {
                start: { x: 0, y: rhs / coefficientB },
                end: { x: rhs / coefficientA, y: 0 },
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

    if (a === 0 && b === 0) {
        return null;
    }

    if (a === 0) {
        return {
            start: { x: 0, y: z / b },
            end: { x: 24, y: z / b },
        };
    }

    if (b === 0) {
        return {
            start: { x: z / a, y: 0 },
            end: { x: z / a, y: 24 },
        };
    }

    return {
        start: { x: 0, y: z / b },
        end: { x: z / a, y: 0 },
    };
}

function SmallEmptyText({ text }) {
    return <p className="text-sm leading-relaxed text-[#777777]">{text}</p>;
}