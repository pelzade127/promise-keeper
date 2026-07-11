"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { claimInviteLink, respondToInvite } from "@/app/(app)/partners/actions";

export function ClaimInvite({
  token,
  ownerName,
  isSelf,
}: {
  token: string;
  ownerName: string | null;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"accepted" | "declined" | null>(null);

  if (isSelf) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-foreground">This is your own invite link.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Share it with someone else instead.
        </p>
      </div>
    );
  }

  if (!ownerName) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-foreground">
          This invite link is invalid or has already been used.
        </p>
      </div>
    );
  }

  async function respond(accept: boolean) {
    setError(null);
    setBusy(true);
    const claimed = await claimInviteLink(token);
    if (claimed.error || !claimed.id) {
      setBusy(false);
      setError(claimed.error ?? "Something went wrong.");
      return;
    }
    const res = await respondToInvite({ id: claimed.id, accept });
    setBusy(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setDone(accept ? "accepted" : "declined");
    router.refresh();
  }

  if (done) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="font-display text-2xl text-foreground">
          {done === "accepted" ? "You're connected." : "Okay, no problem."}
        </p>
        <p className="mt-2 text-muted-foreground">
          {done === "accepted"
            ? `You're now supporting ${ownerName}.`
            : "You can always accept an invitation later if they send another."}
        </p>
        <a
          href="/partners"
          className="mt-5 inline-block rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          Go to Partners
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-8 text-center">
      <h1 className="font-display text-2xl text-foreground">
        {ownerName} invited you to be their accountability partner.
      </h1>
      <p className="mt-2 text-muted-foreground">
        You'll see a bounded view of their promises — enough to encourage
        them, not everything.
      </p>
      {error && (
        <p className="mt-3 text-sm text-destructive">{error}</p>
      )}
      <div className="mt-5 flex justify-center gap-3">
        <button
          disabled={busy}
          onClick={() => respond(true)}
          className="rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          Accept
        </button>
        <button
          disabled={busy}
          onClick={() => respond(false)}
          className="rounded-lg px-5 py-2.5 text-muted-foreground transition hover:text-foreground disabled:opacity-60"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
