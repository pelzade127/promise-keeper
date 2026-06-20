"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updatePassword, type AuthState } from "@/app/login/actions";

const initial: AuthState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
    >
      {pending ? "Saving…" : "Set new password"}
    </button>
  );
}

export default function UpdatePasswordPage() {
  const [state, formAction] = useActionState(updatePassword, initial);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm animate-fade-up">
        <h1 className="mb-2 text-center font-display text-3xl text-foreground">
          Choose a new password
        </h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          You're almost back in.
        </p>
        <form action={formAction} className="space-y-3">
          <input
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="New password"
            autoComplete="new-password"
            className="w-full rounded-lg border border-input bg-card px-3.5 py-2.5 outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
          {state.error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}
          <SubmitButton />
        </form>
      </div>
    </main>
  );
}
