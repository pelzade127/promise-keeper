"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markPrayerAnswered } from "@/app/(app)/promises/actions";

type PrayerItem = {
  id: string;
  title: string;
  who: string;
  why: string | null;
};

export function PrayThrough({ items }: { items: PrayerItem[] }) {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/60 p-8 text-center text-muted-foreground">
        No open prayers right now. When you make a promise in the{" "}
        <span className="font-medium text-foreground">Prayer</span> category,
        it'll gather here.
      </div>
    );
  }

  if (!started) {
    return (
      <div className="rounded-lg border border-accent/30 bg-accent/10 p-6 text-center">
        <p className="font-display text-xl text-foreground">
          {items.length} {items.length === 1 ? "prayer" : "prayers"} to carry
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Take them one at a time. No rush.
        </p>
        <button
          onClick={() => {
            setStarted(true);
            setIndex(0);
          }}
          className="mt-4 rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          Begin praying
        </button>
      </div>
    );
  }

  if (index >= items.length) {
    return (
      <div className="rounded-lg border border-accent/30 bg-accent/10 p-8 text-center">
        <p className="font-display text-2xl text-foreground">Amen.</p>
        <p className="mt-2 text-muted-foreground">
          You carried {items.length} {items.length === 1 ? "person" : "people"}{" "}
          before God today.
        </p>
        <button
          onClick={() => {
            setStarted(false);
            setIndex(0);
          }}
          className="mt-4 rounded-lg border border-border px-5 py-2.5 text-foreground transition hover:border-primary"
        >
          Done
        </button>
      </div>
    );
  }

  const item = items[index];

  async function answered() {
    setBusy(true);
    await markPrayerAnswered({ promiseId: item.id });
    setBusy(false);
    router.refresh();
    setIndex((i) => i + 1);
  }

  return (
    <div className="rounded-lg border border-accent/30 bg-accent/10 p-6">
      <p className="text-sm text-muted-foreground">
        {index + 1} of {items.length}
      </p>
      <p className="mt-2 font-display text-sm uppercase tracking-wide text-accent-foreground/80">
        Praying for
      </p>
      <p className="font-display text-2xl text-foreground">{item.who}</p>
      <p className="mt-2 text-foreground">{item.title}</p>
      {item.why && (
        <p className="mt-1 text-sm text-muted-foreground">{item.why}</p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setIndex((i) => i + 1)}
          className="rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          {index + 1 === items.length ? "Amen" : "Next →"}
        </button>
        <button
          disabled={busy}
          onClick={answered}
          className="rounded-lg border border-accent/40 px-4 py-2.5 text-sm font-medium text-accent-foreground transition hover:bg-accent/20 disabled:opacity-60"
        >
          This was answered
        </button>
      </div>
    </div>
  );
}
