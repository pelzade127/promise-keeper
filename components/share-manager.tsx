"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  setPartnerVisibility,
  togglePromiseShare,
  applySharesToAllPartners,
  setShowTitles,
} from "@/app/(app)/partners/actions";

type PromiseItem = { id: string; title: string; who: string };
type Visibility = "everything" | "overdue_only" | "selected_promises";

export function ShareManager({
  partnerId,
  initialVisibility,
  promises,
  initialShared,
  initialShowTitles,
}: {
  partnerId: string;
  initialVisibility: Visibility;
  promises: PromiseItem[];
  initialShared: string[];
  initialShowTitles: boolean;
}) {
  const router = useRouter();
  const [visibility, setVisibility] = useState<Visibility>(initialVisibility);
  const [shared, setShared] = useState<Set<string>>(new Set(initialShared));
  const [showTitles, setShowTitlesState] = useState(initialShowTitles);
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState(false);

  async function changeVisibility(v: Visibility) {
    setVisibility(v);
    setBusy(true);
    await setPartnerVisibility({ id: partnerId, visibility: v });
    setBusy(false);
    router.refresh();
  }

  async function toggleShowTitles(value: boolean) {
    setShowTitlesState(value);
    await setShowTitles({ id: partnerId, showTitles: value });
    router.refresh();
  }

  async function toggle(promiseId: string) {
    const next = new Set(shared);
    const willShare = !next.has(promiseId);
    if (willShare) next.add(promiseId);
    else next.delete(promiseId);
    setShared(next);
    await togglePromiseShare({ partnerId, promiseId, share: willShare });
  }

  async function applyToAll() {
    setBusy(true);
    await applySharesToAllPartners(partnerId);
    setBusy(false);
    setApplied(true);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">
          What can this partner see?
        </p>
        <div className="grid gap-2">
          {(
            [
              ["overdue_only", "Only overdue promises"],
              ["everything", "All my active promises"],
              ["selected_promises", "Only promises I choose"],
            ] as [Visibility, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              disabled={busy}
              onClick={() => changeVisibility(value)}
              className={`rounded-lg border p-3 text-left text-sm transition ${
                visibility === value
                  ? "border-primary bg-secondary"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <span className="font-medium text-foreground">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">
              What they see
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {showTitles
                ? "They see what each promise is actually about."
                : "They only see that something is due — not what it is."}
            </p>
          </div>
          <button
            role="switch"
            aria-checked={showTitles}
            onClick={() => toggleShowTitles(!showTitles)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${
              showTitles ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`absolute top-1 h-4 w-4 rounded-full bg-card shadow transition ${
                showTitles ? "left-6" : "left-1"
              }`}
            />
          </button>
        </div>
      </div>

      {visibility === "selected_promises" && (
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">
            Choose which promises to share
          </p>
          {promises.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
              You have no active promises to share yet.
            </p>
          ) : (
            <div className="space-y-2">
              {promises.map((p) => {
                const on = shared.has(p.id);
                return (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card px-4 py-3"
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(p.id)}
                      className="mt-1 h-4 w-4 rounded border-input accent-primary"
                    />
                    <span>
                      <span className="block text-foreground">{p.title}</span>
                      <span className="block text-sm text-muted-foreground">
                        {p.who}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button
              disabled={busy}
              onClick={applyToAll}
              className="rounded-lg border border-border px-4 py-2 text-sm text-foreground transition hover:border-primary disabled:opacity-50"
            >
              Apply this selection to all partners
            </button>
            {applied && (
              <span className="text-sm text-muted-foreground">Applied.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
