"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addJournalEntry } from "@/app/(app)/people/actions";
import { VERSES } from "@/lib/faith";

export function VerseAttach({
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
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);

  const verse = VERSES[idx];

  async function pray() {
    setBusy(true);
    const content = `Praying "${verse.text}" (${verse.ref}) over ${name}.`;
    await addJournalEntry({
      personId,
      groupId,
      entryType: "prayer",
      content,
    });
    setBusy(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-accent/40 bg-accent/10 px-4 py-2.5 text-sm font-medium text-accent-foreground transition hover:bg-accent/20"
      >
        Pray a verse over {name}
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
      <select
        value={idx}
        onChange={(e) => setIdx(Number(e.target.value))}
        className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
      >
        {VERSES.map((v, i) => (
          <option key={v.ref} value={i}>
            {v.ref}
          </option>
        ))}
      </select>
      <p className="mt-2 text-sm italic text-foreground/90">“{verse.text}”</p>
      <div className="mt-3 flex gap-2">
        <button
          disabled={busy}
          onClick={pray}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Add to their story"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
