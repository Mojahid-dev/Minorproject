"use client";

import { loginSchema } from "@/app/schemas/auth";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ModeToggle } from "@/components/ui/darkToggle";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { authClient } from "@/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon } from "lucide-react";
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
        onError: () => {
          toast.add({
            type: "error",
            description: "Login failed. Please try again.",
          });
        }
      }
    });
    setIsSubmitting(false);
    if (result.error) {
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
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="absolute top-4 left-4 text-sm">
        <Link
          href="/"
          className={
            buttonVariants({ variant: "secondary" }) +
            " flex items-center gap-1"
          }
        >
          <ArrowLeftIcon /> Back to Home
        </Link>
      </div>
      <div className="right-4 top-4 absolute">
        <ModeToggle />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label htmlFor="email">Email</label>
                <Input
                  {...register("email")}
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                />
                <p className="text-sm text-destructive">
                  {errors.email?.message}
                </p>
              </div>
              <div className="grid gap-2">
                <label htmlFor="password">Password</label>
                <Input
                  {...register("password")}
                  id="password"
                  type="password"
                  placeholder="********"
                />
                <p className="text-sm text-destructive">
                  {errors.password?.message}
                </p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground flex items-center justify-between mt-2">
              <Link
                href="/forgot-password"
                className="font-medium underline text-muted-foreground relative hover:text-primary inline-block ml-auto"
              >
                Forgot your password?
              </Link>
            </div>
            {errorMessage ? (
              <p className="mt-2 text-sm text-destructive">{errorMessage}</p>
            ) : null}
            <Separator className="my-4" />
            <button
              type="submit"
              className={buttonVariants({ variant: "default" }) + " w-full"}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Spinner className="animate-spin" /> : "Login"}
            </button>
            <button
              type="button"
              className={
                buttonVariants({ variant: "secondary" }) + " w-full mt-3"
              }
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
        </CardContent>
      </Card>
    </div>
  );
}
