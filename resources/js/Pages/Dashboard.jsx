import Header from '@/Components/Header';
import { Head } from '@inertiajs/react';
import { useRef } from 'react';

export default function Dashboard() {
    const resourcesRef = useRef(null);
    const modulesRef = useRef(null);

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

    return (
        <>
            <Head title="Dashboard" />

            <main className="min-h-screen bg-white font-montserrat text-[#2b211b]">
                <Header
                    activePage="inicio"
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

                                    <h3 className="font-inter text-xl font-black text-[#653018]">
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

                                    <h3 className="font-inter text-xl font-black text-[#653018]">
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

                                    <h3 className="font-inter text-xl font-black text-[#653018]">
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
                                <button
                                    type="button"
                                    className="grid w-full grid-cols-[1fr_1.2fr] overflow-hidden rounded-xl bg-[#eadccb] text-left shadow-md transition hover:scale-[1.01]"
                                >
                                    <div className="flex items-center gap-10 px-12 py-6">
                                        <img
                                            src="/images/chart-dots.png"
                                            alt=""
                                            className="h-12 w-12 object-contain"
                                        />

                                        <strong className="font-inter text-2xl font-black text-[#653018]">
                                            EQUAÇÃO LINEAR
                                        </strong>
                                    </div>

                                    <div className="border-l border-[#b38563] px-12 py-5 text-lg text-[#333333]">
                                        <ul className="list-disc space-y-2">
                                            <li>Gauss-Jordan</li>
                                            <li>Escalonamento</li>
                                            <li>Matrizes</li>
                                        </ul>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    className="grid w-full grid-cols-[1fr_1.2fr] overflow-hidden rounded-xl bg-[#eadccb] text-left shadow-md transition hover:scale-[1.01]"
                                >
                                    <div className="flex items-center gap-10 px-12 py-6">
                                        <img
                                            src="/images/chart-line.png"
                                            alt=""
                                            className="h-12 w-12 object-contain"
                                        />

                                        <strong className="font-inter text-2xl font-black text-[#653018]">
                                            PROGRAMAÇÃO LINEAR
                                        </strong>
                                    </div>

                                    <div className="border-l border-[#b38563] px-12 py-5 text-lg text-[#333333]">
                                        <ul className="list-disc space-y-2">
                                            <li>Simplex</li>
                                            <li>Região Viável</li>
                                            <li>Análise de Sensibilidade</li>
                                        </ul>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    className="grid w-full grid-cols-[1fr_1.2fr] overflow-hidden rounded-xl bg-[#eadccb] text-left shadow-md transition hover:scale-[1.01]"
                                >
                                    <div className="flex items-center gap-10 px-12 py-6">
                                        <img
                                            src="/images/chart-bar.png"
                                            alt=""
                                            className="h-12 w-12 object-contain"
                                        />

                                        <strong className="font-inter text-2xl font-black text-[#653018]">
                                            PROGRAMAÇÃO INTEIRA
                                        </strong>
                                    </div>

                                    <div className="border-l border-[#b38563] px-12 py-5 text-lg text-[#333333]">
                                        <ul className="list-disc space-y-2">
                                            <li>Branch and Bound</li>
                                            <li>Restrições Inteiras</li>
                                            <li>Soluções Otimizadas</li>
                                        </ul>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <footer
                    className="h-[5rem] bg-cover bg-center bg-no-repeat"
                    style={{
                        backgroundImage: "url('/images/wood-background.png')",
                    }}
                />
            </main>
        </>
    );
}
