"use client";

export function CompletionStep({
  title,
  onConfirm,
}: {
  title: string;
  onConfirm: () => void;
}) {
  return (
    <div>
      <h2 className="font-display text-2xl text-foreground">
        You promised to {title.toLowerCase()}.
      </h2>
      <p className="mt-2 text-muted-foreground">Did you follow through?</p>
      <button
        onClick={onConfirm}
        className="mt-5 w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:bg-primary/90"
      >
        Yes, I did
      </button>
    </div>
  );
}
