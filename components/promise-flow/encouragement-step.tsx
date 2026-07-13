"use client";

export function EncouragementStep({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="text-center">
      <p className="font-display text-2xl leading-snug text-foreground">
        {message}
      </p>
      <button
        onClick={onClose}
        className="mt-6 w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:bg-primary/90"
      >
        Close
      </button>
    </div>
  );
}
