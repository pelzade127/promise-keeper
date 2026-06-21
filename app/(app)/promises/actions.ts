"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, CreatePromiseInput } from "@/types/database";

/** Add `days` to a YYYY-MM-DD string (or to today) and return YYYY-MM-DD. */
function addDays(base: string | undefined, days: number): string {
  const start = base ? new Date(base + "T00:00:00") : new Date();
  start.setDate(start.getDate() + days);
  return start.toISOString().slice(0, 10);
}

export async function createPromise(
  input: CreatePromiseInput,
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  if (!input.title.trim()) return { error: "Give the promise a title." };

  // 1. Resolve the person — create one if this is someone new.
  let personId = input.personId ?? null;

  if (!personId && input.newPersonName?.trim()) {
    const { data: person, error: personError } = await supabase
      .from("people")
      .insert({ user_id: user.id, name: input.newPersonName.trim() })
      .select("id")
      .single();

    if (personError || !person) {
      return { error: "Couldn't add that person. Please try again." };
    }
    personId = person.id;
  }

  if (!personId) return { error: "Choose who this promise is for." };

  // 2. Work out the follow-up date, if any.
  const isOpenEnded = input.promiseType === "open_ended_care";
  const followUpDate =
    input.followUpType !== "none" && input.followUpIntervalDays
      ? addDays(input.dueDate, input.followUpIntervalDays)
      : null;

  // 3. Create the promise. (The DB trigger logs the 'created' timeline event.)
  const { error: promiseError } = await supabase.from("promises").insert({
    user_id: user.id,
    title: input.title.trim(),
    why_it_matters: input.whyItMatters?.trim() || null,
    category_id: input.categoryId || null,
    target_type: "person",
    person_id: personId,
    promise_type: input.promiseType,
    status: "active",
    recurrence:
      input.promiseType === "recurring"
        ? (input.recurrence ?? "weekly")
        : "none",
    recurrence_interval_days: input.recurrenceIntervalDays || null,
    due_date: isOpenEnded ? null : input.dueDate || null,
    next_due_date: isOpenEnded ? null : input.dueDate || null,
    reminder_enabled: input.reminderEnabled,
    follow_up_type: input.followUpType,
    follow_up_interval_days: input.followUpIntervalDays || null,
    next_follow_up_date: followUpDate,
  });

  if (promiseError) {
    return { error: "Couldn't save the promise. Please try again." };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

// ---------------------------------------------------------------------------
// Phase 3 — keeping (and re-deciding) promises
// ---------------------------------------------------------------------------

/** Days for a recurrence cadence (monthly approximated at 30). */
function recurrenceDays(
  recurrence: string,
  custom: number | null,
): number | null {
  switch (recurrence) {
    case "daily":
      return 1;
    case "weekly":
      return 7;
    case "biweekly":
      return 14;
    case "monthly":
      return 30;
    case "custom":
      return custom ?? null;
    default:
      return null;
  }
}

/**
 * Mark a promise kept. One-time promises become 'completed'; recurring and
 * open-ended-care promises stay active and roll forward to their next date.
 * Always logs a 'completed' timeline event (with the optional reflection).
 */
export async function completePromise(input: {
  promiseId: string;
  reflection?: string;
  scheduleFollowUp?: boolean;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { data: promise } = await supabase
    .from("promises")
    .select("*")
    .eq("id", input.promiseId)
    .single();
  if (!promise) return { error: "Couldn't find that promise." };

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {};

  if (promise.promise_type === "one_time") {
    updates.status = "completed";
    updates.completed_at = now;
  } else {
    const interval = recurrenceDays(
      promise.recurrence,
      promise.recurrence_interval_days,
    );
    if (interval) {
      const next = addDays(promise.due_date ?? undefined, interval);
      updates.due_date = next;
      updates.next_due_date = next;
    }
  }

  if (input.scheduleFollowUp) {
    updates.next_follow_up_date = addDays(
      undefined,
      promise.follow_up_interval_days || 7,
    );
  }

  const { error: upErr } = await supabase
    .from("promises")
    .update(updates)
    .eq("id", promise.id);
  if (upErr) return { error: "Couldn't update the promise." };

  await supabase.from("promise_events").insert({
    user_id: user.id,
    promise_id: promise.id,
    person_id: promise.person_id,
    group_id: promise.group_id,
    event_type: "completed",
    note: promise.title,
    reflection: input.reflection?.trim() || null,
  });

  revalidatePath("/dashboard");
  return {};
}

/** Move a promise's due date forward and log a 'recommitted' event. */
export async function recommitPromise(
  promiseId: string,
  newDueDate: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { data: promise } = await supabase
    .from("promises")
    .select("id, title, person_id, group_id")
    .eq("id", promiseId)
    .single();
  if (!promise) return { error: "Couldn't find that promise." };

  const { error } = await supabase
    .from("promises")
    .update({ due_date: newDueDate, next_due_date: newDueDate, status: "active" })
    .eq("id", promiseId);
  if (error) return { error: "Couldn't recommit." };

  await supabase.from("promise_events").insert({
    user_id: user.id,
    promise_id: promiseId,
    person_id: promise.person_id,
    group_id: promise.group_id,
    event_type: "recommitted",
    note: promise.title,
  });

  revalidatePath("/dashboard");
  return {};
}

/** Release a promise (gently). Optionally records why, never as a judgement. */
export async function releasePromise(
  promiseId: string,
  reason?: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { data: promise } = await supabase
    .from("promises")
    .select("id, title, person_id, group_id")
    .eq("id", promiseId)
    .single();
  if (!promise) return { error: "Couldn't find that promise." };

  const { error } = await supabase
    .from("promises")
    .update({ status: "released", released_at: new Date().toISOString() })
    .eq("id", promiseId);
  if (error) return { error: "Couldn't release that promise." };

  await supabase.from("promise_events").insert({
    user_id: user.id,
    promise_id: promiseId,
    person_id: promise.person_id,
    group_id: promise.group_id,
    event_type: "released",
    note: promise.title,
    missed_reason: reason || null,
  });

  revalidatePath("/dashboard");
  return {};
}

/** Record a follow-up check-in; reschedule it if the follow-up is recurring. */
export async function completeFollowUp(
  promiseId: string,
  note?: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { data: promise } = await supabase
    .from("promises")
    .select("id, title, person_id, group_id, follow_up_type, follow_up_interval_days")
    .eq("id", promiseId)
    .single();
  if (!promise) return { error: "Couldn't find that promise." };

  const nextFollowUp =
    promise.follow_up_type === "recurring" && promise.follow_up_interval_days
      ? addDays(undefined, promise.follow_up_interval_days)
      : null;

  const { error } = await supabase
    .from("promises")
    .update({ next_follow_up_date: nextFollowUp })
    .eq("id", promiseId);
  if (error) return { error: "Couldn't record the check-in." };

  await supabase.from("promise_events").insert({
    user_id: user.id,
    promise_id: promiseId,
    person_id: promise.person_id,
    group_id: promise.group_id,
    event_type: "follow_up_completed",
    note: promise.title,
    reflection: note?.trim() || null,
  });

  revalidatePath("/dashboard");
  return {};
}
