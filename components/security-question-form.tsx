"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setSecurityQuestion } from "@/app/(app)/settings/actions";

const field =
  "w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30";

export function SecurityQuestionForm({
  hasQuestion,
  currentQuestion,
}: {
  hasQuestion: boolean;
  currentQuestion: string | null;
}) {
  const router = useRouter();
  const [question, setQuestion] = useState(currentQuestion ?? "");
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    setSaved(false);
    setSaving(true);
    const res = await setSecurityQuestion({ question, answer });
    setSaving(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setAnswer("");
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="font-medium text-foreground">Security question</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Since this app doesn't send emails, this is how you reset your
        password if you forget it. Pick something only you'd know.
      </p>
      <div className="mt-3 space-y-2.5">
        <input
          value={question}
          onChange={(e) => {
            setQuestion(e.target.value);
            setSaved(false);
          }}
          placeholder="e.g. What street did you grow up on?"
          className={field}
        />
        <input
          value={answer}
          onChange={(e) => {
            setAnswer(e.target.value);
            setSaved(false);
          }}
          placeholder={
            hasQuestion ? "New answer (leave blank to keep current)" : "Answer"
          }
          className={field}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        {saved && !error && (
          <p className="text-sm text-muted-foreground">Saved.</p>
        )}
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? "Saving…" : hasQuestion ? "Update" : "Set it up"}
        </button>
      </div>
    </div>
  );
}
