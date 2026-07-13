"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { faithEncouragements, faithOccurrenceEncouragements } from "@/lib/faith";
import type { PromiseWithRelations } from "@/types/database";
import { CompletionStep } from "@/components/promise-flow/completion-step";
import { ReflectionStep } from "@/components/promise-flow/reflection-step";
import { ContinuationStep } from "@/components/promise-flow/continuation-step";
import { FollowUpStep } from "@/components/promise-flow/follow-up-step";
import { MissedPromiseStep } from "@/components/promise-flow/missed-promise-step";
import { EncouragementStep } from "@/components/promise-flow/encouragement-step";
import type { CompletionStepName } from "@/components/promise-flow/types";
import {
  completePromise,
  recommitPromise,
  releasePromise,
  completeFollowUp,
  dismissFollowUp,
  markPrayerAnswered,
} from "@/app/(app)/promises/actions";

type Mode = null | "complete" | "recommit" | "release" | "checkin";

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

/**
 * A single act of care within an ongoing promise — not the whole commitment
 * finishing. Kept distinct from `encouragements()` on purpose: showing up
 * once more shouldn't sound like closing something out.
 */
function occurrenceEncouragements(name: string, isSelf: boolean): string[] {
  if (isSelf) {
    return [
      "One more act of showing up for yourself. Not the finish line — just today.",
      "You didn't have to be finished to be faithful today.",
    ];
  }
  return [
    `You showed up for ${name} again today.`,
    `Another quiet act of care for ${name} — the story keeps going.`,
    `${name} was on your mind, and you did something about it.`,
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
  if (p.due_date === today) {
    return p.promise_type === "recurring" ? "Time for this again" : "Due today";
  }
  if (p.due_date < today) {
    return p.promise_type === "recurring" ? "Due for another check-in" : "Overdue";
  }
  const dateLabel = new Date(p.due_date + "T00:00:00").toLocaleDateString(
    undefined,
    { month: "short", day: "numeric" },
  );
  return p.promise_type === "recurring" ? `Next: ${dateLabel}` : dateLabel;
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
  const isOngoing = promise.promise_type !== "one_time";
  const who = isSelf
    ? "Yourself"
    : promise.target_type === "group"
      ? (promise.group?.name ?? "Your group")
      : (promise.person?.name ?? "Someone");

  // A hard deadline missed (one-time only) reads as urgent. A recurring
  // promise past its next rhythm beat isn't a failure — it just needs
  // attention, so it gets a softer tone, not an alarm.
  const isPastDeadline =
    promise.promise_type === "one_time" &&
    promise.due_date != null &&
    promise.due_date < today;
  const isPastRhythm =
    promise.promise_type === "recurring" &&
    promise.due_date != null &&
    promise.due_date < today;
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
              isPastDeadline
                ? "text-destructive"
                : isPastRhythm
                  ? "text-accent-foreground/80"
                  : "text-muted-foreground",
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
                  {isOngoing ? "I did this" : "Complete"}
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
  const isOngoing = promise.promise_type !== "one_time";
  const hasFollowUp = promise.follow_up_type !== "none";
  const [step, setStep] = useState<CompletionStepName>("confirm");
  const [reflection, setReflection] = useState("");
  const [message, setMessage] = useState("");

  const isPrayer = promise.category?.name === "Prayer";
  const reflectPrompt =
    faithMode && isPrayer
      ? "How did God show up?"
      : isPrayer
        ? "What did you pray about?"
        : "Anything you'd like to remember about this?";

  async function finish(scheduleFollowUp: boolean, finalize = false) {
    const endsHere = !isOngoing || finalize;
    const pool = endsHere
      ? faithMode
        ? faithEncouragements(who, isSelf)
        : encouragements(who, isSelf)
      : faithMode
        ? faithOccurrenceEncouragements(who, isSelf)
        : occurrenceEncouragements(who, isSelf);
    setMessage(pool[Math.floor(Math.random() * pool.length)]);

    setBusy(true);
    await completePromise({
      promiseId: promise.id,
      reflection: reflection || undefined,
      scheduleFollowUp,
      finalize,
    });
    setStep("done");
    setBusy(false);
  }

  async function answerPrayer() {
    const pool = faithEncouragements(who, isSelf);
    setMessage(pool[Math.floor(Math.random() * pool.length)]);
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
      <CompletionStep
        title={promise.title}
        onConfirm={() => setStep("reflect")}
      />
    );
  }

  if (step === "reflect") {
    return (
      <ReflectionStep
        prompt={reflectPrompt}
        reflection={reflection}
        onChange={setReflection}
        onContinue={() => {
          if (isOngoing) {
            setStep("continue");
          } else if (hasFollowUp) {
            setStep("followup");
          } else {
            finish(false);
          }
        }}
        busy={busy}
        showAnsweredPrayer={faithMode && isPrayer}
        onAnsweredPrayer={answerPrayer}
      />
    );
  }

  if (step === "continue") {
    return (
      <ContinuationStep
        who={who}
        busy={busy}
        onChoose={(keepGoing) => {
          if (keepGoing) {
            hasFollowUp ? setStep("followup") : finish(false);
          } else {
            finish(false, true);
          }
        }}
      />
    );
  }

  if (step === "followup") {
    return <FollowUpStep who={who} busy={busy} onPick={finish} />;
  }

  return <EncouragementStep message={message} onClose={onDone} />;
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
  busy,
  onRelease,
}: {
  busy: boolean;
  onRelease: (reason?: string) => void;
}) {
  return <MissedPromiseStep busy={busy} onRelease={onRelease} />;
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

  if (step === "done") {
    return <EncouragementStep message={message} onClose={onDone} />;
  }

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
