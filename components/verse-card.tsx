"use client";

import { useState } from "react";
import type { Verse } from "@/lib/faith";

export function VerseCard({ verse }: { verse: Verse }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-8 rounded-lg border border-accent/30 bg-accent/10 px-5 py-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-4 text-left"
        aria-expanded={open}
      >
        <div>
          <p className="font-display text-lg text-foreground">“{verse.text}”</p>
          <p className="mt-1 text-sm text-accent-foreground/80">— {verse.ref}</p>
        </div>
        <span className="mt-1 shrink-0 text-sm text-muted-foreground">
          {open ? "Close" : "Reflect →"}
        </span>
      </button>

      {open && (
        <div className="mt-4 space-y-3 border-t border-accent/20 pt-4 text-sm leading-relaxed">
          <div>
            <p className="font-semibold text-foreground">Context</p>
            <p className="text-muted-foreground">{verse.context}</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">What it means</p>
            <p className="text-muted-foreground">{verse.meaning}</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Carry this today</p>
            <p className="text-muted-foreground">{verse.application}</p>
          </div>
          <div className="rounded-md bg-card/60 px-3 py-2.5">
            <p className="italic text-foreground/90">{verse.prayer}</p>
          </div>
        </div>
      )}
    </div>
  );
}
