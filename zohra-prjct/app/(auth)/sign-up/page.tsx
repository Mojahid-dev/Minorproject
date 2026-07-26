"use client";

import { signUpSchema } from "@/app/schemas/auth";
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

type signUpFormData = z.infer<typeof signUpSchema>;

export default function SignUpPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
                router.push("/dashboard");
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
          <CardTitle>Create an account</CardTitle>
          <CardDescription>Sign up to create your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label htmlFor="name">Name</label>
                <Input
                  {...register("name")}
                  id="name"
                  type="text"
                  placeholder="John Doe"
                />
                <p className="text-sm text-destructive">
                  {errors.name?.message}
                </p>
              </div>
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
                  {...register("password", { required: true })}
                  id="password"
                  type="password"
                  placeholder="********"
                />
                <p className="text-sm text-destructive">
                  {errors.password?.message}
                </p>
                <label htmlFor="password">Confirm Password</label>
                <Input
                  {...register("confirmPassword", { required: true })}
                  id="confirm-password"
                  type="password"
                  placeholder="********"
                />
                <p className="text-sm text-destructive">
                  {errors.confirmPassword?.message}
                </p>
              </div>
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
              {isSubmitting ? <Spinner className="animate-spin" /> : "Sign Up"}
            </button>
            <button
              type="button"
              className={
                buttonVariants({ variant: "secondary" }) + " w-full mt-3"
              }
            >
              <FcGoogle /> Sign in with Google
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
