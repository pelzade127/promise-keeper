"use client";

import { useState } from "react";
import { changePasswordWithAnswers } from "@/app/(app)/settings/actions";

const field =
  "w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30";

export function ChangePasswordForm({
  question1,
  question2,
}: {
  question1: string | null;
  question2: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [answer1, setAnswer1] = useState("");
  const [answer2, setAnswer2] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!question1 || !question2) {
    return (
      <div className="rounded-lg border border-border bg-card p-5">
        <p className="font-medium text-foreground">Change password</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up both security questions above first — you'll use them here.
        </p>
      </div>
    );
  }

  async function submit() {
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("Those passwords don't match.");
      return;
    }
    setSaving(true);
    const res = await changePasswordWithAnswers({
      answer1,
      answer2,
      newPassword,
    });
    setSaving(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setDone(true);
    setAnswer1("");
    setAnswer2("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="font-medium text-foreground">Change password</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Use your security questions to change your password, even if you
        haven't forgotten it.
      </p>

      {!open ? (
        <button
          onClick={() => {
            setOpen(true);
            setDone(false);
          }}
          className="mt-3 rounded-lg border border-border px-4 py-2 text-sm text-foreground transition hover:border-primary"
        >
          Change password
        </button>
      ) : done ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Password changed.{" "}
          <button
            onClick={() => setOpen(false)}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Close
          </button>
        </p>
      ) : (
        <div className="mt-3 space-y-2.5">
          <div>
            <p className="mb-1 text-sm text-muted-foreground">{question1}</p>
            <input
              value={answer1}
              onChange={(e) => setAnswer1(e.target.value)}
              placeholder="Your answer"
              className={field}
            />
          </div>
          <div>
            <p className="mb-1 text-sm text-muted-foreground">{question2}</p>
            <input
              value={answer2}
              onChange={(e) => setAnswer2(e.target.value)}
              placeholder="Your answer"
              className={field}
            />
          </div>
          <input
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            type="password"
            placeholder="New password (8+ characters)"
            className={field}
          />
          <input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            type="password"
            placeholder="Confirm new password"
            className={field}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? "Changing…" : "Change password"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg px-4 py-2.5 text-muted-foreground transition hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
