"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bell, Camera, Check, ChevronRight, Moon, ShieldCheck, Sun, Trash2, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  authClient,
  signOutAndClearCookies,
  useSession,
} from "@/lib/auth-client";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { useTheme } from "next-themes";

const imageLimit = 1024 * 1024;
type ProfileUser = { name: string; email: string; image?: string | null };

function ProfileForm({ user }: { user: ProfileUser }) {
  const [name, setName] = useState(user.name ?? "");
  const [image, setImage] = useState(user.image ?? "");
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // When users dont have profile photo this will show the two initials of their name. If they dont have a name, it will show "U" for user.
  function initials(value: string) {
    return (
      value
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "U"
    );
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus("Please choose an image file.");
      return;
    }
    if (file.size > imageLimit) {
      setStatus("Choose an image smaller than 1 MB.");
      return;
    }

    // It is used to read the contents of the selected image in the browser
    const reader = new FileReader();
    // The onload event is triggered when the file has been read successfully. It sets the image state to the result of the file reader, which is a data URL representing the image, and clears any status messages.
    reader.onload = () => {
      setImage(typeof reader.result === "string" ? reader.result : "");
      setStatus("");
    };
    // The readAsDataURL method of the FileReader object is called to read the contents of the selected image file. It converts the file into a data URL, which can be used to display the image in the browser.
    reader.readAsDataURL(file);
  }
  async function saveProfile() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setStatus("Your name cannot be empty.");
      return;
    }

    setIsSaving(true);
    setStatus("");
    const { error } = await authClient.updateUser({
      name: trimmedName,
      image: image || undefined,
    });
    setIsSaving(false);
    setStatus(
      error
        ? (error.message ?? "Could not save your profile.")
        : "Profile saved successfully.",
    );

    if (!error) {
      toast.add({
        type: "success",
        description: "Profile updated successfully.",
      });
    }
  }

  const displayName = name || user.name || "Your profile";

  return (
    <section className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#1b1c20] to-[#111214] p-4 sm:p-7">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-lime-200 text-zinc-950 shadow-[0_8px_24px_rgba(163,230,53,0.12)]">
          <UserRound size={18} />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-lime-200">Your identity</p>
          <h2 className="mt-0.5 text-lg font-semibold text-white">Profile details</h2>
          <p className="text-sm text-neutral-400">Make this workspace feel like yours.</p>
        </div>
      </div>
      <div className="mt-5 border-t border-zinc-800 pt-5">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-lime-100 to-emerald-300 text-xl font-bold text-zinc-950 shadow-lg">
            {image ? (
              <Image
                src={image}
                alt="Profile preview"
                width={80}
                height={80}
                unoptimized
                className="size-full object-cover"
              />
            ) : (
              initials(displayName)
            )}
          </div>
          <div>
            <label
              htmlFor="profile-photo"
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-700 px-3.5 py-2.5 text-sm font-semibold text-neutral-200 transition hover:bg-white/10 hover:text-white"
            >
              <Camera size={16} /> {image ? "Change profile photo" : "Add profile photo"}
            </label>
            <input
              id="profile-photo"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="sr-only"
            />
            <p className="mt-2 text-xs text-neutral-400">
              Square photos work best. PNG, JPG, or WebP · up to 1 MB.
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-neutral-200">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/25 px-3.5 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-lime-200/60 focus:ring-4 focus:ring-lime-200/10"
              placeholder="Your name"
            />
          </label>
          <div>
            <span className="text-sm font-medium text-neutral-200">Email</span>
            <div className="mt-2 flex min-h-12 min-w-0 items-center rounded-xl border border-white/[0.06] bg-black/15 px-3.5 py-2 text-xs leading-5 text-neutral-400 [overflow-wrap:anywhere] sm:text-sm">
              {user.email}
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveProfile}
            disabled={isSaving}
            className="rounded-xl bg-lime-200 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? <Spinner /> : "Save profile"}
          </button>
          {status && (
            <p role="status" className="text-sm text-neutral-400">
              {status}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const selectedTheme = resolvedTheme === "light" ? "light" : "dark";
  const { data: session, isPending } = useSession();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [savingPreference, setSavingPreference] = useState("");
  const [preferenceMessage, setPreferenceMessage] = useState("");
  const [preferenceError, setPreferenceError] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(""); 

  useEffect(() => {
    let active = true;
    fetch("/api/preferences", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load preferences.");
        if (active) {
          setEmailNotifications(payload.preferences.emailNotifications);
          setFocusMode(payload.preferences.focusMode);
        }
      })
      .catch((error) => { if (active) setPreferenceError(error instanceof Error ? error.message : "Unable to load preferences."); })
      .finally(() => { if (active) setPreferencesLoading(false); });
    return () => { active = false; };
  }, []);

  async function updatePreference(key: "emailNotifications" | "focusMode", value: boolean) {
    const previous = key === "emailNotifications" ? emailNotifications : focusMode;
    if (key === "emailNotifications") setEmailNotifications(value);
    else setFocusMode(value);
    setSavingPreference(key);
    setPreferenceError("");
    setPreferenceMessage("");
    try {
      const response = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to save this preference.");
      setEmailNotifications(payload.preferences.emailNotifications);
      setFocusMode(payload.preferences.focusMode);
      setPreferenceMessage("Preference saved.");
    } catch (error) {
      if (key === "emailNotifications") setEmailNotifications(previous);
      else setFocusMode(previous);
      setPreferenceError(error instanceof Error ? error.message : "Unable to save this preference.");
    } finally {
      setSavingPreference("");
    }
  }

  async function deleteAccount() {
    if (deleteConfirmation !== "DELETE") return;

    setIsDeleting(true);
    setDeleteError("");

    try {
      const response = await fetch("/api/account/delete", { method: "POST" });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Could not delete your account.");
      }

      await signOutAndClearCookies();
      toast.add({
        type: "success",
        description: "Your account has been deleted.",
      });
      router.replace("/login");
      router.refresh();
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Could not delete your account.",
      );
      setIsDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl pb-10">
      <header className="relative isolate overflow-hidden rounded-[28px] border border-white/[0.09] bg-[#141519] p-4 sm:p-8">
        <div aria-hidden="true" className="absolute -right-20 -top-36 -z-10 size-96 rounded-full bg-[radial-gradient(circle,rgba(163,230,53,0.14),transparent_68%)]" />
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-200">Account control room</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div><h1 className="text-4xl font-semibold tracking-[-0.055em] text-white sm:text-5xl">Settings</h1><p className="mt-2 max-w-xl text-sm leading-6 text-neutral-400">Shape how Zohra looks after your account and how your workspace feels.</p></div>
          <div className="rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5 text-xs text-neutral-400">Profile edits save manually <span className="mx-1 text-neutral-600">·</span> Preferences save instantly</div>
        </div>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="h-fit rounded-3xl border border-white/[0.08] bg-[#141518] p-3 sm:p-4 lg:sticky lg:top-24">
          {session?.user && <div className="mb-4 flex items-center gap-3 border-b border-white/[0.07] px-1 pb-4"><div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-lime-100 to-emerald-300 text-sm font-bold text-zinc-950">{session.user.image ? <Image src={session.user.image} alt="" width={44} height={44} unoptimized className="size-full object-cover" /> : (session.user.name?.split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2) || "U").toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{session.user.name}</p><p className="truncate text-xs text-neutral-500">Account settings</p></div></div>}
          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Manage</p>
          <nav aria-label="Settings sections" className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:block lg:space-y-1">
            {[{ href: "#profile-settings", label: "Profile", icon: UserRound }, { href: "#appearance-settings", label: "Appearance", icon: Sun }, { href: "#notification-settings", label: "Notifications", icon: Bell }, { href: "#focus-settings", label: "Focus mode", icon: ShieldCheck }, { href: "#account-security", label: "Account security", icon: Trash2 }].map(({ href, label, icon: Icon }) => <a key={href} href={href} className="group flex min-h-10 items-center gap-2 rounded-xl px-2 py-2 text-[11px] text-neutral-400 transition hover:bg-white/[0.06] hover:text-white sm:px-3 sm:text-sm lg:gap-3"><Icon size={15} className="shrink-0" /><span className="min-w-0 flex-1 leading-4">{label}</span><ChevronRight size={13} className="shrink-0 text-neutral-600 transition group-hover:translate-x-0.5 group-hover:text-neutral-300" /></a>)}
          </nav>
          <Link href="/profile" className="mt-4 flex items-center justify-between rounded-xl bg-lime-200/[0.08] px-3 py-3 text-xs font-medium text-lime-100 transition hover:bg-lime-200/[0.13]">View your profile <ArrowRight size={14} /></Link>
        </aside>

      <div className="min-w-0 space-y-4">
        <div id="profile-settings" className="scroll-mt-24">
        {isPending ? (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-sm text-neutral-500">
            <Spinner /> Loading your profile…
          </section>
        ) : session?.user ? (
          <ProfileForm user={session.user} />
        ) : null}
        </div>

        <section id="appearance-settings" className="scroll-mt-24 rounded-3xl border border-white/[0.08] bg-[#141518] p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-violet-200/10 text-violet-100"><Sun size={18} /></div>
              <div><h2 className="font-semibold text-white">Appearance</h2><p className="text-sm text-neutral-500">Choose the colors that feel comfortable to use.</p></div>
            </div>
            <div role="group" aria-label="Color theme" className="grid w-full grid-cols-2 gap-2 sm:w-auto">
              <button type="button" aria-pressed={selectedTheme === "light"} onClick={() => setTheme("light")} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium transition ${selectedTheme === "light" ? "border-violet-200/40 bg-violet-200 text-violet-950 shadow-[0_6px_20px_rgba(196,181,253,0.12)]" : "border-white/10 bg-black/20 text-neutral-300 hover:bg-white/[0.06]"}`}><Sun size={16} />Light{selectedTheme === "light" && <Check size={15} />}</button>
              <button type="button" aria-pressed={selectedTheme === "dark"} onClick={() => setTheme("dark")} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium transition ${selectedTheme === "dark" ? "border-sky-200/35 bg-[#202a3e] text-sky-100 shadow-[0_6px_20px_rgba(125,211,252,0.1)]" : "border-white/10 bg-black/20 text-neutral-300 hover:bg-white/[0.06]"}`}><Moon size={16} />Dark{selectedTheme === "dark" && <Check size={15} />}</button>
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-neutral-500">Your choice is saved on this device. Mobile has its own color treatment for either theme.</p>
        </section>

        <section id="notification-settings" className="scroll-mt-24 rounded-3xl border border-white/[0.08] bg-[#141518] p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-white text-black">
              <Bell size={18} />
            </div>
            <div>
              <h2 className="font-semibold text-white">Notifications</h2>
              <p className="text-sm text-neutral-500">
                Choose your email alert preference.
              </p>
            </div>
          </div>
          <label className="mt-5 flex cursor-pointer items-center justify-between gap-3 border-t border-zinc-800 pt-5">
            <span className="min-w-0">
              <span className="block text-sm font-medium text-white">
                Email notifications
              </span>
              <span className="mt-1 block text-sm text-neutral-500">
                Allow email alerts when workspace notifications are available.
              </span>
            </span>
            <input
              checked={emailNotifications}
              disabled={preferencesLoading || savingPreference !== ""}
              onChange={(event) => void updatePreference("emailNotifications", event.target.checked)}
              type="checkbox"
              className="size-5 shrink-0 accent-white"
            />
          </label>
          <p className="mt-3 text-xs text-neutral-500">Email alert delivery is not active yet. This preference will be saved to your account.</p>
        </section>

        <section id="focus-settings" className="scroll-mt-24 rounded-3xl border border-white/[0.08] bg-[#141518] p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-white text-black">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="font-semibold text-white">Focus mode</h2>
              <p className="text-sm text-neutral-500">
                Save your preference for a quieter workspace.
              </p>
            </div>
          </div>
          <label className="mt-5 flex cursor-pointer items-center justify-between gap-3 border-t border-zinc-800 pt-5">
            <span className="min-w-0">
              <span className="block text-sm font-medium text-white">
                Enable focus mode
              </span>
              <span className="mt-1 block text-sm text-neutral-500">
                Reduce non-essential workspace interruptions as they become available.
              </span>
            </span>
            <input
              checked={focusMode}
              disabled={preferencesLoading || savingPreference !== ""}
              onChange={(event) => void updatePreference("focusMode", event.target.checked)}
              type="checkbox"
              className="size-5 shrink-0 accent-white"
            />
          </label>
        </section>

        {(preferenceMessage || preferenceError || preferencesLoading) && <p role={preferenceError ? "alert" : "status"} className={`px-1 text-sm ${preferenceError ? "text-red-300" : "text-neutral-400"}`}>{preferencesLoading ? "Loading saved preferences…" : savingPreference ? "Saving preference…" : preferenceError || preferenceMessage}</p>}

        <section id="account-security" className="scroll-mt-24 rounded-3xl border border-red-950/80 bg-[#141518] p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-red-500/15 text-red-300">
              <Trash2 size={18} />
            </div>
            <div>
              <h2 className="font-semibold text-white">Delete account</h2>
              <p className="text-sm text-neutral-500">
                Permanently remove your profile, sessions, and account data.
              </p>
            </div>
          </div>
          <div className="mt-5 border-t border-zinc-800 pt-5">
            <button
              type="button"
              onClick={() => {
                setDeleteError("");
                setDeleteConfirmation("");
                setDeleteDialogOpen(true);
              }}
              className="rounded-xl border border-red-500/70 px-4 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/15"
            >
              Delete account
            </button>
          </div>
        </section>
      </div>
      </div>

      {deleteDialogOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="delete-account-title"
                  className="text-lg font-semibold text-white"
                >
                  Delete your account?
                </h2>
                <p className="mt-2 text-sm leading-6 text-neutral-400">
                  This cannot be undone. All of your account data and active
                  sessions will be permanently removed.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={isDeleting}
                aria-label="Close delete account dialog"
                className="grid size-8 shrink-0 place-items-center rounded-lg text-neutral-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>
            <label className="mt-5 block text-sm font-medium text-neutral-200">
              Type <span className="font-bold text-white">DELETE</span> to
              confirm
              <input
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                disabled={isDeleting}
                autoComplete="off"
                className="mt-2 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none transition focus:border-neutral-400 focus:ring-4 focus:ring-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
            {deleteError && (
              <p role="alert" className="mt-3 text-sm text-red-300">
                {deleteError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={isDeleting}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-neutral-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteAccount}
                disabled={deleteConfirmation !== "DELETE" || isDeleting}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting ? <Spinner /> : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
