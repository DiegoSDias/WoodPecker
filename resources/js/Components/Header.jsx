import { Link } from '@inertiajs/react';

export default function Header({ onScrollToResources, onScrollToModules }) {
    return (
        <header
            className="h-[7.5rem] bg-cover bg-center bg-no-repeat"
            style={{
                backgroundImage: "url('/images/wood-background.png')",
            }}
        >
            <div className="mx-auto flex h-full max-w-[78rem] items-center justify-between px-10">
                <Link href={route('dashboard')} className="flex items-center">
                    <img
                        src="/images/logo-woodpecker-horizontal.png"
                        alt="Woodpecker"
                        className="w-[12rem] object-contain"
                    />
                </Link>

                <nav className="rounded-full bg-white px-6 py-2 shadow-md">
                    <ul className="flex items-center gap-8 font-montserrat text-base font-medium text-[#653018]">
                        <li>
                            <button
                                type="button"
                                onClick={() =>
                                    window.scrollTo({
                                        top: 0,
                                        behavior: 'smooth',
                                    })
                                }
                                className="transition hover:text-[#8a421b]"
                            >
                                Início
                            </button>
                        </li>

                        <li>
                            <button
                                type="button"
                                onClick={onScrollToResources}
                                className="transition hover:text-[#8a421b]"
                            >
                                Recursos
                            </button>
                        </li>

                        <li>
                            <Link
                                href="#"
                                className="transition hover:text-[#8a421b]"
                            >
                                Meus projetos
                            </Link>
                        </li>
                    </ul>
                </nav>

                <Link href={route('profile.edit')} className="flex items-center">
                    <img
                        src="/images/person-circle.png"
                        alt="Perfil do usuário"
                        className="w-[2.4rem] object-contain"
                    />
                </Link>
            </div>
        </header>
    );
}
