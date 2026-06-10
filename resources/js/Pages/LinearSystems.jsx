import Footer from '@/Components/Footer';
import Header from '@/Components/Header';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

export default function LinearSystems({ auth }) {
    const isLoggedIn = Boolean(auth?.user);

    const [variables, setVariables] = useState(3);
    const [matrixA, setMatrixA] = useState(createMatrix(3));
    const [vectorB, setVectorB] = useState(createVector(3));
    const [result, setResult] = useState(null);

    function updateVariables(newSize) {
        if (newSize < 2 || newSize > 5) return;

        setVariables(newSize);
        setMatrixA((currentMatrix) => resizeMatrix(currentMatrix, newSize));
        setVectorB((currentVector) => resizeVector(currentVector, newSize));
        setResult(null);
    }

    function handleMatrixChange(rowIndex, colIndex, value) {
        setMatrixA((currentMatrix) =>
            currentMatrix.map((row, currentRowIndex) =>
                row.map((cell, currentColIndex) =>
                    currentRowIndex === rowIndex &&
                        currentColIndex === colIndex
                        ? value
                        : cell
                )
            )
        );

        setResult(null);
    }

    function handleVectorChange(index, value) {
        setVectorB((currentVector) =>
            currentVector.map((cell, currentIndex) =>
                currentIndex === index ? value : cell
            )
        );

        setResult(null);
    }

    function clearFields() {
        setMatrixA(createMatrix(variables));
        setVectorB(createVector(variables));
        setResult(null);
    }

    function calculateSolution() {
        const coefficients = matrixA.map((row) =>
            row.map((value) => parseInputNumber(value))
        );

        const terms = vectorB.map((value) => parseInputNumber(value));

        const solution = solveLinearSystem(coefficients, terms);

        setResult(solution);
    }

    function saveProject() {
        // Futuramente o Diego pode integrar essa função com o backend.
        // Por enquanto, deixamos o botão pronto visualmente.
        alert('Funcionalidade de salvar projeto será integrada ao backend.');
    }

    return (
        <>
            <Head title="Sistemas Lineares" />

            <main className="min-h-screen bg-white font-montserrat text-[#2b211b]">
                <Header auth={auth} activePage="novo-problema" />

                <section className="bg-white px-10 py-8">
                    <div className="mx-auto max-w-[78rem]">
                        <button
                            type="button"
                            onClick={() => router.visit('/')}
                            className="mb-8 text-4xl font-light text-[#653018] transition hover:-translate-x-1"
                            aria-label="Voltar"
                        >
                            ←
                        </button>

                        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-center gap-6">
                                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#733615]">
                                    <img
                                        src="/images/(x).png"
                                        alt=""
                                        className="h-9 w-9 object-contain"
                                    />
                                </div>

                                <h1 className="font-inter text-[2.2rem] font-black text-[#653018]">
                                    Sistemas Lineares
                                </h1>
                            </div>

                            <div className="flex items-center gap-5 rounded-xl border border-[#733615] px-5 py-2 font-montserrat text-xl text-[#653018]">
                                <span>Número de variáveis:</span>

                                <button
                                    type="button"
                                    onClick={() =>
                                        updateVariables(variables - 1)
                                    }
                                    className="font-bold transition hover:scale-110"
                                    aria-label="Diminuir número de variáveis"
                                >
                                    −
                                </button>

                                <span className="font-bold">{variables}</span>

                                <button
                                    type="button"
                                    onClick={() =>
                                        updateVariables(variables + 1)
                                    }
                                    className="font-bold transition hover:scale-110"
                                    aria-label="Aumentar número de variáveis"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <p className="mt-6 max-w-[60rem] font-montserrat text-lg leading-relaxed text-[#777777]">
                            Preencha os coeficientes da matriz A e os termos do
                            vetor b para calcular automaticamente a solução do
                            sistema.
                        </p>

                        {!isLoggedIn && (
                            <div className="mt-6 rounded-lg bg-[#fff3cd] px-5 py-4 text-sm font-medium text-[#7a4b00]">
                                Você está usando o sistema sem login. É possível
                                calcular a solução, mas o projeto não será salvo
                                em “Meus projetos”.
                            </div>
                        )}

                        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_15rem]">
                            <div className="overflow-hidden rounded-xl bg-white shadow-md">
                                <div className="grid grid-cols-[1fr_10rem_12rem] bg-[#eadccb] px-6 py-4 text-center font-inter text-lg font-black text-[#653018]">
                                    <div>Matriz A (Coeficientes)</div>
                                    <div>Variáveis</div>
                                    <div>Vetor b</div>
                                </div>

                                <div className="grid grid-cols-[1fr_10rem_12rem] items-center gap-8 px-6 py-7">
                                    <div className="rounded-xl bg-[#eadccb] p-5 shadow-inner">
                                        <div
                                            className="grid gap-5"
                                            style={{
                                                gridTemplateColumns: `repeat(${variables}, minmax(0, 1fr))`,
                                            }}
                                        >
                                            {matrixA.map((row, rowIndex) =>
                                                row.map((cell, colIndex) => (
                                                    <input
                                                        key={`${rowIndex}-${colIndex}`}
                                                        type="number"
                                                        step="any"
                                                        value={cell}
                                                        placeholder="0"
                                                        onChange={(event) =>
                                                            handleMatrixChange(
                                                                rowIndex,
                                                                colIndex,
                                                                event.target
                                                                    .value
                                                            )
                                                        }
                                                        className="h-12 rounded-xl bg-[#fffaf4] text-center font-montserrat text-lg text-[#653018] shadow outline-none transition placeholder:text-[#a8a8a8] focus:ring-2 focus:ring-[#733615]"
                                                    />
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center gap-6">
                                        {Array.from({
                                            length: variables,
                                        }).map((_, index) => {
                                            const middleRow = Math.floor(
                                                variables / 2
                                            );

                                            return (
                                                <div
                                                    key={index}
                                                    className="grid w-full grid-cols-[1.5rem_1fr_1.5rem] items-center justify-center gap-3"
                                                >
                                                    <span className="text-center text-2xl text-[#1d1d1d]">
                                                        {index === middleRow
                                                            ? '×'
                                                            : ''}
                                                    </span>

                                                    <span className="rounded-xl bg-[#fffaf4] px-4 py-3 text-center font-montserrat text-lg font-bold text-[#999999] shadow">
                                                        x{index + 1}
                                                    </span>

                                                    <span className="text-center text-2xl text-[#1d1d1d]">
                                                        {index === middleRow
                                                            ? '='
                                                            : ''}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="rounded-xl bg-[#eadccb] p-5 shadow-inner">
                                        <div className="flex flex-col gap-5">
                                            {vectorB.map((cell, index) => (
                                                <input
                                                    key={index}
                                                    type="number"
                                                    step="any"
                                                    value={cell}
                                                    placeholder={`b${index + 1
                                                        }`}
                                                    onChange={(event) =>
                                                        handleVectorChange(
                                                            index,
                                                            event.target.value
                                                        )
                                                    }
                                                    className="h-12 rounded-xl bg-[#fffaf4] text-center font-montserrat text-lg text-[#653018] shadow outline-none transition placeholder:text-[#a8a8a8] focus:ring-2 focus:ring-[#733615]"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end px-10 pb-7">
                                    <button
                                        type="button"
                                        onClick={clearFields}
                                        className="flex items-center gap-2 font-montserrat text-sm font-medium text-red-600 transition hover:text-red-700"
                                    >
                                        <img
                                            src="/images/bin-half.png"
                                            alt=""
                                            className="h-5 w-5 object-contain"
                                        />
                                        Limpar tudo
                                    </button>
                                </div>
                            </div>

                            <ResultCard result={result} variables={variables} />
                        </div>

                        <div className="mt-6 flex flex-col items-center gap-4 lg:flex-row lg:justify-end lg:pr-[17rem]">
                            <button
                                type="button"
                                onClick={calculateSolution}
                                className="flex items-center gap-3 rounded-xl bg-[#a77b5f] px-8 py-3 font-inter text-xl font-black text-white shadow-md transition hover:bg-[#8d6349]"
                            >
                                <img
                                    src="/images/calculator.png"
                                    alt=""
                                    className="h-6 w-6 object-contain"
                                />
                                Calcular solução
                            </button>

                            {isLoggedIn && (
                                <button
                                    type="button"
                                    onClick={saveProject}
                                    className="flex items-center gap-3 rounded-xl bg-[#733615] px-8 py-3 font-inter text-xl font-black text-white shadow-md transition hover:bg-[#5b2a10]"
                                >
                                    Salvar projeto
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                <Footer />
            </main>
        </>
    );
}

function ResultCard({ result, variables }) {
    return (
        <div className="overflow-hidden rounded-xl bg-white shadow-md">
            <div className="bg-[#eadccb] px-6 py-4 text-center font-inter text-lg font-black text-[#653018]">
                Resultado
            </div>

            <div className="flex min-h-[25rem] flex-col justify-center px-7 py-8">
                {!result && (
                    <div className="space-y-12">
                        {Array.from({ length: variables }).map((_, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-center gap-4 font-montserrat text-2xl font-bold text-[#653018]"
                            >
                                <span className="rounded-xl bg-[#a77b5f] px-5 py-3 text-white">
                                    x{index + 1}
                                </span>
                                <span>=</span>
                            </div>
                        ))}
                    </div>
                )}

                {result?.type === 'unique' && (
                    <div className="flex h-full flex-col justify-between">
                        <div className="space-y-10">
                            {result.solution.map((value, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-center gap-4 font-montserrat text-xl font-bold text-[#653018]"
                                >
                                    <span className="rounded-xl bg-[#a77b5f] px-5 py-3 text-white">
                                        x{index + 1}
                                    </span>
                                    <span>=</span>
                                    <span>{formatNumber(value)}</span>
                                </div>
                            ))}
                        </div>

                        <p className="mt-10 text-center font-montserrat text-sm font-semibold leading-relaxed text-[#777777]">
                            Método:
                            <br />
                            Eliminação Gauss-Jordan
                        </p>
                    </div>
                )}

                {result?.type === 'no_solution' && (
                    <p className="text-center font-montserrat text-base font-semibold leading-relaxed text-[#777777]">
                        Sistema impossível.
                        <br />
                        Não existe solução única.
                    </p>
                )}

                {result?.type === 'infinite' && (
                    <p className="text-center font-montserrat text-base font-semibold leading-relaxed text-[#777777]">
                        Sistema possível e indeterminado.
                        <br />
                        Infinitas soluções.
                    </p>
                )}
            </div>
        </div>
    );
}

function createMatrix(size) {
    return Array.from({ length: size }, () => Array(size).fill(''));
}

function createVector(size) {
    return Array(size).fill('');
}

function resizeMatrix(currentMatrix, newSize) {
    return Array.from({ length: newSize }, (_, rowIndex) =>
        Array.from(
            { length: newSize },
            (_, colIndex) => currentMatrix[rowIndex]?.[colIndex] ?? ''
        )
    );
}

function resizeVector(currentVector, newSize) {
    return Array.from(
        { length: newSize },
        (_, index) => currentVector[index] ?? ''
    );
}

function parseInputNumber(value) {
    if (value === '' || value === null || value === undefined) {
        return 0;
    }

    const normalizedValue = String(value).replace(',', '.');
    const number = Number(normalizedValue);

    return Number.isNaN(number) ? 0 : number;
}

function solveLinearSystem(matrixA, vectorB) {
    const size = matrixA.length;
    const epsilon = 1e-10;

    const augmentedMatrix = matrixA.map((row, rowIndex) => [
        ...row.map((value) => Number(value)),
        Number(vectorB[rowIndex]),
    ]);

    let pivotRow = 0;

    for (let col = 0; col < size && pivotRow < size; col++) {
        let bestRow = pivotRow;

        for (let row = pivotRow + 1; row < size; row++) {
            if (
                Math.abs(augmentedMatrix[row][col]) >
                Math.abs(augmentedMatrix[bestRow][col])
            ) {
                bestRow = row;
            }
        }

        if (Math.abs(augmentedMatrix[bestRow][col]) < epsilon) {
            continue;
        }

        if (bestRow !== pivotRow) {
            const temporaryRow = augmentedMatrix[pivotRow];
            augmentedMatrix[pivotRow] = augmentedMatrix[bestRow];
            augmentedMatrix[bestRow] = temporaryRow;
        }

        const pivotValue = augmentedMatrix[pivotRow][col];

        for (let j = col; j <= size; j++) {
            augmentedMatrix[pivotRow][j] =
                augmentedMatrix[pivotRow][j] / pivotValue;
        }

        for (let row = 0; row < size; row++) {
            if (row === pivotRow) continue;

            const factor = augmentedMatrix[row][col];

            for (let j = col; j <= size; j++) {
                augmentedMatrix[row][j] =
                    augmentedMatrix[row][j] -
                    factor * augmentedMatrix[pivotRow][j];
            }
        }

        pivotRow++;
    }

    for (let row = 0; row < size; row++) {
        const allCoefficientsAreZero = augmentedMatrix[row]
            .slice(0, size)
            .every((value) => Math.abs(value) < epsilon);

        const independentTermIsNotZero =
            Math.abs(augmentedMatrix[row][size]) >= epsilon;

        if (allCoefficientsAreZero && independentTermIsNotZero) {
            return {
                type: 'no_solution',
            };
        }
    }

    const rank = augmentedMatrix.filter((row) =>
        row.slice(0, size).some((value) => Math.abs(value) >= epsilon)
    ).length;

    if (rank < size) {
        return {
            type: 'infinite',
        };
    }

    const solution = Array(size).fill(0);

    for (let row = 0; row < size; row++) {
        const pivotColumn = augmentedMatrix[row]
            .slice(0, size)
            .findIndex((value) => Math.abs(value) >= epsilon);

        if (pivotColumn !== -1) {
            solution[pivotColumn] = augmentedMatrix[row][size];
        }
    }

    return {
        type: 'unique',
        solution,
    };
}

function formatNumber(value) {
    const roundedValue = Number(value.toFixed(4));

    if (Object.is(roundedValue, -0)) {
        return '0';
    }

    return roundedValue.toString();
}
