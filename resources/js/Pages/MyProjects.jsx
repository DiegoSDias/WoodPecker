import Footer from '@/Components/Footer';
import Header from '@/Components/Header';
import { Head, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';

export default function MyProjects({ auth, projects = [] }) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredProjects = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        if (!normalizedSearch) {
            return projects;
        }

        return projects.filter((project) => {
            const title = String(project.title || '').toLowerCase();
            const description = String(project.description || '').toLowerCase();

            return (
                title.includes(normalizedSearch) ||
                description.includes(normalizedSearch)
            );
        });
    }, [projects, searchTerm]);

    function handleViewProject(projectId) {
        router.visit(route('projects.me.show', projectId));
    }

    function handleDeleteProject(projectId) {
        router.delete(route('projects.me.destroy', projectId));
    }

    function handleBack() {
        router.visit(route('dashboard'));
    }

    return (
        <>
            <Head title="Meus Projetos" />

            <main className="min-h-screen bg-white font-montserrat text-[#2b211b]">
                <Header auth={auth} activePage="meus-projetos" />

                <section className="bg-white px-10 py-8">
                    <div className="mx-auto max-w-[78rem]">
                        <button
                            type="button"
                            onClick={handleBack}
                            className="mb-10 text-4xl font-light text-[#653018] transition hover:-translate-x-1"
                            aria-label="Voltar"
                        >
                            ←
                        </button>

                        <div className="flex items-center gap-6">
                            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#733615]">
                                <img
                                    src="/images/folder-outline.png"
                                    alt=""
                                    className="h-10 w-10 object-contain"
                                />
                            </div>

                            <h1 className="font-inter text-[2.6rem] font-black text-[#653018]">
                                Meus Projetos
                            </h1>
                        </div>

                        <p className="mt-8 max-w-[62rem] font-montserrat text-xl leading-relaxed text-[#777777]">
                            Gerencie seus projetos criados, visualize suas
                            informações e retome a edição sempre que necessário.
                        </p>

                        <div className="mt-8 flex justify-end">
                            <div className="flex w-full max-w-[18rem] items-center gap-3 rounded-md bg-[#fffaf4] px-4 py-2 shadow-sm">
                                <img
                                    src="/images/search-outline.png"
                                    alt=""
                                    className="h-5 w-5 object-contain"
                                />

                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(event) =>
                                        setSearchTerm(event.target.value)
                                    }
                                    placeholder="Pesquisar projeto..."
                                    className="w-full bg-transparent font-montserrat text-sm text-[#653018] outline-none placeholder:text-[#b8b0aa]"
                                />
                            </div>
                        </div>

                        <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-md">
                            <table className="w-full table-fixed text-center">
                                <thead className="bg-[#eadccb] font-inter text-xl font-black text-[#653018]">
                                    <tr>
                                        <th className="w-[22%] px-5 py-5">
                                            Nome do projeto
                                        </th>
                                        <th className="w-[30%] px-5 py-5">
                                            Descrição
                                        </th>
                                        <th className="w-[20%] px-5 py-5">
                                            Data de criação
                                        </th>
                                        <th className="w-[20%] px-5 py-5">
                                            Última edição
                                        </th>
                                        <th className="w-[8%] px-5 py-5">
                                            Ações
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredProjects.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan="5"
                                                className="px-6 py-20 text-center font-montserrat text-base text-[#2b211b]"
                                            >
                                                {projects.length === 0
                                                    ? 'Você ainda não possui projetos cadastrados.'
                                                    : 'Nenhum projeto encontrado para a pesquisa informada.'}
                                            </td>
                                        </tr>
                                    )}

                                    {filteredProjects.map((project) => (
                                        <tr
                                            key={project.id}
                                            className="border-t border-[#d7c7ba] bg-[#fffdfb]"
                                        >
                                            <td className="px-5 py-7 font-montserrat text-base font-bold text-[#111111]">
                                                {project.title || 'Sem nome'}
                                            </td>

                                            <td className="px-5 py-7 font-montserrat text-base leading-relaxed text-[#2b211b]">
                                                {formatDescription(
                                                    project.description
                                                )}
                                            </td>

                                            <td className="px-5 py-7 font-montserrat text-base text-[#2b211b]">
                                                {formatDateTime(
                                                    project.created_at
                                                )}
                                            </td>

                                            <td className="px-5 py-7 font-montserrat text-base text-[#2b211b]">
                                                {formatDateTime(
                                                    project.updated_at
                                                )}
                                            </td>

                                            <td className="px-5 py-7">
                                                <div className="flex items-center justify-center gap-2">
                                                    <ActionButton
                                                        icon="/images/eye-empty.png"
                                                        label="Visualizar projeto"
                                                        onClick={() =>
                                                            handleViewProject(
                                                                project.id
                                                            )
                                                        }
                                                    />

                                                    <ActionButton
                                                        icon="/images/pencil.png"
                                                        label="Editar projeto"
                                                        disabled
                                                    />

                                                    <ActionButton
                                                        icon="/images/trash-outline.png"
                                                        label="Excluir projeto"
                                                        onClick={() =>
                                                            handleDeleteProject(
                                                                project.id
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                <Footer />
            </main>
        </>
    );
}

function ActionButton({ icon, label, onClick, disabled = false }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={disabled ? `${label} indisponível no momento` : label}
            className={`flex h-8 w-8 items-center justify-center rounded-md bg-[#a77b5f] transition ${
                disabled
                    ? 'cursor-not-allowed opacity-60'
                    : 'hover:scale-105 hover:bg-[#8d6349]'
            }`}
            aria-label={label}
        >
            <img src={icon} alt="" className="h-5 w-5 object-contain" />
        </button>
    );
}

function formatDescription(description) {
    if (!description) {
        return 'Sem descrição';
    }

    if (description.length <= 80) {
        return description;
    }

    return `${description.slice(0, 80)}...`;
}

function formatDateTime(value) {
    if (!value) {
        return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '-';
    }

    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}