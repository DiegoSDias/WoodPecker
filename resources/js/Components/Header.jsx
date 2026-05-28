import { Link } from '@inertiajs/react';

export default function Header({
    onScrollToResources,
    onScrollToModules,
    auth,
    activePage = 'inicio',
}) {
    const isLoggedIn = Boolean(auth?.user);

    const getMenuClass = (page) => {
        const baseClass =
            'rounded-full px-4 py-1.5 transition hover:bg-[#eadccb] hover:text-[#653018]';

        const activeClass = 'bg-[#eadccb] text-[#653018] font-semibold';

        return activePage === page
            ? `${baseClass} ${activeClass}`
            : `${baseClass} text-[#653018]`;
    };

    return (
        <header
            className="h-[7.5rem] bg-cover bg-center bg-no-repeat"
            style={{
                backgroundImage: "url('/images/wood-background.png')",
            }}
        >
            <div className="mx-auto flex h-full max-w-[78rem] items-center justify-between px-10">
                <Link href="/" className="flex items-center">
                    <img
                        src="/images/logo-woodpecker-horizontal.png"
                        alt="Woodpecker"
                        className="w-[14rem] object-contain"
                    />
                </Link>

                <nav className="rounded-full bg-white px-3 py-2 shadow-md">
                    <ul className="flex items-center gap-2 font-montserrat text-base font-medium">
                        <li>
                            <button
                                type="button"
                                onClick={() =>
                                    window.scrollTo({
                                        top: 0,
                                        behavior: 'smooth',
                                    })
                                }
                                className="rounded-full bg-[#eadccb] px-4 py-1.5 font-semibold text-[#653018] transition hover:bg-[#eadccb]"
                            >
                                Início
                            </button>
                        </li>

                        <li>
                            <button
                                type="button"
                                onClick={onScrollToResources}
                                className={getMenuClass('recursos')}
                            >
                                Recursos
                            </button>
                        </li>

                        <li>
                            <Link
                                href={isLoggedIn ? route('dashboard') : route('login')}
                                className={getMenuClass('projetos')}
                            >
                                Meus projetos
                            </Link>
                        </li>
                    </ul>
                </nav>

                <Link
                    href={isLoggedIn ? route('profile.edit') : route('login')}
                    className="flex items-center"
                >
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
