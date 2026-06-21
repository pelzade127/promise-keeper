"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addJournalEntry } from "@/app/(app)/people/actions";

const TYPES: [string, string][] = [
  ["note", "Note"],
  ["reflection", "Reflection"],
  ["prayer", "Prayer"],
  ["update", "Update"],
  ["memory", "Memory"],
];

export function JournalComposer({
  personId,
  groupId,
  name,
}: {
  personId?: string;
  groupId?: string;
  name: string;
}) {
  const router = useRouter();
  const [entryType, setEntryType] = useState("note");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!content.trim()) {
      setError("Write something first.");
      return;
    }
    setSaving(true);
    const res = await addJournalEntry({ personId, groupId, entryType, content });
    setSaving(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setContent("");
    setEntryType("note");
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {TYPES.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setEntryType(value)}
            className={`rounded-full px-3 py-1 text-sm transition ${
              entryType === value
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        placeholder={`Something about ${name}…`}
        className="w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
      />
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      <button
        onClick={submit}
        disabled={saving}
        className="mt-3 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Add to the story"}
      </button>
    </div>
  );
}
