"use client";

export function FollowUpStep({
  who,
  busy,
  onPick,
}: {
  who: string;
  busy: boolean;
  onPick: (scheduleFollowUp: boolean) => void;
}) {
  return (
    <div>
      <h2 className="font-display text-2xl text-foreground">
        Would you like to check in with {who} again?
      </h2>
      <p className="mt-2 text-muted-foreground">
        We'll remind you when it's time.
      </p>
      <div className="mt-5 space-y-2">
        <button
          disabled={busy}
          onClick={() => onPick(true)}
          className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          Yes, remind me
        </button>
        <button
          disabled={busy}
          onClick={() => onPick(false)}
          className="w-full rounded-lg px-4 py-2.5 text-muted-foreground transition hover:text-foreground"
        >
          Not this time
        </button>
      </div>
    </div>
  );
}
