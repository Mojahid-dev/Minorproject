"use client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:3000",
});

export const { signIn, signUp, signOut, useSession } = authClient;

export async function signOutAndClearCookies() {
  // Call server/client signOut to invalidate session (may clear HttpOnly cookies server-side)
  await signOut();

  if (typeof window === "undefined") return;

  // Clear accessible (non-HttpOnly) cookies from the client
  const cookies = document.cookie ? document.cookie.split(";").map(c => c.split("=")[0].trim()).filter(Boolean) : [];
  const host = location.hostname;

  cookies.forEach((name) => {
    // clear cookie for current path and root
    document.cookie = `${name}=; Max-Age=0; path=/;`;
    try {
      document.cookie = `${name}=; Max-Age=0; path=/; domain=${host};`;
    } catch (e) {
      // ignore invalid domain errors in some environments
    }
  });
}