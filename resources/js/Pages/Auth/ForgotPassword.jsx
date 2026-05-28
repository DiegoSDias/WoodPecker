import InputError from '@/Components/InputError';
import { Head, Link, useForm } from '@inertiajs/react';

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('password.email'));
    };

    return (
        <>
            <Head title="Esqueci minha senha" />

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
                        Esqueci minha senha
                    </h1>

                    <p className="mt-[1rem] text-center text-base leading-relaxed text-gray-600">
                        Informe seu e-mail cadastrado para receber as
                        instruções de redefinição de senha.
                    </p>

                    {status && (
                        <div className="mt-6 rounded-md bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                            {status}
                        </div>
                    )}

                    <form onSubmit={submit} className="mt-[1.5rem]">
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

                        <button
                            type="submit"
                            disabled={processing}
                            className="mt-[1.5rem] h-[3.25rem] w-full rounded-lg bg-[#683015] text-xl font-bold text-white transition hover:bg-[#53250f] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            Enviar link de redefinição
                        </button>

                        <div className="mt-[1rem] pb-1 text-center text-base text-gray-500">
                            Lembrou sua senha?{' '}
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
