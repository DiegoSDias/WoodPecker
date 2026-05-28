import InputError from '@/Components/InputError';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <>
            <Head title="Login" />

            <main
                className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center px-4 py-4 overflow-y-auto"
                style={{
                    backgroundImage:
                        "url('/images/background-login-register.png')",
                }}
            >
                <section className="w-full max-w-[34rem] rounded-[1.625rem] bg-white px-[3.25rem] py-[1.5rem] shadow-2xl">
                    <div className="flex justify-center">
                        <img
                            src="/images/logo-woodpecker-header.png"
                            alt="Woodpecker"
                            className="w-[21.25rem] max-w-full object-contain"
                        />
                    </div>

                    <h1 className="mt-[1.5rem] text-center text-[2rem] font-extrabold text-black">
                        Faça login na sua conta
                    </h1>

                    {status && (
                        <div className="mt-6 rounded-md bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                            {status}
                        </div>
                    )}

                    <form onSubmit={submit} className="mt-[1.25rem]">
                        <div>
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
                                autoFocus
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

                        <div className="mt-[1.5rem]">
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
                                autoComplete="current-password"
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

                        {canResetPassword && (
                            <div className="mt-[0.75rem] text-right">
                                <Link
                                    href={route('password.request')}
                                    className="text-sm font-medium text-blue-600 hover:underline"
                                >
                                    Esqueci minha senha
                                </Link>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={processing}
                            className="mt-[1.25rem] h-[3.25rem] w-full rounded-lg bg-[#683015] text-xl font-bold text-white transition hover:bg-[#53250f] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            Login
                        </button>

                        <button
                            type="button"
                            className="mt-[1.25rem] flex h-[3.125rem] w-full items-center justify-center gap-3 rounded-lg bg-[#dec8b2] text-lg font-bold text-black transition hover:bg-[#d4bca3]"
                        >
                            <img
                                src="/images/google-icon.png"
                                alt="Google"
                                className="h-6 w-6 object-contain"
                            />

                            Continue com o Google
                        </button>

                        <div className="mt-[1rem] pb-1 text-center text-base text-gray-500">
                            Ainda não tem uma conta?{' '}
                            <Link
                                href={route('register')}
                                className="font-medium text-blue-600 hover:underline"
                            >
                                Faça seu cadastro
                            </Link>
                        </div>
                    </form>
                </section>
            </main>
        </>
    );
}
