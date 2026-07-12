"use client";

import { useState } from "react";
import Link from "next/link";
import {
  getSecurityQuestion,
  resetPasswordWithSecurityAnswer,
} from "./actions";

const field =
  "w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "answer" | "done">("email");
  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function lookup() {
    setError(null);
    setBusy(true);
    const res = await getSecurityQuestion(email);
    setBusy(false);
    if (res.error || !res.question) {
      setError(res.error ?? "Something went wrong.");
      return;
    }
    setQuestion(res.question);
    setStep("answer");
  }

  async function submit() {
    setError(null);
    setBusy(true);
    const res = await resetPasswordWithSecurityAnswer({
      email,
      answer,
      newPassword,
    });
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setStep("done");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-sm">
        <p className="mb-8 text-center font-display text-sm uppercase tracking-[0.2em] text-primary">
          Promise Keeper
        </p>

        {step === "email" && (
          <>
            <h1 className="text-center font-display text-3xl text-foreground">
              Reset your password
            </h1>
            <p className="mt-2 text-center text-muted-foreground">
              Enter your email to answer your security question.
            </p>
            <div className="mt-6 space-y-3">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="Email"
                className={field}
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <button
                onClick={lookup}
                disabled={busy}
                className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              >
                {busy ? "Checking…" : "Continue"}
              </button>
            </div>
          </>
        )}

        {step === "answer" && (
          <>
            <h1 className="text-center font-display text-3xl text-foreground">
              Answer your question
            </h1>
            <p className="mt-2 text-center text-muted-foreground">
              {question}
            </p>
            <div className="mt-6 space-y-3">
              <input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Your answer"
                className={field}
              />
              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                type="password"
                placeholder="New password (8+ characters)"
                className={field}
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <button
                onClick={submit}
                disabled={busy}
                className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              >
                {busy ? "Resetting…" : "Reset password"}
              </button>
            </div>
          </>
        )}

        {step === "done" && (
          <div className="text-center">
            <h1 className="font-display text-3xl text-foreground">
              Password reset.
            </h1>
            <p className="mt-2 text-muted-foreground">
              You can sign in with your new password now.
            </p>
            <Link
              href="/login"
              className="mt-5 inline-block rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Go to sign in
            </Link>
          </div>
        )}

        {step !== "done" && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link
              href="/login"
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              Back to sign in
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
