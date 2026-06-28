import { Link, router } from '@inertiajs/react';

export default function Header({ auth, activePage = 'inicio' }) {
    const isLoggedIn = Boolean(auth?.user);

    function goToHome() {
        router.visit(route('dashboard'));
    }

    function goToLinearSystems() {
        router.visit(route('linear-systems'));
    }

    function goToSimplex() {
        router.visit(route('mathematical-modeling'));
    }

    function goToProjects() {
        router.visit('/my-projects');
    }

    return (
        <header
            className="sticky top-0 z-50 h-[7.5rem] bg-cover bg-center bg-no-repeat"
            style={{
                backgroundImage: "url('/images/wood-background.png')",
            }}
        >
            <div className="mx-auto flex h-full max-w-[78rem] items-center justify-between px-10">
                <button
                    type="button"
                    onClick={goToHome}
                    className="flex items-center"
                    aria-label="Ir para o início"
                >
                    <img
                        src="/images/logo-woodpecker-horizontal.png"
                        alt="Woodpecker"
                        className="w-[14rem] object-contain"
                    />
                </button>

                <nav className="flex items-center gap-2 rounded-full bg-white px-5 py-3 shadow-md">
                    <HeaderButton
                        label="Início"
                        active={activePage === 'inicio'}
                        onClick={goToHome}
                    />

                    <HeaderButton
                        label="Linear"
                        active={activePage === 'linear'}
                        onClick={goToLinearSystems}
                    />

                    <HeaderButton
                        label="Simplex"
                        active={activePage === 'simplex'}
                        onClick={goToSimplex}
                    />

                    <HeaderButton
                        label="Meus projetos"
                        active={activePage === 'meus-projetos'}
                        onClick={goToProjects}
                    />
                </nav>

                <Link
                    href={isLoggedIn ? route('profile.edit') : route('login')}
                    aria-label={isLoggedIn ? 'Abrir perfil' : 'Entrar na conta'}
                    className="transition hover:scale-105"
                >
                    <img
                        src="/images/person-circle.png"
                        alt=""
                        className="h-12 w-12 object-contain"
                    />
                </Link>
            </div>
        </header>
    );
}

function HeaderButton({ label, active, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-full px-7 py-2 font-montserrat text-base font-medium transition ${
                active
                    ? 'bg-[#eadccb] text-[#653018]'
                    : 'text-[#653018] hover:bg-[#f4ebe3]'
            }`}
        >
            {label}
        </button>
    );
}