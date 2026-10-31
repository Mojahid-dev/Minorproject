import { Hanken_Grotesk, Literata } from "next/font/google";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

const reading = Literata({ subsets: ["latin"], variable: "--next-reading", display: "swap" });
const ui = Hanken_Grotesk({ subsets: ["latin"], variable: "--next-ui", display: "swap" });

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  return (
    <div className={`${reading.variable} ${ui.variable} contents`}>
      <AppShell>{children}</AppShell>
    </div>
  );
}
