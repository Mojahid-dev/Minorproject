"use client";

import { signOutAndClearCookies } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  async function handleSignOut() {
    try {
      await signOutAndClearCookies();
    } finally {
      router.push("/login");
    }
  }

  async function handleDeleteAccount() {
    if (!confirm('Delete your account? This is irreversible.')) return;

    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      if (!res.ok) throw new Error('Delete failed');
      // Clear client cookies and redirect to login
      await signOutAndClearCookies();
    } catch (e) {
      console.error(e);
      // still try to clear cookies and redirect
      await signOutAndClearCookies();
    } finally {
      router.push('/login');
    }
  }

  return (
    <main>
      <h1>Dashboard</h1>
      <button onClick={handleSignOut} className="mt-4 inline-flex items-center rounded-md bg-red-600 px-3 py-1 text-white hover:bg-red-700 cursor-pointer">
        Sign Out
      </button>
      {/* <button onClick={handleDeleteAccount} className="mt-4 ml-3 inline-flex items-center rounded-md bg-gray-800 px-3 py-1 text-white hover:bg-gray-900 cursor-pointer">
        Delete Account
      </button> */}

      
    </main>
  );
}

