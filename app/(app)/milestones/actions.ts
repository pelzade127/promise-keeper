"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, MilestoneType } from "@/types/database";

export async function createMilestone(input: {
  personId?: string;
  groupId?: string;
  promiseId?: string;
  milestoneType: MilestoneType;
  title: string;
  note?: string;
  occurredOn?: string;
}): Promise<ActionResult> {
  const title = input.title.trim();
  if (!title) return { error: "Give this moment a title." };
  if (!input.personId && !input.groupId) {
    return { error: "Missing who this milestone is about." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase.from("milestones").insert({
    user_id: user.id,
    person_id: input.personId ?? null,
    group_id: input.groupId ?? null,
    promise_id: input.promiseId ?? null,
    milestone_type: input.milestoneType,
    title,
    note: input.note?.trim() || null,
    occurred_on: input.occurredOn || new Date().toISOString().slice(0, 10),
  });
  if (error) return { error: "Couldn't save that milestone." };

  if (input.personId) revalidatePath(`/people/${input.personId}`);
  if (input.groupId) revalidatePath(`/groups/${input.groupId}`);
  revalidatePath("/journey");
  return {};
}

export async function deleteMilestone(input: {
  id: string;
  personId?: string;
  groupId?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase
    .from("milestones")
    .delete()
    .eq("id", input.id)
    .eq("user_id", user.id);
  if (error) return { error: "Couldn't remove that." };

  if (input.personId) revalidatePath(`/people/${input.personId}`);
  if (input.groupId) revalidatePath(`/groups/${input.groupId}`);
  revalidatePath("/journey");
  return {};
}
