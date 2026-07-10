"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { faithEncouragements } from "@/lib/faith";
import type { PromiseWithRelations } from "@/types/database";
import {
  completePromise,
  recommitPromise,
  releasePromise,
  completeFollowUp,
  dismissFollowUp,
  markPrayerAnswered,
} from "@/app/(app)/promises/actions";

type Mode = null | "complete" | "recommit" | "release" | "checkin";
type Step = "confirm" | "reflect" | "followup" | "done";

const RELEASE_REASONS: [string, string][] = [
  ["forgot", "Forgot"],
  ["got_busy", "Got busy"],
  ["avoided", "Avoided it"],
  ["circumstances_changed", "Things changed"],
  ["no_longer_relevant", "No longer relevant"],
];

function encouragements(name: string, isSelf: boolean): string[] {
  if (isSelf) {
    return [
      "You showed up for yourself today.",
      "You kept your word to yourself — that counts.",
      "This is what faithfulness looks like.",
    ];
  }
  return [
    `${name} is worth the effort you put in today.`,
    `I bet ${name} feels a little more remembered today.`,
    "Isn't it good to know your word wasn't empty?",
    "This is what faithfulness looks like.",
    `A small act of care for ${name}, kept.`,
  ];
}

function isoInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDue(p: PromiseWithRelations, today: string): string {
  if (p.promise_type === "open_ended_care") return "Ongoing care";
  if (!p.due_date) return "No date set";
  if (p.due_date === today) return "Today";
  if (p.due_date < today) return "Overdue";
  return new Date(p.due_date + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function PromiseCard({
  promise,
  today,
  context = "default",
  faithMode = false,
}: {
  promise: PromiseWithRelations;
  today: string;
  context?: "default" | "followup";
  faithMode?: boolean;
}) {
  const router = useRouter();
  const isSelf = promise.target_type === "self";
  const who = isSelf
    ? "Yourself"
    : promise.target_type === "group"
      ? (promise.group?.name ?? "Your group")
      : (promise.person?.name ?? "Someone");

  const isOverdue =
    promise.due_date != null &&
    promise.due_date < today &&
    promise.promise_type !== "open_ended_care";
  const followUpDue =
    promise.next_follow_up_date != null && promise.next_follow_up_date <= today;

  const [mode, setMode] = useState<Mode>(null);
  const [busy, setBusy] = useState(false);

  function close() {
    setMode(null);
    setBusy(false);
  }

  return (
    <>
      <article className="group rounded-lg border border-border bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:shadow-[0_6px_20px_rgba(47,93,80,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-lg leading-tight text-foreground">
              {who}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">{promise.title}</p>
          </div>
          {promise.category && (
            <span
              className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
              style={{
                backgroundColor: `${promise.category.color ?? "#999"}1A`,
                color: promise.category.color ?? "inherit",
              }}
            >
              {promise.category.name}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-xs font-medium",
              isOverdue ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {followUpDue ? "Time to check in" : formatDue(promise, today)}
          </span>
          <div className="flex flex-wrap justify-end gap-1.5">
            {(followUpDue || context === "followup") && (
              <button
                onClick={() => setMode("checkin")}
                className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground transition hover:bg-accent/90"
              >
                I checked in
              </button>
            )}
            {context !== "followup" && (
              <>
                <button
                  onClick={() => setMode("complete")}
                  className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
                >
                  Complete
                </button>
                <button
                  onClick={() => setMode("recommit")}
                  className="rounded-md px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  Recommit
                </button>
                <Link
                  href={`/promises/${promise.id}/edit`}
                  className="rounded-md px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  Edit
                </Link>
              </>
            )}
            {context === "followup" ? (
              <button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await dismissFollowUp(promise.id);
                  router.refresh();
                }}
                className="rounded-md px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                Done with this
              </button>
            ) : (
              <button
                onClick={() => setMode("release")}
                className="rounded-md px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                Release
              </button>
            )}
          </div>
        </div>
      </article>

      {mode && (
        <Modal onClose={close}>
          {mode === "complete" && (
            <CompleteFlow
              promise={promise}
              who={who}
              isSelf={isSelf}
              faithMode={faithMode}
              busy={busy}
              setBusy={setBusy}
              onDone={() => {
                router.refresh();
                close();
              }}
            />
          )}
          {mode === "recommit" && (
            <RecommitFlow
              who={who}
              busy={busy}
              onPick={async (date) => {
                setBusy(true);
                await recommitPromise(promise.id, date);
                router.refresh();
                close();
              }}
            />
          )}
          {mode === "release" && (
            <ReleaseFlow
              who={who}
              busy={busy}
              onRelease={async (reason) => {
                setBusy(true);
                await releasePromise(promise.id, reason);
                router.refresh();
                close();
              }}
            />
          )}
          {mode === "checkin" && (
            <CheckInFlow
              promise={promise}
              who={who}
              isSelf={isSelf}
              faithMode={faithMode}
              busy={busy}
              setBusy={setBusy}
              onDone={() => {
                router.refresh();
                close();
              }}
            />
          )}
        </Modal>
      )}
    </>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm animate-fade-up rounded-lg bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function CompleteFlow({
  promise,
  who,
  isSelf,
  faithMode,
  busy,
  setBusy,
  onDone,
}: {
  promise: PromiseWithRelations;
  who: string;
  isSelf: boolean;
  faithMode: boolean;
  busy: boolean;
  setBusy: (b: boolean) => void;
  onDone: () => void;
}) {
  const hasFollowUp = promise.follow_up_type !== "none";
  const [step, setStep] = useState<Step>("confirm");
  const [reflection, setReflection] = useState("");
  const [message] = useState(() => {
    const list = faithMode
      ? faithEncouragements(who, isSelf)
      : encouragements(who, isSelf);
    return list[Math.floor(Math.random() * list.length)];
  });

  const isPrayer = promise.category?.name === "Prayer";
  const reflectPrompt =
    faithMode && isPrayer
      ? "How did God show up?"
      : isPrayer
        ? "What did you pray about?"
        : "Anything you'd like to remember about this?";

  async function finish(scheduleFollowUp: boolean) {
    setBusy(true);
    await completePromise({
      promiseId: promise.id,
      reflection: reflection || undefined,
      scheduleFollowUp,
    });
    setStep("done");
    setBusy(false);
  }

  async function answerPrayer() {
    setBusy(true);
    await markPrayerAnswered({
      promiseId: promise.id,
      note: reflection || undefined,
    });
    setStep("done");
    setBusy(false);
  }

  if (step === "confirm") {
    return (
      <div>
        <h2 className="font-display text-2xl text-foreground">
          You promised to {promise.title.toLowerCase()}.
        </h2>
        <p className="mt-2 text-muted-foreground">Did you follow through?</p>
        <button
          onClick={() => setStep("reflect")}
          className="mt-5 w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          Yes, I did
        </button>
      </div>
    );
  }

  if (step === "reflect") {
    return (
      <div>
        <h2 className="font-display text-2xl text-foreground">{reflectPrompt}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Optional — for you.</p>
        <textarea
          autoFocus
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          rows={3}
          className="mt-3 w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
        <button
          disabled={busy}
          onClick={() => (hasFollowUp ? setStep("followup") : finish(false))}
          className="mt-3 w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Continue"}
        </button>
        {faithMode && isPrayer && (
          <button
            disabled={busy}
            onClick={answerPrayer}
            className="mt-2 w-full rounded-lg border border-accent/40 bg-accent/10 px-4 py-2.5 text-sm font-medium text-accent-foreground transition hover:bg-accent/20 disabled:opacity-60"
          >
            This prayer was answered
          </button>
        )}
      </div>
    );
  }

  if (step === "followup") {
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
            onClick={() => finish(true)}
            className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            Yes, remind me
          </button>
          <button
            disabled={busy}
            onClick={() => finish(false)}
            className="w-full rounded-lg px-4 py-2.5 text-muted-foreground transition hover:text-foreground"
          >
            Not this time
          </button>
        </div>
      </div>
    );
  }

  // done
  return (
    <div className="text-center">
      <p className="font-display text-2xl leading-snug text-foreground">
        {message}
      </p>
      <button
        onClick={onDone}
        className="mt-6 w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:bg-primary/90"
      >
        Close
      </button>
    </div>
  );
}

function RecommitFlow({
  who,
  busy,
  onPick,
}: {
  who: string;
  busy: boolean;
  onPick: (date: string) => void;
}) {
  const [custom, setCustom] = useState("");
  return (
    <div>
      <h2 className="font-display text-2xl text-foreground">
        When will you come back to {who}?
      </h2>
      <p className="mt-2 text-muted-foreground">
        Recommitting is part of keeping your word, not failing at it.
      </p>
      <div className="mt-5 space-y-2">
        {([
          ["Tomorrow", 1],
          ["In 3 days", 3],
          ["Next week", 7],
        ] as [string, number][]).map(([label, days]) => (
          <button
            key={label}
            disabled={busy}
            onClick={() => onPick(isoInDays(days))}
            className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-left text-foreground transition hover:border-primary disabled:opacity-50"
          >
            {label}
          </button>
        ))}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="date"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="flex-1 rounded-lg border border-input bg-card px-3 py-2 text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
          <button
            disabled={busy || !custom}
            onClick={() => onPick(custom)}
            className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            Set
          </button>
        </div>
      </div>
    </div>
  );
}

function ReleaseFlow({
  who,
  busy,
  onRelease,
}: {
  who: string;
  busy: boolean;
  onRelease: (reason?: string) => void;
}) {
  const [reason, setReason] = useState<string | undefined>(undefined);
  return (
    <div>
      <h2 className="font-display text-2xl text-foreground">
        It's okay to let this go.
      </h2>
      <p className="mt-2 text-muted-foreground">
        The habit of keeping promises isn't built in a day. Keep becoming the
        Promise Keeper you know you can be.
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
        {busy ? "Releasing…" : `Release this promise`}
      </button>
    </div>
  );
}

function CheckInFlow({
  promise,
  who,
  isSelf,
  faithMode,
  busy,
  setBusy,
  onDone,
}: {
  promise: PromiseWithRelations;
  who: string;
  isSelf: boolean;
  faithMode: boolean;
  busy: boolean;
  setBusy: (b: boolean) => void;
  onDone: () => void;
}) {
  const [step, setStep] = useState<"note" | "done">("note");
  const [note, setNote] = useState("");
  const [message] = useState(() => {
    if (faithMode) {
      const list = faithEncouragements(who, isSelf);
      return list[Math.floor(Math.random() * list.length)];
    }
    const list = isSelf
      ? ["You came back around. That's faithfulness."]
      : [
          `${who} got to feel remembered again today.`,
          `Showing up twice for ${who} — that's the whole point.`,
          "Following through, again. This is the habit forming.",
        ];
    return list[Math.floor(Math.random() * list.length)];
  });

  if (step === "note") {
    return (
      <div>
        <h2 className="font-display text-2xl text-foreground">
          Checking in with {who}.
        </h2>
        <p className="mt-2 text-muted-foreground">How did it go? (optional)</p>
        <textarea
          autoFocus
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="A line to remember this moment by."
          className="mt-3 w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await completeFollowUp(promise.id, note || undefined);
            setStep("done");
            setBusy(false);
          }}
          className="mt-3 w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Mark checked in"}
        </button>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className="font-display text-2xl leading-snug text-foreground">
        {message}
      </p>
      <button
        onClick={onDone}
        className="mt-6 w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:bg-primary/90"
      >
        Close
      </button>
    </div>
  );
}
