"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createNeed } from "@/app/(app)/needs/actions";

const field =
  "w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30";

export function NeedComposer({
  personId,
  name,
}: {
  personId: string;
  name: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!title.trim()) {
      setError("Give this need a title.");
      return;
    }
    setSaving(true);
    const res = await createNeed({ personId, title, description });
    setSaving(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setTitle("");
    setDescription("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        + Add a need
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="mb-2 text-sm font-medium text-foreground">
        What season is {name} in right now?
      </p>
      <div className="space-y-2">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Employment, Housing, Grief"
          className={field}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Any more context? (optional)"
          className={field}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={submit}
            disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Add need"}
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
