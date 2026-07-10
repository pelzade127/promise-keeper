"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  invitePartner,
  revokePartner,
  respondToInvite,
} from "@/app/(app)/partners/actions";

const field =
  "w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30";

export function InvitePartnerForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [visibility, setVisibility] = useState<
    "everything" | "overdue_only" | "selected_promises"
  >("overdue_only");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError(null);
    if (!email.trim()) {
      setError("Enter their email.");
      return;
    }
    setSaving(true);
    const res = await invitePartner({ email, visibility });
    setSaving(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setEmail("");
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="mb-3 font-medium text-foreground">Invite a partner</p>
      <div className="space-y-2.5">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Their email"
          className={field}
        />
        <div>
          <p className="mb-1.5 text-sm text-muted-foreground">
            What can they see?
          </p>
          <div className="grid gap-2">
            {(
              [
                ["overdue_only", "Only overdue promises", "A gentle nudge list."],
                ["everything", "All my active promises", "Full visibility."],
                [
                  "selected_promises",
                  "Only promises I choose",
                  "Pick them after inviting.",
                ],
              ] as const
            ).map(([value, label, desc]) => (
              <button
                key={value}
                onClick={() => setVisibility(value)}
                className={`rounded-lg border p-3 text-left text-sm transition ${
                  visibility === value
                    ? "border-primary bg-secondary"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <span className="font-medium text-foreground">{label}</span>
                <span className="block text-muted-foreground">{desc}</span>
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          onClick={submit}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? "Sending…" : "Send invitation"}
        </button>
      </div>
    </div>
  );
}

export function RevokeButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await revokePartner(id);
        router.refresh();
      }}
      className="text-sm text-muted-foreground underline-offset-4 transition hover:text-destructive hover:underline disabled:opacity-50"
    >
      Remove
    </button>
  );
}

export function RespondButtons({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function respond(accept: boolean) {
    setBusy(true);
    await respondToInvite({ id, accept });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button
        disabled={busy}
        onClick={() => respond(true)}
        className="rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
      >
        Accept
      </button>
      <button
        disabled={busy}
        onClick={() => respond(false)}
        className="rounded-lg px-3.5 py-1.5 text-sm text-muted-foreground transition hover:text-foreground disabled:opacity-50"
      >
        Decline
      </button>
    </div>
  );
}
