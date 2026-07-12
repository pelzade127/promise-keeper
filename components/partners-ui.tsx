"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  invitePartner,
  revokePartner,
  respondToInvite,
  inviteBack,
  generateInviteLink,
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
        <p className="text-xs text-muted-foreground">
          They'll see this invitation next time they sign in with that email.
          Let them know to expect it — this app doesn't send automatic emails
          yet.
        </p>
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

export function RespondButtons({
  id,
  ownerName,
}: {
  id: string;
  ownerName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [askedBack, setAskedBack] = useState(false);

  async function respond(accept: boolean) {
    setBusy(true);
    await respondToInvite({ id, accept });
    setBusy(false);
    if (accept) {
      // Deliberately don't refresh yet — refreshing now would re-fetch the
      // page, see this invite is no longer "pending", and unmount this card
      // (and its reciprocal-invite prompt) before the person can answer it.
      setAccepted(true);
    } else {
      router.refresh();
    }
  }

  async function sendBack(yes: boolean) {
    setAskedBack(true);
    if (yes) {
      setBusy(true);
      await inviteBack(id);
      setBusy(false);
    }
    router.refresh();
  }

  if (accepted) {
    if (askedBack) {
      return <p className="text-sm text-muted-foreground">Accepted.</p>;
    }
    return (
      <div className="text-right">
        <p className="mb-1.5 text-sm text-foreground">
          Want {ownerName} to be your accountability partner too?
        </p>
        <div className="flex justify-end gap-2">
          <button
            disabled={busy}
            onClick={() => sendBack(true)}
            className="rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            Yes, invite them
          </button>
          <button
            disabled={busy}
            onClick={() => sendBack(false)}
            className="rounded-lg px-3.5 py-1.5 text-sm text-muted-foreground transition hover:text-foreground disabled:opacity-50"
          >
            No thanks
          </button>
        </div>
      </div>
    );
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

export function InviteLinkGenerator() {
  const router = useRouter();
  const [visibility, setVisibility] = useState<
    "everything" | "overdue_only" | "selected_promises"
  >("overdue_only");
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setError(null);
    setBusy(true);
    const res = await generateInviteLink({ visibility });
    setBusy(false);
    if (res.error || !res.url) {
      setError(res.error ?? "Couldn't create a link.");
      return;
    }
    setUrl(res.url);
    setCopied(false);
    router.refresh();
  }

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="mb-1 font-medium text-foreground">Or share a link</p>
      <p className="mb-3 text-sm text-muted-foreground">
        No email needed — send this link to someone and they can accept it
        once they sign in.
      </p>

      {!url ? (
        <div className="space-y-2.5">
          <div className="grid gap-2">
            {(
              [
                ["overdue_only", "Only overdue promises"],
                ["everything", "All my active promises"],
                ["selected_promises", "Only promises I choose"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setVisibility(value)}
                className={`rounded-lg border p-2.5 text-left text-sm transition ${
                  visibility === value
                    ? "border-primary bg-secondary"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <span className="font-medium text-foreground">{label}</span>
              </button>
            ))}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            onClick={generate}
            disabled={busy}
            className="rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create invite link"}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground break-all">
            {url}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={copy}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
            <button
              onClick={() => setUrl(null)}
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Make another
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            This link works once, for one person.
          </p>
        </div>
      )}
    </div>
  );
}
