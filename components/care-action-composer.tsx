"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logCareAction } from "@/app/(app)/people/actions";
import { CARE_ACTION_TYPES } from "@/lib/care-actions";
import type { JournalEntryType } from "@/types/database";

export function CareActionComposer({
  personId,
  groupId,
  name,
  promises = [],
}: {
  personId?: string;
  groupId?: string;
  name: string;
  promises?: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<{ type: JournalEntryType; label: string } | null>(
    null,
  );
  const [note, setNote] = useState("");
  const [promiseId, setPromiseId] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!picked) return;
    setSaving(true);
    await logCareAction({
      personId,
      groupId,
      promiseId: promiseId || undefined,
      entryType: picked.type,
      note,
      label: picked.label,
    });
    setSaving(false);
    setPicked(null);
    setNote("");
    setPromiseId("");
    router.refresh();
  }

  if (!picked) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="mb-2.5 text-sm font-medium text-foreground">
          Log a quick care action
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CARE_ACTION_TYPES.map(([type, label]) => (
            <button
              key={type}
              onClick={() => setPicked({ type, label })}
              className="rounded-full border border-border px-3 py-1.5 text-sm text-foreground transition hover:border-primary hover:bg-secondary"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-secondary p-4">
      <p className="mb-2.5 text-sm font-medium text-secondary-foreground">
        {picked.label} — {name}
      </p>
      <div className="space-y-2">
        <input
          autoFocus
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Any detail? (optional)"
          className="w-full rounded-lg border border-input bg-card px-3.5 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
        {promises.length > 0 && (
          <select
            value={promiseId}
            onChange={(e) => setPromiseId(e.target.value)}
            className="w-full rounded-lg border border-input bg-card px-3.5 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          >
            <option value="">Not tied to a specific promise</option>
            {promises.map((p) => (
              <option key={p.id} value={p.id}>
                Part of: {p.title}
              </option>
            ))}
          </select>
        )}
        <div className="flex gap-2">
          <button
            onClick={submit}
            disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            {saving ? "Logging…" : "Log it"}
          </button>
          <button
            onClick={() => setPicked(null)}
            className="rounded-lg px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
