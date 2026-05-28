import Header from '@/Components/Header';
import { Head, router } from '@inertiajs/react';
import { useRef, useState } from 'react';

export default function Welcome({ auth }) {
    const resourcesRef = useRef(null);
    const modulesRef = useRef(null);
    const guestFormRef = useRef(null);

    const [showAccessModal, setShowAccessModal] = useState(false);
    const [selectedModule, setSelectedModule] = useState(null);
    const [isGuestMode, setIsGuestMode] = useState(false);

    const scrollToResources = () => {
        resourcesRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    };

    const scrollToModules = () => {
        modulesRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    };

    const handleModuleClick = (moduleName) => {
        setSelectedModule(moduleName);
        setShowAccessModal(true);
    };

    const handleLoginRedirect = () => {
        router.visit(route('login'));
    };

    const handleContinueWithoutLogin = () => {
        setIsGuestMode(true);
        setShowAccessModal(false);

        setTimeout(() => {
            guestFormRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }, 150);
    };

    return (
        <>
            <Head title="Woodpecker" />

            <main className="min-h-screen bg-white font-montserrat text-[#2b211b]">
                <Header
                    auth={auth}
                    onScrollToResources={scrollToResources}
                    onScrollToModules={scrollToModules}
                />

                <section className="mx-auto grid max-w-[78rem] grid-cols-1 items-center gap-10 px-10 py-20 lg:grid-cols-[1fr_1fr]">
                    <div>
                        <h1 className="max-w-[33rem] font-inter text-[2.7rem] font-black leading-tight text-[#1d1d1d]">
                            Método Simplex e
                            <br />
                            <span className="text-[#653018]">
                                Otimização Linear
                            </span>
                        </h1>

                        <p className="mt-8 max-w-[36rem] text-xl leading-relaxed text-[#333333]">
                            Modele restrições, defina a função objetivo e
                            acompanhe cada etapa da resolução pelo método
                            simplex com visualização clara e apoio ao
                            aprendizado.
                        </p>

                        <div className="mt-10 flex flex-wrap gap-7">
                            <button
                                type="button"
                                onClick={scrollToModules}
                                className="flex items-center gap-3 rounded-lg bg-[#733615] px-6 py-3 text-xl font-bold text-white shadow-md transition hover:bg-[#5b2a10]"
                            >
                                <img
                                    src="/images/add-circle-outline.png"
                                    alt=""
                                    className="h-6 w-6"
                                />
                                Novo problema
                            </button>

                            <button
                                type="button"
                                onClick={scrollToResources}
                                className="flex items-center gap-3 rounded-lg bg-[#eadccb] px-6 py-3 text-xl font-bold text-[#653018] shadow-sm transition hover:bg-[#dfcbb6]"
                            >
                                <img
                                    src="/images/open-book.png"
                                    alt=""
                                    className="h-6 w-6"
                                />
                                Recursos
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-center lg:justify-end">
                        <img
                            src="/images/figure-woodpecker.png"
                            alt="Ilustração do método simplex"
                            className="w-full max-w-[32rem] object-contain"
                        />
                    </div>
                </section>

                <section
                    ref={resourcesRef}
                    id="recursos"
                    className="bg-[#faf7f3] px-10 py-16"
                >
                    <div className="mx-auto max-w-[78rem]">
                        <div className="text-center">
                            <h2 className="font-inter text-[2.7rem] font-black text-[#653018]">
                                Recursos Principais
                            </h2>

                            <p className="mx-auto mt-6 max-w-[48rem] text-xl leading-relaxed text-[#333333]">
                                Tudo o que você precisa para modelar,
                                visualizar e analisar problemas de programação
                                linear em um só ambiente.
                            </p>
                        </div>

                        <div className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-3">
                            <article className="rounded-xl bg-[#eadccb] px-6 py-7 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#733615]">
                                        <img
                                            src="/images/analytics-outline.png"
                                            alt=""
                                            className="h-7 w-7"
                                        />
                                    </div>

                                    <h3 className="text-xl font-black text-[#653018]">
                                        Método Simplex
                                    </h3>
                                </div>

                                <p className="mt-8 text-lg leading-relaxed text-[#333333]">
                                    Acompanhe cada etapa do algoritmo com
                                    tabelas organizadas, pivôs destacados e
                                    resultados apresentados de forma clara para
                                    facilitar análise e aprendizado.
                                </p>
                            </article>

                            <article className="rounded-xl bg-[#eadccb] px-6 py-7 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#733615]">
                                        <img
                                            src="/images/enlarge.png"
                                            alt=""
                                            className="h-7 w-7"
                                        />
                                    </div>

                                    <h3 className="text-xl font-black text-[#653018]">
                                        Visualização Gráfica
                                    </h3>
                                </div>

                                <p className="mt-8 text-lg leading-relaxed text-[#333333]">
                                    Observe as restrições no plano cartesiano,
                                    identifique a área viável e visualize o
                                    ponto ótimo de forma intuitiva em problemas
                                    bidimensionais.
                                </p>
                            </article>

                            <article className="rounded-xl bg-[#eadccb] px-6 py-7 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#733615]">
                                        <img
                                            src="/images/sensibility.png"
                                            alt=""
                                            className="h-7 w-7"
                                        />
                                    </div>

                                    <h3 className="text-xl font-black text-[#653018]">
                                        Análise de Sensibilidade
                                    </h3>
                                </div>

                                <p className="mt-8 text-lg leading-relaxed text-[#333333]">
                                    Avalie limites, variações e impactos nas
                                    restrições para entender como alterações nos
                                    dados afetam a solução encontrada.
                                </p>
                            </article>
                        </div>
                    </div>
                </section>

                <section ref={modulesRef} className="px-10 py-20">
                    <div className="mx-auto max-w-[78rem]">
                        <div className="text-center">
                            <h2 className="font-inter text-[2.7rem] font-black text-[#653018]">
                                Novo Problema
                            </h2>

                            <p className="mx-auto mt-5 max-w-[50rem] text-xl leading-relaxed text-[#333333]">
                                Nesta etapa você poderá estruturar seu problema
                                matemático e selecionar o módulo mais adequado
                                para análise e resolução.
                            </p>
                        </div>

                        <div className="mt-14">
                            <h3 className="font-inter text-[2rem] font-black text-[#1d1d1d]">
                                Selecione um{' '}
                                <span className="text-[#653018]">Módulo</span>
                            </h3>

                            <p className="mt-6 text-xl text-[#333333]">
                                Escolha abaixo a ferramenta ideal para montar e
                                resolver seu problema.
                            </p>

                            <div className="mx-auto mt-12 max-w-[56rem] space-y-6">
                                <ModuleButton
                                    icon="/images/chart-dots.png"
                                    title="EQUAÇÃO LINEAR"
                                    items={[
                                        'Gauss-Jordan',
                                        'Escalonamento',
                                        'Matrizes',
                                    ]}
                                    onClick={() =>
                                        handleModuleClick('equacao-linear')
                                    }
                                />

                                <ModuleButton
                                    icon="/images/chart-line.png"
                                    title="PROGRAMAÇÃO LINEAR"
                                    items={[
                                        'Simplex',
                                        'Região Viável',
                                        'Análise de Sensibilidade',
                                    ]}
                                    onClick={() =>
                                        handleModuleClick(
                                            'programacao-linear'
                                        )
                                    }
                                />

                                <ModuleButton
                                    icon="/images/chart-bar.png"
                                    title="PROGRAMAÇÃO INTEIRA"
                                    items={[
                                        'Branch and Bound',
                                        'Restrições Inteiras',
                                        'Soluções Otimizadas',
                                    ]}
                                    onClick={() =>
                                        handleModuleClick(
                                            'programacao-inteira'
                                        )
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {isGuestMode && (
                    <section
                        ref={guestFormRef}
                        className="bg-[#faf7f3] px-10 py-16"
                    >
                        <div className="mx-auto max-w-[78rem]">
                            <div className="rounded-xl border border-[#d6bfa8] bg-white p-8 shadow-md">
                                <div className="rounded-lg bg-[#fff3cd] px-5 py-4 text-[#7a4b00]">
                                    Você está usando o sistema sem login. O
                                    problema poderá ser resolvido, mas não será
                                    salvo em “Meus projetos”.
                                </div>

                                <h2 className="mt-8 font-inter text-[2rem] font-black text-[#653018]">
                                    Inserir dados do problema
                                </h2>

                                <p className="mt-3 text-lg text-[#333333]">
                                    Módulo selecionado:{' '}
                                    <span className="font-bold text-[#653018]">
                                        {formatModuleName(selectedModule)}
                                    </span>
                                </p>

                                <div className="mt-8 rounded-lg border border-dashed border-[#b38563] bg-[#faf7f3] p-8 text-center text-lg text-[#653018]">
                                    Área reservada para o formulário do módulo
                                    selecionado.
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                <footer
                    className="h-[5rem] bg-cover bg-center bg-no-repeat"
                    style={{
                        backgroundImage: "url('/images/wood-background.png')",
                    }}
                />

                {showAccessModal && (
                    <AccessChoiceModal
                        onClose={() => setShowAccessModal(false)}
                        onLogin={handleLoginRedirect}
                        onContinue={handleContinueWithoutLogin}
                    />
                )}
            </main>
        </>
    );
}

function ModuleButton({ icon, title, items, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="grid w-full grid-cols-[1fr_1.2fr] overflow-hidden rounded-xl bg-[#eadccb] text-left shadow-md transition hover:scale-[1.01]"
        >
            <div className="flex items-center gap-10 px-12 py-6">
                <img
                    src={icon}
                    alt=""
                    className="h-12 w-12 object-contain"
                />

                <strong className="text-2xl font-black text-[#653018]">
                    {title}
                </strong>
            </div>

            <div className="border-l border-[#b38563] px-12 py-5 text-lg text-[#333333]">
                <ul className="list-disc space-y-2">
                    {items.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
            </div>
        </button>
    );
}

function AccessChoiceModal({ onClose, onLogin, onContinue }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-[32rem] rounded-2xl bg-white p-8 shadow-2xl">
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-2xl font-bold text-gray-500 transition hover:text-[#653018]"
                    >
                        ×
                    </button>
                </div>

                <h2 className="text-center font-inter text-[2rem] font-black text-[#653018]">
                    Como deseja continuar?
                </h2>

                <p className="mt-4 text-center text-base leading-relaxed text-gray-600">
                    Você pode entrar na sua conta para salvar o projeto ou
                    continuar sem login apenas para testar e resolver o
                    problema.
                </p>

                <div className="mt-8 space-y-4">
                    <button
                        type="button"
                        onClick={onLogin}
                        className="w-full rounded-lg bg-[#733615] px-5 py-3 text-lg font-bold text-white transition hover:bg-[#5b2a10]"
                    >
                        Entrar na minha conta
                    </button>

                    <button
                        type="button"
                        onClick={onContinue}
                        className="w-full rounded-lg bg-[#eadccb] px-5 py-3 text-lg font-bold text-[#653018] transition hover:bg-[#dfcbb6]"
                    >
                        Continuar sem login
                    </button>
                </div>
            </div>
        </div>
    );
}

function formatModuleName(moduleName) {
    const modules = {
        'equacao-linear': 'Equação Linear',
        'programacao-linear': 'Programação Linear',
        'programacao-inteira': 'Programação Inteira',
    };

    return modules[moduleName] || 'Não informado';
}
