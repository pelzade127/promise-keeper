"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setFaithMode, getFaithMode } from "@/app/(app)/settings/actions";

export function FaithModeToggle({ initial }: { initial: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  // The page this switch lives on can be served from Next's client-side
  // Router Cache — a stale snapshot from before a change, even though the
  // database is already correct (this is why other faith-mode features, like
  // the dashboard verse, always show the right thing: they're read fresh on
  // their own page load, just not necessarily THIS page on a cached
  // revisit). A Server Action call is a real network round-trip, not a page
  // navigation, so it isn't subject to that cache — calling one on mount
  // double-checks the switch against the actual truth every time.
  useEffect(() => {
    let cancelled = false;
    getFaithMode().then((res) => {
      if (!cancelled) setOn(res.faithMode);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
