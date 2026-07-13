"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setSecurityQuestions } from "@/app/(app)/settings/actions";

const field =
  "w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30";

export function SecurityQuestionForm({
  currentQuestion1,
  currentQuestion2,
}: {
  currentQuestion1: string | null;
  currentQuestion2: string | null;
}) {
  const router = useRouter();
  const [question1, setQuestion1] = useState(currentQuestion1 ?? "");
  const [question2, setQuestion2] = useState(currentQuestion2 ?? "");
  const [answer1, setAnswer1] = useState("");
  const [answer2, setAnswer2] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    setSaved(false);
    setSaving(true);
    const res = await setSecurityQuestions({
      question1,
      answer1,
      question2,
      answer2,
    });
    setSaving(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setAnswer1("");
    setAnswer2("");
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="font-medium text-foreground">Security questions</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Since this app doesn't send emails, these are how you reset or change
        your password. Make up your own — harder or easier, your call.
      </p>
      <div className="mt-3 space-y-4">
        <div className="space-y-2">
          <input
            value={question1}
            onChange={(e) => {
              setQuestion1(e.target.value);
              setSaved(false);
            }}
            placeholder="Question 1"
            className={field}
          />
          <input
            value={answer1}
            onChange={(e) => {
              setAnswer1(e.target.value);
              setSaved(false);
            }}
            placeholder={
              currentQuestion1
                ? "New answer (leave blank to keep current)"
                : "Answer 1"
            }
            className={field}
          />
        </div>
        <div className="space-y-2">
          <input
            value={question2}
            onChange={(e) => {
              setQuestion2(e.target.value);
              setSaved(false);
            }}
            placeholder="Question 2"
            className={field}
          />
          <input
            value={answer2}
            onChange={(e) => {
              setAnswer2(e.target.value);
              setSaved(false);
            }}
            placeholder={
              currentQuestion2
                ? "New answer (leave blank to keep current)"
                : "Answer 2"
            }
            className={field}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {saved && !error && (
          <p className="text-sm text-muted-foreground">Saved.</p>
        )}
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? "Saving…" : currentQuestion1 ? "Update" : "Set it up"}
        </button>
      </div>
    </div>
  );
}
