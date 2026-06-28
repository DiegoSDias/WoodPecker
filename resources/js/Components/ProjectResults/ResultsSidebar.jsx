import { formatDateTimeShort } from './projectResultsUtils';
import { useState } from 'react';

export default function ResultsSidebar({
    project,
    tabs,
    activeTab,
    loadingMethod,
    onTabClick,
}) {
    return (
        <aside className="w-[18.5rem] shrink-0 border-r border-[#d9d0ca] bg-white px-5 py-6 shadow-[4px_0_10px_rgba(0,0,0,0.08)]">
            <button
                type="button"
                className="mb-6 flex h-10 w-10 items-center justify-center"
                aria-label="Menu"
            >
                <img
                    src="/images/menu-outline.png"
                    alt=""
                    className="h-8 w-8 object-contain"
                />
            </button>

            <ProjectSidebarCard project={project} />

            <div className="mt-8">
                <h2 className="mb-5 font-inter text-2xl font-black text-[#653018]">
                    Resultados
                </h2>

                <nav className="space-y-2">
                    {tabs.map((tab) => (
                        <SidebarButton
                            key={tab.key}
                            tab={tab}
                            isActive={activeTab === tab.key}
                            isLoading={loadingMethod === tab.key}
                            onClick={() => onTabClick(tab)}
                        />
                    ))}
                </nav>
            </div>
        </aside>
    );
}

function ProjectSidebarCard({ project }) {
    return (
        <div className="rounded-xl border border-[#d7c7ba] bg-white px-5 py-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
                <img
                    src="/images/folder-outline.png"
                    alt=""
                    className="h-5 w-5 object-contain"
                />

                <h2 className="font-inter text-xl font-black text-[#653018]">
                    Projeto
                </h2>
            </div>

            <SidebarProjectInfo
                icon="/images/brown-pencil.png"
                label="Nome"
                value={project?.title || 'Sem nome'}
            />

            <SidebarProjectInfo
                icon="/images/reader-outline.png"
                label="Descrição"
                value={project?.description || 'Sem descrição'}
            />

            <div className="mt-5 grid grid-cols-2 gap-4">
                <div>
                    <p className="font-inter text-sm font-black text-[#653018]">
                        Criado em
                    </p>

                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#999999]">
                        {formatDateTimeShort(project?.created_at)}
                    </p>
                </div>

                <div>
                    <p className="font-inter text-sm font-black text-[#653018]">
                        Última edição
                    </p>

                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#999999]">
                        {formatDateTimeShort(project?.updated_at)}
                    </p>
                </div>
            </div>
        </div>
    );
}

function SidebarProjectInfo({ icon, label, value }) {
    return (
        <div className="mb-4">
            <div className="mb-2 flex items-center gap-2">
                <img src={icon} alt="" className="h-4 w-4 object-contain" />

                <p className="font-inter text-sm font-black text-[#653018]">
                    {label}
                </p>
            </div>

            <p className="line-clamp-4 text-sm leading-relaxed text-[#999999]">
                {value}
            </p>
        </div>
    );
}

function SidebarButton({ tab, isActive, isLoading, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex w-full items-center gap-4 rounded-md px-5 py-3 text-left font-montserrat text-base font-bold transition ${
                isActive
                    ? 'bg-[#eadccb] text-[#653018]'
                    : 'text-[#653018] hover:bg-[#f4ebe3]'
            }`}
        >
            <ImageWithFallback
                src={tab.icon}
                fallbackSrc={tab.fallbackIcon}
                alt=""
                className="h-8 w-8 shrink-0 object-contain"
            />

            <span className="flex-1">{tab.label}</span>

            {isLoading && (
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#653018]" />
            )}
        </button>
    );
}

function ImageWithFallback({ src, fallbackSrc, alt = '', className = '' }) {
    const [currentSrc, setCurrentSrc] = useState(src);

    return (
        <img
            src={currentSrc}
            alt={alt}
            className={className}
            onError={() => {
                if (fallbackSrc && currentSrc !== fallbackSrc) {
                    setCurrentSrc(fallbackSrc);
                }
            }}
        />
    );
}