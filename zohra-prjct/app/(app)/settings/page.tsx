"use client";

import Image from "next/image";
import { Bell, Camera, ShieldCheck, Trash2, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient, signOutAndClearCookies, useSession } from "@/lib/auth-client";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";

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
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-lg bg-white text-black">
          <UserRound size={18} />
        </div>
        <div>
          <h2 className="font-semibold text-white">Profile</h2>
          <p className="text-sm text-neutral-500">
            Update your public account details.
          </p>
        </div>
      </div>
      <div className="mt-5 border-t border-zinc-800 pt-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-white text-xl font-bold text-black">
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
              <Camera size={16} /> Add profile photo
            </label>
            <input
              id="profile-photo"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="sr-only"
            />
            <p className="mt-2 text-xs text-neutral-500">
              PNG, JPG, or WebP. Maximum 1 MB.
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-neutral-200">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-neutral-400 focus:ring-4 focus:ring-zinc-800"
              placeholder="Your name"
            />
          </label>
          <div>
            <span className="text-sm font-medium text-neutral-200">Email</span>
            <div className="mt-2 flex h-11 items-center rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm text-neutral-500">
              {user.email}
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveProfile}
            disabled={isSaving}
            className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
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
  const { data: session, isPending } = useSession();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

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
      toast.add({ type: "success", description: "Your account has been deleted." });
      router.replace("/login");
      router.refresh();
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Could not delete your account.",
      );
      setIsDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="border-b border-zinc-800 pb-7">
        <p className="text-sm font-medium text-neutral-500">
          Account & workspace
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.045em] text-white">
          Settings
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Manage your Zohra account and workspace preferences.
        </p>
      </header>

      <div className="mt-6 space-y-4">
        {isPending ? (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-sm text-neutral-500">
          <Spinner /> Loading your profile…
          </section>
        ) : session?.user ? (
          <ProfileForm user={session.user} />
        ) : null}

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-white text-black">
              <Bell size={18} />
            </div>
            <div>
              <h2 className="font-semibold text-white">Notifications</h2>
              <p className="text-sm text-neutral-500">
                Control project and task updates.
              </p>
            </div>
          </div>
          <label className="mt-5 flex cursor-pointer items-center justify-between gap-4 border-t border-zinc-800 pt-5">
            <span>
              <span className="block text-sm font-medium text-white">
                Email notifications
              </span>
              <span className="mt-1 block text-sm text-neutral-500">
                Receive workspace activity updates by email.
              </span>
            </span>
            <input
              checked={emailNotifications}
              onChange={(event) => setEmailNotifications(event.target.checked)}
              type="checkbox"
              className="size-5 accent-white"
            />
          </label>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-white text-black">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="font-semibold text-white">Focus mode</h2>
              <p className="text-sm text-neutral-500">
                Keep distractions to a minimum.
              </p>
            </div>
          </div>
          <label className="mt-5 flex cursor-pointer items-center justify-between gap-4 border-t border-zinc-800 pt-5">
            <span>
              <span className="block text-sm font-medium text-white">
                Enable focus mode
              </span>
              <span className="mt-1 block text-sm text-neutral-500">
                Mute non-essential dashboard alerts.
              </span>
            </span>
            <input
              checked={focusMode}
              onChange={(event) => setFocusMode(event.target.checked)}
              type="checkbox"
              className="size-5 accent-white"
            />
          </label>
        </section>

        <section className="rounded-2xl border border-red-950 bg-zinc-900 p-5 sm:p-6">
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
                <h2 id="delete-account-title" className="text-lg font-semibold text-white">
                  Delete your account?
                </h2>
                <p className="mt-2 text-sm leading-6 text-neutral-400">
                  This cannot be undone. All of your account data and active sessions will be permanently removed.
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
              Type <span className="font-bold text-white">DELETE</span> to confirm
              <input
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                disabled={isDeleting}
                autoComplete="off"
                className="mt-2 h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none transition focus:border-neutral-400 focus:ring-4 focus:ring-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
            {deleteError && <p role="alert" className="mt-3 text-sm text-red-300">{deleteError}</p>}
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
