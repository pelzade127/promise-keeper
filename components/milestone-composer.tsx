"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createMilestone } from "@/app/(app)/milestones/actions";
import { MILESTONE_TYPES } from "@/lib/milestones";
import type { MilestoneType } from "@/types/database";

const field =
  "w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30";

export function MilestoneComposer({
  personId,
  groupId,
  name,
}: {
  personId?: string;
  groupId?: string;
  name: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [milestoneType, setMilestoneType] =
    useState<MilestoneType>("meaningful_moment");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [occurredOn, setOccurredOn] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!title.trim()) {
      setError("Give this moment a title.");
      return;
    }
    setSaving(true);
    const res = await createMilestone({
      personId,
      groupId,
      milestoneType,
      title,
      note: note || undefined,
      occurredOn,
    });
    setSaving(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setTitle("");
    setNote("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-accent/40 bg-accent/10 px-4 py-2.5 text-sm font-medium text-accent-foreground transition hover:bg-accent/20"
      >
        Mark a milestone
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
      <p className="mb-2 text-sm font-medium text-foreground">
        Mark a milestone with {name}
      </p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {MILESTONE_TYPES.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setMilestoneType(value)}
            className={`rounded-full px-3 py-1 text-xs transition ${
              milestoneType === value
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What happened?"
          className={field}
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Any more of the story? (optional)"
          className={field}
        />
        <input
          type="date"
          value={occurredOn}
          onChange={(e) => setOccurredOn(e.target.value)}
          className={field}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={submit}
            disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Mark it"}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
