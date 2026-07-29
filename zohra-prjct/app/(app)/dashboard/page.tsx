"use client";

import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  async function handleSignOut() {
    try {
      await signOut();
    } finally {
      router.push("/");
    }
  }

  return (
    <main>
      <h1>Dashboard</h1>
      <button onClick={handleSignOut} className="mt-4 inline-flex items-center rounded-md bg-red-600 px-3 py-1 text-white hover:bg-red-700">
        Sign Out
      </button>
    </main>
  );
}

