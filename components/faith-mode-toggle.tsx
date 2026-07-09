"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setFaithMode } from "@/app/(app)/settings/actions";

export function FaithModeToggle({ initial }: { initial: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !on;
    setOn(next);
    setBusy(true);
    const res = await setFaithMode(next);
    setBusy(false);
    if (res?.error) {
      setOn(!next); // revert on failure
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card p-5">
      <div className="pr-6">
        <p className="font-medium text-foreground">Faith Mode</p>
        <p className="mt-1 text-sm text-muted-foreground">
          A gentle devotional layer — a verse to carry each day, and
          encouragement framed around faithfulness and love.
        </p>
      </div>
      <button
        role="switch"
        aria-checked={on}
        disabled={busy}
        onClick={toggle}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          on ? "bg-accent" : "bg-muted"
        } disabled:opacity-60`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-card shadow transition ${
            on ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}
