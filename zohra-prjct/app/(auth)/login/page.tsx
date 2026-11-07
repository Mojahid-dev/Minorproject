"use client";

import { loginSchema } from "@/app/schemas/auth";
import { ModeToggle } from "@/components/ui/darkToggle";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { authClient } from "@/lib/auth-client";
import { ResendVerification } from "@/components/auth/resend-verification";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FcGoogle } from "react-icons/fc";
import z from "zod";

type loginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  // Set when the account exists but the email is not verified yet.
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<loginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  const onSubmit = async (data: loginFormData) => {
    setErrorMessage(null);
    setUnverifiedEmail(null);
    setIsSubmitting(true);

    const result = await authClient.signIn.email({
      email: data.email,
      password: data.password,
      callbackURL: "/",
      fetchOptions: {
        onSuccess: () => {
          toast.add({
            type: "success",
            description: "Login successful! Redirecting to dashboard...",
          });
          router.push("/");
        },
        onError: (ctx) => {
          // Unverified accounts get their own message below, not a generic failure toast.
          if ((ctx.error as { code?: string }).code === "EMAIL_NOT_VERIFIED" || ctx.error?.status === 403) return;
          toast.add({
            type: "error",
            description: "Login failed. Please try again.",
          });
        }
      }
    });
    setIsSubmitting(false);
    if (result.error) {
      if (result.error.code === "EMAIL_NOT_VERIFIED" || result.error.status === 403) {
        setUnverifiedEmail(data.email);
        return;
      }
      setErrorMessage(result.error.message ?? "Sign in failed.");
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
    <main className="min-h-screen bg-zinc-950 px-4 py-5 text-white sm:px-6 sm:py-6">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg border border-white/10 bg-zinc-900 p-1"><Image src="/Logo.svg" alt="Zohra logo" width={28} height={28} className="size-full object-contain" priority /></span>
          <span className="text-lg font-semibold tracking-tight text-yellow-400">Zohra</span>
        </Link>
        <div className="flex items-center gap-3"><Link href="/" className="hidden items-center gap-1.5 text-sm text-zinc-400 transition hover:text-white sm:inline-flex"><ArrowLeftIcon size={15} /> Back to home</Link><ModeToggle /></div>
      </header>
      <section className="mx-auto flex min-h-[calc(100vh-5.5rem)] w-full max-w-sm flex-col justify-center py-10">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6 shadow-2xl sm:p-8">
          <div className="mb-7">
            <h1 className="text-2xl font-semibold tracking-tight text-white">Welcome back</h1>
            <p className="mt-2 text-sm text-zinc-400">Sign in to continue to Zohra.</p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-5">
              <div className="grid gap-2">
                <label htmlFor="email" className="text-sm font-medium text-zinc-200">Email address</label>
                <Input
                  {...register("email")}
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  className="h-11 rounded-xl border-white/10 bg-white/[0.04] px-3.5 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-yellow-400/60 focus-visible:ring-yellow-400/15"
                />
                <p className="min-h-5 text-sm text-red-400">
                  {errors.email?.message}
                </p>
              </div>
              <div className="grid gap-2">
                <label htmlFor="password" className="text-sm font-medium text-zinc-200">Password</label>
                <Input
                  {...register("password")}
                  id="password"
                  type="password"
                  placeholder="********"
                  className="h-11 rounded-xl border-white/10 bg-white/[0.04] px-3.5 text-zinc-100 placeholder:text-zinc-600 focus-visible:border-yellow-400/60 focus-visible:ring-yellow-400/15"
                />
                <p className="min-h-5 text-sm text-red-400">
                  {errors.password?.message}
                </p>
              </div>
            </div>
            <div className="mt-1 flex items-center justify-end text-sm">
              <Link
                href="/forgot-password"
                className="font-medium text-zinc-400 transition hover:text-yellow-300"
              >
                Forgot your password?
              </Link>
            </div>
            {errorMessage ? (
              <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-sm text-red-300">{errorMessage}</p>
            ) : null}
            {unverifiedEmail ? (
              <div role="alert" className="mt-4 rounded-xl border border-yellow-400/25 bg-yellow-400/10 p-3.5">
                <p className="text-sm font-medium text-yellow-200">Verify your email to sign in</p>
                <p className="mt-1 text-xs leading-5 text-zinc-300">
                  We just sent a new link to <span className="break-all font-medium">{unverifiedEmail}</span>. Open it, then come back
                  here. Check spam if you can&apos;t find it.
                </p>
                <div className="mt-3">
                  <ResendVerification email={unverifiedEmail} initialCooldown={30} />
                </div>
              </div>
            ) : null}
            <button
              type="submit"
              className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 text-sm font-semibold text-zinc-950 shadow-[0_10px_28px_rgba(234,179,8,0.2)] transition hover:-translate-y-0.5 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Spinner className="animate-spin" /> : <>Login <ArrowRight size={16} /></>}
            </button>
            <div className="my-5 flex items-center gap-3"><span className="h-px flex-1 bg-white/10" /><span className="text-xs font-medium text-zinc-500">OR CONTINUE WITH</span><span className="h-px flex-1 bg-white/10" /></div>
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
          <p className="mt-7 text-center text-sm text-zinc-500">New to Zohra? <Link href="/sign-up" className="font-medium text-yellow-400 transition hover:text-yellow-300">Create an account</Link></p>
        </div>
      </section>
    </main>
  );
}
