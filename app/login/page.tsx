"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  signIn,
  signUp,
  requestPasswordReset,
  type AuthState,
} from "./actions";

type Mode = "signin" | "signup" | "reset";

const initial: AuthState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
    >
      {pending ? "One moment…" : label}
    </button>
  );
}

const fieldClass =
  "w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin");

  const action =
    mode === "signin" ? signIn : mode === "signup" ? signUp : requestPasswordReset;
  const [state, formAction] = useActionState(action, initial);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-8 text-center">
          <p className="font-display text-sm uppercase tracking-[0.2em] text-primary">
            Promise Keeper
          </p>
          <h1 className="mt-3 font-display text-3xl leading-tight text-foreground">
            {mode === "signin" && "Welcome back."}
            {mode === "signup" && "Begin keeping your word."}
            {mode === "reset" && "Let's get you back in."}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin" && "The people you remember are waiting."}
            {mode === "signup" &&
              "Every promise has a person attached. Let's remember them together."}
            {mode === "reset" && "Enter your email and we'll send a reset link."}
          </p>
        </div>

        <form action={formAction} className="space-y-3">
          {mode === "signup" && (
            <input
              name="display_name"
              placeholder="What should we call you?"
              autoComplete="name"
              className={fieldClass}
            />
          )}

          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            autoComplete="email"
            className={fieldClass}
          />

          {mode !== "reset" && (
            <input
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="Password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className={fieldClass}
            />
          )}

          {state.error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}
          {state.message && (
            <p className="rounded-lg bg-secondary px-3 py-2 text-sm text-secondary-foreground">
              {state.message}
            </p>
          )}

          <SubmitButton
            label={
              mode === "signin"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : "Send reset link"
            }
          />
        </form>

        <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">
          {mode === "signin" && (
            <>
              <button
                onClick={() => setMode("reset")}
                className="underline-offset-4 hover:text-foreground hover:underline"
              >
                Forgot your password?
              </button>
              <p>
                New here?{" "}
                <button
                  onClick={() => setMode("signup")}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Create an account
                </button>
              </p>
            </>
          )}
          {(mode === "signup" || mode === "reset") && (
            <button
              onClick={() => setMode("signin")}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
