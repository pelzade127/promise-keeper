"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePromise } from "@/app/(app)/promises/actions";
import type {
  PromiseType,
  PromiseRecurrence,
  FollowUpType,
} from "@/types/database";

type Category = { id: string; name: string; color: string | null };

const field =
  "w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30";
const label = "block text-sm font-medium text-foreground mb-1.5";

export function EditPromiseForm({
  promise,
  categories,
  who,
  redirectTo,
}: {
  promise: {
    id: string;
    title: string;
    why_it_matters: string | null;
    category_id: string | null;
    promise_type: PromiseType;
    recurrence: PromiseRecurrence;
    due_date: string | null;
    reminder_enabled: boolean;
    follow_up_type: FollowUpType;
    follow_up_interval_days: number | null;
  };
  categories: Category[];
  who: string;
  redirectTo: string;
}) {
  const router = useRouter();

  const [title, setTitle] = useState(promise.title);
  const [categoryId, setCategoryId] = useState(promise.category_id ?? "");
  const [why, setWhy] = useState(promise.why_it_matters ?? "");
  const [promiseType, setPromiseType] = useState<PromiseType>(
    promise.promise_type,
  );
  const [recurrence, setRecurrence] = useState<PromiseRecurrence>(
    promise.recurrence === "none" ? "weekly" : promise.recurrence,
  );
  const [dueDate, setDueDate] = useState(promise.due_date ?? "");
  const [reminderEnabled, setReminderEnabled] = useState(
    promise.reminder_enabled,
  );
  const [followUpType, setFollowUpType] = useState<FollowUpType>(
    promise.follow_up_type,
  );
  const [followUpDays, setFollowUpDays] = useState(
    promise.follow_up_interval_days ? String(promise.follow_up_interval_days) : "",
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOpenEnded = promiseType === "open_ended_care";

  async function save() {
    setError(null);
    if (!title.trim()) {
      setError("Give the promise a title.");
      return;
    }
    setSaving(true);
    const res = await updatePromise({
      promiseId: promise.id,
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
    });
    if (res?.error) {
      setError(res.error);
      setSaving(false);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-lg animate-fade-up">
      <button
        onClick={() => router.push(redirectTo)}
        className="mb-6 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        ← Cancel
      </button>

      <h1 className="font-display text-3xl text-foreground">
        Edit your promise to {who}
      </h1>

      <div className="mt-6 space-y-5">
        <div>
          <label className={label}>The promise</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
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
                ["open_ended_care", "Ongoing care", "No deadline — just showing up."],
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
                <span className="block text-sm text-muted-foreground">{desc}</span>
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
              {promiseType === "recurring" ? "Next due" : "By when?"}
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
          disabled={saving}
          onClick={save}
          className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
