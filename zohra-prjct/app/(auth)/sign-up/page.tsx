"use client";

import { signUpSchema } from "@/app/schemas/auth";
import { ModeToggle } from "@/components/ui/darkToggle";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { authClient } from "@/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon, ArrowRight, Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FcGoogle } from "react-icons/fc";
import z from "zod";

type signUpFormData = z.infer<typeof signUpSchema>;

export default function SignUpPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<signUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: signUpFormData) => {
    setErrorMessage(null);
    setIsSubmitting(true);

    const result = await authClient.signUp.email({
      name: data.name,
      email: data.email,
      password: data.password,
      callbackURL: "/",
      fetchOptions: {
              onSuccess: () => {
                toast.add({
                  type: "success",
                  description: "Sign up successful! Redirecting to dashboard...",
                });
                router.push("/");
              },
              onError: () => {
                toast.add({
                  type: "error",
                  description: "Sign up failed. Please try again.",
                });
              }
            }
    });

    setIsSubmitting(false);

    if (result.error) {
      setErrorMessage(result.error.message ?? "Sign up failed.");
      return;
    }

    router.push("/");
  };

  const signInWithGoogle = async () => {
    setErrorMessage(null);
    setIsGoogleSubmitting(true);

    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
    });

    if (result?.error) {
      setErrorMessage(result.error.message ?? "Google sign in failed.");
      setIsGoogleSubmitting(false);
    }
  };
  
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-zinc-950 px-4 py-5 text-white sm:px-6 sm:py-6">
      <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_92%_12%,rgba(202,138,4,0.2),transparent_28%),radial-gradient(circle_at_8%_90%,rgba(113,63,18,0.18),transparent_28%)]" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:58px_58px]" />
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-6xl flex-col rounded-3xl border border-white/10 bg-zinc-900/50 shadow-[0_28px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:grid lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden border-r border-white/10 p-10 lg:flex lg:flex-col">
          <div aria-hidden="true" className="absolute -right-24 top-1/2 size-96 -translate-y-1/2 rounded-full border border-yellow-400/15" />
          <Link href="/" className="relative flex items-center gap-3 self-start">
            <div className="grid size-10 place-items-center rounded-xl border border-yellow-400/25 bg-yellow-400/10 text-yellow-300"><Sparkles size={19} /></div>
            <span className="text-xl font-semibold tracking-tight text-yellow-400">Zohra</span>
          </Link>
          <div className="relative my-auto max-w-md">
            <p className="text-xs font-semibold tracking-[0.2em] text-yellow-400">YOUR CALMER WORKSPACE</p>
            <h1 className="mt-5 text-5xl font-semibold tracking-[-0.055em] text-white">Make space for what matters.</h1>
            <p className="mt-5 text-base leading-7 text-zinc-400">Start with a clearer place for your ideas, plans, and everyday work.</p>
            <div className="mt-10 space-y-4">
              {["Capture every thought without losing the thread", "Turn scattered work into steady progress"].map((item) => <div key={item} className="flex items-center gap-3 text-sm text-zinc-300"><span className="grid size-6 place-items-center rounded-full border border-yellow-400/25 bg-yellow-400/10 text-yellow-300"><Check size={14} /></span>{item}</div>)}
            </div>
          </div>
          <p className="relative text-xs text-zinc-600">© {new Date().getFullYear()} Zohra Workspace</p>
        </section>

        <section className="flex flex-1 flex-col p-5 sm:p-8 lg:p-10">
          <div className="flex items-center justify-between lg:justify-end">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-400 transition hover:text-yellow-300 lg:hidden"><ArrowLeftIcon size={16} /> Back to home</Link>
            <ModeToggle />
          </div>
          <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10 lg:py-0">
            <div className="mb-7">
              <p className="text-xs font-semibold tracking-[0.18em] text-yellow-400">CREATE ACCOUNT</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-white">Start your workspace</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">A focused place for your notes, plans, and momentum.</p>
            </div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label htmlFor="name" className="text-sm font-medium text-zinc-200">Name</label>
                <Input
                  {...register("name")}
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  className="h-11 rounded-xl border-white/10 bg-white/[0.04] px-3.5 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-yellow-400/60 focus-visible:ring-yellow-400/15"
                />
                <p className="min-h-4 text-xs text-red-400">
                  {errors.name?.message}
                </p>
              </div>
              <div className="grid gap-2">
                <label htmlFor="email" className="text-sm font-medium text-zinc-200">Email address</label>
                <Input
                  {...register("email")}
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  className="h-11 rounded-xl border-white/10 bg-white/[0.04] px-3.5 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-yellow-400/60 focus-visible:ring-yellow-400/15"
                />
                <p className="min-h-4 text-xs text-red-400">
                  {errors.email?.message}
                </p>
              </div>
              <div className="grid gap-2">
                <label htmlFor="password" className="text-sm font-medium text-zinc-200">Password</label>
                <Input
                  {...register("password", { required: true })}
                  id="password"
                  type="password"
                  placeholder="********"
                  className="h-11 rounded-xl border-white/10 bg-white/[0.04] px-3.5 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-yellow-400/60 focus-visible:ring-yellow-400/15"
                />
                <p className="min-h-4 text-xs text-red-400">
                  {errors.password?.message}
                </p>
              </div>
              <div className="grid gap-2">
                <label htmlFor="confirm-password" className="text-sm font-medium text-zinc-200">Confirm password</label>
                <Input
                  {...register("confirmPassword", { required: true })}
                  id="confirm-password"
                  type="password"
                  placeholder="********"
                  className="h-11 rounded-xl border-white/10 bg-white/[0.04] px-3.5 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-yellow-400/60 focus-visible:ring-yellow-400/15"
                />
                <p className="min-h-4 text-xs text-red-400">
                  {errors.confirmPassword?.message}
                </p>
              </div>
            </div>
            
            {errorMessage ? (
              <p className="mt-2 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-sm text-red-300">{errorMessage}</p>
            ) : null}

            <button
              type="submit"
              className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 text-sm font-semibold text-zinc-950 shadow-[0_10px_28px_rgba(234,179,8,0.2)] transition hover:-translate-y-0.5 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Spinner className="animate-spin" /> : <>Create account <ArrowRight size={16} /></>}
            </button>
            <div className="my-4 flex items-center gap-3"><span className="h-px flex-1 bg-white/10" /><span className="text-xs font-medium text-zinc-500">OR CONTINUE WITH</span><span className="h-px flex-1 bg-white/10" /></div>
            <button
              type="button"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-4 text-sm font-medium text-zinc-200 transition hover:border-white/25 hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
              onClick={signInWithGoogle}
              disabled={isGoogleSubmitting}
            >
              {isGoogleSubmitting ? (
                <Spinner className="animate-spin" />
              ) : (
                <FcGoogle />
              )}
              Sign in with Google
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-zinc-500">Already have an account? <Link href="/login" className="font-medium text-yellow-400 transition hover:text-yellow-300">Sign in</Link></p>
          </div>
        </section>
      </div>
    </main>
  );
}
