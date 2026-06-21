"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPerson, archivePerson } from "@/app/(app)/people/actions";

const field =
  "w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30";

export function AddPersonForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError(null);
    if (!name.trim()) {
      setError("Please enter a name.");
      return;
    }
    setSaving(true);
    const fd = new FormData();
    fd.set("name", name);
    fd.set("relationship_note", note);
    const res = await createPerson(fd);
    setSaving(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setName("");
    setNote("");
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="mb-3 font-medium text-foreground">Add someone</p>
      <div className="space-y-2.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className={field}
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="How you know them (optional)"
          className={field}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          onClick={submit}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? "Adding…" : "Add to my list"}
        </button>
      </div>
    </div>
  );
}

export function ArchiveButton({ personId }: { personId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await archivePerson(personId);
        router.refresh();
      }}
      className="text-sm text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline disabled:opacity-50"
    >
      Archive
    </button>
  );
}
