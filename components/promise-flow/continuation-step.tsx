"use client";

export function ContinuationStep({
  who,
  busy,
  faithMode = false,
  onChoose,
}: {
  who: string;
  busy: boolean;
  faithMode?: boolean;
  onChoose: (keepGoing: boolean) => void;
}) {
  return (
    <div>
      <h2 className="font-display text-2xl text-foreground">
        Is this promise still going, or is it complete?
      </h2>
      <p className="mt-2 text-muted-foreground">
        {faithMode
          ? `Formation takes time. You decide when this one with ${who} has done its work — not a schedule, and not a sense of finally earning something.`
          : `One act of care doesn't have to be the last. You decide when the story with ${who} on this one is finished.`}
      </p>
      <div className="mt-5 space-y-2">
        <button
          disabled={busy}
          onClick={() => onChoose(true)}
          className="w-full rounded-lg border border-border bg-card px-4 py-3 text-left text-foreground transition hover:border-primary disabled:opacity-50"
        >
          <span className="font-medium">Still going</span>
          <span className="block text-sm text-muted-foreground">
            Keep this promise active.
          </span>
        </button>
        <button
          disabled={busy}
          onClick={() => onChoose(false)}
          className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? "Saving…" : "This is complete now"}
        </button>
      </div>
    </div>
  );
}
