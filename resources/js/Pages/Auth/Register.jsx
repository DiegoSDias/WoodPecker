import InputError from '@/Components/InputError';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <>
            <Head title="Cadastro" />

            <main
                className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center px-4 py-2 overflow-y-auto"
                style={{
                    backgroundImage:
                        "url('/images/background-login-register.png')",
                }}
            >
                <section className="w-full max-w-[33rem] rounded-[1.625rem] bg-white px-[3rem] py-[0.85rem] shadow-2xl">
                    <div className="flex justify-center">
                        <img
                            src="/images/logo-woodpecker-header.png"
                            alt="Woodpecker"
                            className="w-[18rem] max-w-full object-contain"
                        />
                    </div>

                    <h1 className="mt-[0.9rem] text-center text-[2rem] font-extrabold text-black">
                        Crie uma nova conta
                    </h1>

                    <form onSubmit={submit} className="mt-[0.9rem]">
                        <div>
                            <label
                                htmlFor="name"
                                className="mb-2 block text-xl font-medium text-black"
                            >
                                Nome
                            </label>

                            <input
                                id="name"
                                type="text"
                                name="name"
                                value={data.name}
                                autoComplete="name"
                                autoFocus
                                required
                                onChange={(e) =>
                                    setData('name', e.target.value)
                                }
                                className="h-[3rem] w-full rounded-lg border-2 border-[#9a7b6e] bg-white px-4 text-lg text-black outline-none transition focus:border-[#6a2f13] focus:ring-2 focus:ring-[#6a2f13]/20"
                            />

                            <InputError
                                message={errors.name}
                                className="mt-2"
                            />
                        </div>

                        <div className="mt-[0.75rem]">
                            <label
                                htmlFor="email"
                                className="mb-2 block text-xl font-medium text-black"
                            >
                                E-mail
                            </label>

                            <input
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                autoComplete="username"
                                required
                                onChange={(e) =>
                                    setData('email', e.target.value)
                                }
                                className="h-[3rem] w-full rounded-lg border-2 border-[#9a7b6e] bg-white px-4 text-lg text-black outline-none transition focus:border-[#6a2f13] focus:ring-2 focus:ring-[#6a2f13]/20"
                            />

                            <InputError
                                message={errors.email}
                                className="mt-2"
                            />
                        </div>

                        <div className="mt-[0.75rem]">
                            <label
                                htmlFor="password"
                                className="mb-2 block text-xl font-medium text-black"
                            >
                                Senha
                            </label>

                            <input
                                id="password"
                                type="password"
                                name="password"
                                value={data.password}
                                autoComplete="new-password"
                                required
                                onChange={(e) =>
                                    setData('password', e.target.value)
                                }
                                className="h-[3rem] w-full rounded-lg border-2 border-[#9a7b6e] bg-white px-4 text-lg text-black outline-none transition focus:border-[#6a2f13] focus:ring-2 focus:ring-[#6a2f13]/20"
                            />

                            <InputError
                                message={errors.password}
                                className="mt-2"
                            />
                        </div>

                        <div className="mt-[0.75rem]">
                            <label
                                htmlFor="password_confirmation"
                                className="mb-2 block text-xl font-medium text-black"
                            >
                                Confirmar senha
                            </label>

                            <input
                                id="password_confirmation"
                                type="password"
                                name="password_confirmation"
                                value={data.password_confirmation}
                                autoComplete="new-password"
                                required
                                onChange={(e) =>
                                    setData(
                                        'password_confirmation',
                                        e.target.value
                                    )
                                }
                                className="h-[3rem] w-full rounded-lg border-2 border-[#9a7b6e] bg-white px-4 text-lg text-black outline-none transition focus:border-[#6a2f13] focus:ring-2 focus:ring-[#6a2f13]/20"
                            />

                            <InputError
                                message={errors.password_confirmation}
                                className="mt-2"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={processing}
                            className="mt-[0.9rem] h-[3.25rem] w-full rounded-lg bg-[#683015] text-xl font-bold text-white transition hover:bg-[#53250f] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            Cadastrar
                        </button>

                        <div className="mt-[0.7rem] pb-1 text-center text-base text-gray-500">
                            Já possui uma conta?{' '}
                            <Link
                                href={route('login')}
                                className="font-medium text-blue-600 hover:underline"
                            >
                                Volte para o login
                            </Link>
                        </div>
                    </form>
                </section>
            </main>
        </>
    );
}
