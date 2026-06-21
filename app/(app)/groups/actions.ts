"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/database";

export async function createGroup(formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name) return { error: "Please name the group." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase.from("groups").insert({
    user_id: user.id,
    name,
    description: description || null,
  });
  if (error) return { error: "Couldn't create that group. Please try again." };

  revalidatePath("/groups");
  return {};
}

export async function archiveGroup(groupId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase
    .from("groups")
    .update({ status: "archived" })
    .eq("id", groupId);
  if (error) return { error: "Couldn't archive that group." };

  revalidatePath("/groups");
  return {};
}

export async function addGroupMember(input: {
  groupId: string;
  personId: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase.from("group_members").insert({
    user_id: user.id,
    group_id: input.groupId,
    person_id: input.personId,
  });
  // Ignore duplicate-membership errors (unique constraint) — already a member.
  if (error && !`${error.message}`.toLowerCase().includes("duplicate")) {
    return { error: "Couldn't add that person to the group." };
  }

  revalidatePath(`/groups/${input.groupId}`);
  return {};
}

export async function removeGroupMember(input: {
  groupId: string;
  memberId: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("id", input.memberId);
  if (error) return { error: "Couldn't remove that member." };

  revalidatePath(`/groups/${input.groupId}`);
  return {};
}
