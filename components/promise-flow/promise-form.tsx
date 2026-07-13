"use client";

import { useState } from "react";
import type { PromiseType, PromiseRecurrence, FollowUpType } from "@/types/database";
import { type Category, type PromiseDetails, field, label } from "./types";

/**
 * The "what is the promise" form — title, category, why-it-matters, type,
 * recurrence, due date, follow-up, reminder. Owns its own field state; hands
 * the assembled details up to the parent on submit, which already knows who
 * the promise is for.
 */
export function PromiseForm({
  heading,
  categories,
  submitting,
  error,
  onSubmit,
}: {
  heading: string;
  categories: Category[];
  submitting: boolean;
  error: string | null;
  onSubmit: (details: PromiseDetails) => void;
}) {
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [why, setWhy] = useState("");
  const [promiseType, setPromiseType] = useState<PromiseType>("one_time");
  const [recurrence, setRecurrence] = useState<PromiseRecurrence>("weekly");
  const [dueDate, setDueDate] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [followUpType, setFollowUpType] = useState<FollowUpType>("none");
  const [followUpDays, setFollowUpDays] = useState("");

  const isOpenEnded = promiseType === "open_ended_care";

  function submit() {
    onSubmit({
      title,
      categoryId: categoryId || undefined,
      whyItMatters: why || undefined,
      promiseType,
      recurrence: promiseType === "recurring" ? recurrence : undefined,
      dueDate: isOpenEnded ? undefined : dueDate || undefined,
      reminderEnabled,
      followUpType,
      followUpIntervalDays:
        followUpType !== "none" && followUpDays ? Number(followUpDays) : undefined,
    });
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-foreground">{heading}</h1>

      <div className="mt-6 space-y-5">
        <div>
          <label className={label}>The promise</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Pray for the group this week"
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
                  "No deadline — just showing up.",
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
              onChange={(e) => setRecurrence(e.target.value as PromiseRecurrence)}
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
          <label className={label}>Follow up afterward?</label>
          <select
            value={followUpType}
            onChange={(e) => setFollowUpType(e.target.value as FollowUpType)}
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
          onClick={submit}
          className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          {submitting ? "Keeping your word…" : "Make this promise"}
        </button>
      </div>
    </div>
  );
}
