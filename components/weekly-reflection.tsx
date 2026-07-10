"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveReflection } from "@/app/(app)/prayer/actions";

export function WeeklyReflection() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function save() {
    if (!content.trim()) return;
    setSaving(true);
    const res = await saveReflection(content);
    setSaving(false);
    if (res?.error) return;
    setDone(true);
    router.refresh();
  }

  if (done) {
    return (
      <div className="mb-8 rounded-lg border border-border bg-secondary px-5 py-4">
        <p className="text-secondary-foreground">
          Reflection saved. Thank you for pausing this week.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-8 rounded-lg border border-border bg-card px-5 py-4">
      <p className="font-display text-lg text-foreground">A moment to reflect</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Who's on your heart this week? Who did you show up for — and who might
        need you?
      </p>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        placeholder="No pressure to be tidy. Just honest."
        className="mt-3 w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
      />
      <button
        onClick={save}
        disabled={saving}
        className="mt-3 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save reflection"}
      </button>
    </div>
  );
}
