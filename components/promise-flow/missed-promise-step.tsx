"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const RELEASE_REASONS: [string, string][] = [
  ["forgot", "Forgot"],
  ["got_busy", "Got busy"],
  ["avoided", "Avoided it"],
  ["circumstances_changed", "Things changed"],
  ["no_longer_relevant", "No longer relevant"],
];

export function MissedPromiseStep({
  busy,
  faithMode = false,
  onRelease,
}: {
  busy: boolean;
  faithMode?: boolean;
  onRelease: (reason?: string) => void;
}) {
  const [reason, setReason] = useState<string | undefined>(undefined);
  return (
    <div>
      <h2 className="font-display text-2xl text-foreground">
        It's okay to let this go.
      </h2>
      <p className="mt-2 text-muted-foreground">
        {faithMode
          ? "Grace is bigger than a promise you couldn't keep. Releasing this isn't failure — it's honesty. You're still loved exactly as much as when you made it."
          : "The habit of keeping promises isn't built in a day. Keep becoming the Promise Keeper you know you can be."}
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        Anything you want to note? (optional)
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {RELEASE_REASONS.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setReason(reason === value ? undefined : value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition",
              reason === value
                ? "border-primary bg-secondary text-secondary-foreground"
                : "border-border text-muted-foreground hover:border-primary/50",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <button
        disabled={busy}
        onClick={() => onRelease(reason)}
        className="mt-5 w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
      >
        {busy ? "Releasing…" : "Release this promise"}
      </button>
    </div>
  );
}
