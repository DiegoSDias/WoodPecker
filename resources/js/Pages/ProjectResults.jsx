import Footer from '@/Components/Footer';
import Header from '@/Components/Header';
import GraphicalResult from '@/Components/ProjectResults/GraphicalResult';
import DualResult from '@/Components/ProjectResults/DualResult';
import IntegerResult from '@/Components/ProjectResults/IntegerResult';
import OverviewResult from '@/Components/ProjectResults/OverviewResult';
import ResultsSidebar from '@/Components/ProjectResults/ResultsSidebar';
import SimplexResult from '@/Components/ProjectResults/SimplexResult';
import {
    extractProject,
    extractResultData,
    extractSolutions,
    getLatestSolutionByMethod,
} from '@/Components/ProjectResults/projectResultsUtils';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';

export const RESULT_TABS = [
    {
        key: 'overview',
        label: 'Visão Geral',
        icon: '/images/layout-dashboard.png',
        type: 'view',
    },
    {
        key: 'simplex',
        label: 'Método Simplex',
        icon: '/images/brown-table.png',
        type: 'solve',
    },
    {
        key: 'graphical',
        label: 'Método Gráfico',
        icon: '/images/chart-dots.png',
        fallbackIcon: '/images/git-merge.png',
        type: 'solve',
    },
    {
        key: 'dual',
        label: 'Problema Dual',
        icon: '/images/arrows-left-right.png',
        type: 'solve',
    },
    {
        key: 'integer',
        label: 'Solução Inteira',
        icon: '/images/git-merge.png',
        type: 'solve',
    },
];

export default function ProjectResults({ auth, projectId }) {
    const [activeTab, setActiveTab] = useState('overview');
    const [project, setProject] = useState(null);
    const [solutions, setSolutions] = useState([]);
    const [runtimeResults, setRuntimeResults] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [loadingMethod, setLoadingMethod] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        loadProjectData();
    }, [projectId]);

    const currentSavedSolution = useMemo(() => {
        return getLatestSolutionByMethod(solutions, activeTab);
    }, [solutions, activeTab]);

    const currentRuntimeResult = runtimeResults[activeTab];

    const currentResultData = useMemo(() => {
        if (currentRuntimeResult) {
            return extractResultData(currentRuntimeResult);
        }

        if (currentSavedSolution) {
            return extractResultData(currentSavedSolution);
        }

        return null;
    }, [currentRuntimeResult, currentSavedSolution]);

    async function loadProjectData() {
        try {
            setIsLoading(true);
            setErrorMessage('');

            const [projectResponse, solutionsResponse] = await Promise.all([
                axios.get(`/projects/${projectId}`),
                axios.get(`/projects/${projectId}/solutions`),
            ]);

            setProject(extractProject(projectResponse.data));
            setSolutions(extractSolutions(solutionsResponse.data));
        } catch (error) {
            setErrorMessage(
                error?.response?.data?.message ||
                    'Não foi possível carregar os dados do projeto.'
            );
        } finally {
            setIsLoading(false);
        }
    }

    async function handleTabClick(tab) {
        setActiveTab(tab.key);

        if (tab.type !== 'solve') {
            return;
        }

        const alreadySaved = getLatestSolutionByMethod(solutions, tab.key);

        if (alreadySaved || runtimeResults[tab.key]) {
            return;
        }

        try {
            setLoadingMethod(tab.key);
            setErrorMessage('');

            const response = await axios.post(
                `/projects/${projectId}/solve/${tab.key}`
            );

            setRuntimeResults((previousResults) => ({
                ...previousResults,
                [tab.key]: response.data,
            }));

            const refreshedSolutions = await axios.get(
                `/projects/${projectId}/solutions`
            );

            setSolutions(extractSolutions(refreshedSolutions.data));
        } catch (error) {
            setErrorMessage(
                error?.response?.data?.message ||
                    `Não foi possível executar o método ${tab.label}.`
            );
        } finally {
            setLoadingMethod(null);
        }
    }

    return (
        <>
            <Head title="Resultados do Projeto" />

            <main className="min-h-screen bg-white font-montserrat text-[#2b211b]">
                <Header auth={auth} activePage="meus-projetos" />

                <section className="flex min-h-[calc(100vh-12.5rem)] bg-white">
                    <ResultsSidebar
                        project={project}
                        tabs={RESULT_TABS}
                        activeTab={activeTab}
                        loadingMethod={loadingMethod}
                        onTabClick={handleTabClick}
                    />

                    <section className="min-w-0 flex-1 px-12 py-10">
                        {errorMessage && (
                            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                                {errorMessage}
                            </div>
                        )}

                        {isLoading ? (
                            <EmptyState
                                title="Carregando projeto..."
                                description="Aguarde enquanto os dados do projeto são carregados."
                            />
                        ) : (
                            <ResultContent
                                activeTab={activeTab}
                                project={project}
                                solutions={solutions}
                                resultData={currentResultData}
                                savedSolution={currentSavedSolution}
                                loadingMethod={loadingMethod}
                            />
                        )}
                    </section>
                </section>

                <Footer />
            </main>
        </>
    );
}

function ResultContent({
    activeTab,
    project,
    solutions,
    resultData,
    savedSolution,
    loadingMethod,
}) {
    if (activeTab === 'overview') {
        return <OverviewResult project={project} solutions={solutions} />;
    }

    if (loadingMethod === activeTab) {
        return (
            <EmptyState
                title="Calculando..."
                description="Aguarde enquanto o método selecionado é processado."
            />
        );
    }

    if (!resultData) {
        return (
            <EmptyState
                title="Resultado ainda não disponível"
                description="Este método ainda não possui solução registrada para este projeto."
            />
        );
    }

    if (activeTab === 'simplex') {
        return (
            <SimplexResult
                data={resultData}
                savedSolution={savedSolution}
                project={project}
            />
        );
    }

    if (activeTab === 'graphical') {
        return <GraphicalResult data={resultData} project={project} />;
    }

    if (activeTab === 'dual') {
        return (
            <DualResult
                data={resultData}
                savedSolution={savedSolution}
                project={project}
            />
        );
    }

    if (activeTab === 'integer') {
        return (
            <IntegerResult
                data={resultData}
                savedSolution={savedSolution}
                project={project}
                solutions={solutions}
            />
        );
    }

    return null;
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