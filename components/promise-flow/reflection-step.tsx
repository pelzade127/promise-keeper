"use client";

export function ReflectionStep({
  prompt,
  reflection,
  onChange,
  onContinue,
  busy,
  showAnsweredPrayer,
  onAnsweredPrayer,
}: {
  prompt: string;
  reflection: string;
  onChange: (value: string) => void;
  onContinue: () => void;
  busy: boolean;
  showAnsweredPrayer: boolean;
  onAnsweredPrayer: () => void;
}) {
  return (
    <div>
      <h2 className="font-display text-2xl text-foreground">{prompt}</h2>
      <p className="mt-1 text-sm text-muted-foreground">Optional — for you.</p>
      <textarea
        autoFocus
        value={reflection}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="mt-3 w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
      />
      <button
        disabled={busy}
        onClick={onContinue}
        className="mt-3 w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
      >
        {busy ? "Saving…" : "Continue"}
      </button>
      {showAnsweredPrayer && (
        <button
          disabled={busy}
          onClick={onAnsweredPrayer}
          className="mt-2 w-full rounded-lg border border-accent/40 bg-accent/10 px-4 py-2.5 text-sm font-medium text-accent-foreground transition hover:bg-accent/20 disabled:opacity-60"
        >
          This prayer was answered
        </button>
      )}
    </div>
  );
}
