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
