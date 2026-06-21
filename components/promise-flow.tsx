"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createPromise } from "@/app/(app)/promises/actions";
import type {
  PromiseType,
  PromiseRecurrence,
  FollowUpType,
  CreatePromiseInput,
} from "@/types/database";

type Person = { id: string; name: string };
type Category = { id: string; name: string; color: string | null };
type Step = "ask" | "select" | "newPerson" | "details";

const field =
  "w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30";

const label = "block text-sm font-medium text-foreground mb-1.5";

export function PromiseFlow({
  people,
  categories,
  preselectedPerson = null,
}: {
  people: Person[];
  categories: Category[];
  preselectedPerson?: Person | null;
}) {
  const router = useRouter();

  const [step, setStep] = useState<Step>(preselectedPerson ? "details" : "ask");
  const [chosenPerson, setChosenPerson] = useState<Person | null>(
    preselectedPerson,
  );
  const [newPersonName, setNewPersonName] = useState("");
  const [query, setQuery] = useState("");

  // Promise details
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [why, setWhy] = useState("");
  const [promiseType, setPromiseType] = useState<PromiseType>("one_time");
  const [recurrence, setRecurrence] = useState<PromiseRecurrence>("weekly");
  const [dueDate, setDueDate] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [followUpType, setFollowUpType] = useState<FollowUpType>("none");
  const [followUpDays, setFollowUpDays] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) => p.name.toLowerCase().includes(q));
  }, [people, query]);

  const whoName = chosenPerson?.name ?? newPersonName.trim();
  const isOpenEnded = promiseType === "open_ended_care";

  async function handleSubmit() {
    setError(null);
    if (!title.trim()) {
      setError("Give the promise a title.");
      return;
    }
    setSubmitting(true);

    const input: CreatePromiseInput = {
      personId: chosenPerson?.id,
      newPersonName: chosenPerson ? undefined : newPersonName.trim(),
      title,
      categoryId: categoryId || undefined,
      whyItMatters: why || undefined,
      promiseType,
      recurrence: promiseType === "recurring" ? recurrence : undefined,
      dueDate: isOpenEnded ? undefined : dueDate || undefined,
      reminderEnabled,
      followUpType,
      followUpIntervalDays:
        followUpType !== "none" && followUpDays
          ? Number(followUpDays)
          : undefined,
    };

    const res = await createPromise(input);
    // On success the action redirects; we only reach here on error.
    if (res?.error) {
      setError(res.error);
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg animate-fade-up">
      <button
        onClick={() => router.push("/dashboard")}
        className="mb-6 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        ← Back to dashboard
      </button>

      {/* STEP 1 — Is this person already in your list? */}
      {step === "ask" && (
        <div>
          <h1 className="font-display text-3xl text-foreground">
            Who are you making a promise to?
          </h1>
          <p className="mt-2 text-muted-foreground">
            Is this person already in your promise list?
          </p>
          <div className="mt-6 grid gap-3">
            <button
              onClick={() => setStep(people.length ? "select" : "newPerson")}
              className="rounded-lg border border-border bg-card p-4 text-left transition hover:border-primary hover:shadow-sm"
            >
              <p className="font-medium text-foreground">
                Yes — find them in my list
              </p>
              <p className="text-sm text-muted-foreground">
                {people.length
                  ? `Search ${people.length} ${people.length === 1 ? "person" : "people"} you've cared for.`
                  : "You haven't added anyone yet."}
              </p>
            </button>
            <button
              onClick={() => setStep("newPerson")}
              className="rounded-lg border border-border bg-card p-4 text-left transition hover:border-primary hover:shadow-sm"
            >
              <p className="font-medium text-foreground">
                No — this is someone new
              </p>
              <p className="text-sm text-muted-foreground">
                Add them to your list.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2a — Select an existing person */}
      {step === "select" && (
        <div>
          <h1 className="font-display text-3xl text-foreground">
            Please select from your list
          </h1>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type any part of their name…"
            className={`${field} mt-4`}
          />
          <div className="mt-4 space-y-2">
            {matches.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No one matches that.{" "}
                <button
                  onClick={() => setStep("newPerson")}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Add someone new
                </button>
              </p>
            )}
            {matches.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setChosenPerson(p);
                  setStep("details");
                }}
                className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left transition hover:border-primary"
              >
                <span className="font-medium text-foreground">{p.name}</span>
                <span className="text-sm text-muted-foreground">Select →</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep("newPerson")}
            className="mt-5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Actually, they're new →
          </button>
        </div>
      )}

      {/* STEP 2b — Add a new person */}
      {step === "newPerson" && (
        <div>
          <h1 className="font-display text-3xl text-foreground">
            Who are you remembering?
          </h1>
          <p className="mt-2 text-muted-foreground">
            Just their name for now — you can add more later.
          </p>
          <input
            autoFocus
            value={newPersonName}
            onChange={(e) => setNewPersonName(e.target.value)}
            placeholder="e.g. Sarah, Mom, Pastor John"
            className={`${field} mt-5`}
          />
          <button
            disabled={!newPersonName.trim()}
            onClick={() => {
              setChosenPerson(null);
              setStep("details");
            }}
            className="mt-4 w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      )}

      {/* STEP 3 — Promise details */}
      {step === "details" && (
        <div>
          <h1 className="font-display text-3xl text-foreground">
            Your promise to {whoName || "them"}
          </h1>

          <div className="mt-6 space-y-5">
            <div>
              <label className={label}>The promise</label>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Pray for Sarah's job search"
                className={field}
              />
            </div>

            <div>
              <label className={label}>Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={field}
              >
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={label}>Why this matters (optional)</label>
              <textarea
                value={why}
                onChange={(e) => setWhy(e.target.value)}
                rows={2}
                placeholder="A line to remind future-you why you cared."
                className={field}
              />
            </div>

            <div>
              <label className={label}>What kind of promise?</label>
              <div className="grid gap-2">
                {(
                  [
                    ["one_time", "One time", "A single commitment."],
                    ["recurring", "Recurring", "Happens on a rhythm."],
                    [
                      "open_ended_care",
                      "Ongoing care",
                      "No deadline — just showing up for them.",
                    ],
                  ] as const
                ).map(([value, name, desc]) => (
                  <button
                    key={value}
                    onClick={() => setPromiseType(value)}
                    className={`rounded-lg border p-3 text-left transition ${
                      promiseType === value
                        ? "border-primary bg-secondary"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <span className="font-medium text-foreground">{name}</span>
                    <span className="block text-sm text-muted-foreground">
                      {desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {promiseType === "recurring" && (
              <div>
                <label className={label}>How often?</label>
                <select
                  value={recurrence}
                  onChange={(e) =>
                    setRecurrence(e.target.value as PromiseRecurrence)
                  }
                  className={field}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Every two weeks</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            )}

            {!isOpenEnded && (
              <div>
                <label className={label}>
                  {promiseType === "recurring" ? "Starting" : "By when?"}
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={field}
                />
              </div>
            )}

            <div>
              <label className={label}>Follow up with them?</label>
              <select
                value={followUpType}
                onChange={(e) =>
                  setFollowUpType(e.target.value as FollowUpType)
                }
                className={field}
              >
                <option value="none">No follow-up</option>
                <option value="one_time">Once, later</option>
                <option value="recurring">On a recurring basis</option>
              </select>
              {followUpType !== "none" && (
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Check in after</span>
                  <input
                    type="number"
                    min={1}
                    value={followUpDays}
                    onChange={(e) => setFollowUpDays(e.target.value)}
                    placeholder="3"
                    className="w-20 rounded-lg border border-input bg-card px-2.5 py-1.5 text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  />
                  <span>days</span>
                </div>
              )}
            </div>

            <label className="flex items-center gap-2.5 text-sm text-foreground">
              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={(e) => setReminderEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              Remind me about this
            </label>

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <button
              disabled={submitting}
              onClick={handleSubmit}
              className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {submitting ? "Keeping your word…" : "Make this promise"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
