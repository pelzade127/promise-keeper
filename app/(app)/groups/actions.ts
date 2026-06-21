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

export async function updateGroup(input: {
  groupId: string;
  name: string;
  description?: string;
}): Promise<ActionResult> {
  const name = input.name.trim();
  if (!name) return { error: "Name can't be empty." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase
    .from("groups")
    .update({ name, description: input.description?.trim() || null })
    .eq("id", input.groupId);
  if (error) return { error: "Couldn't save those changes." };

  revalidatePath(`/groups/${input.groupId}`);
  revalidatePath("/groups");
  return {};
}

export async function restoreGroup(groupId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase
    .from("groups")
    .update({ status: "active" })
    .eq("id", groupId);
  if (error) return { error: "Couldn't restore that group." };

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

export async function addNewMemberToGroup(input: {
  groupId: string;
  name: string;
}): Promise<ActionResult> {
  const name = input.name.trim();
  if (!name) return { error: "Please enter a name." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  // Create the person first, then link them to the group.
  const { data: person, error: personErr } = await supabase
    .from("people")
    .insert({ user_id: user.id, name })
    .select("id")
    .single();
  if (personErr || !person) {
    return { error: "Couldn't add that person. Please try again." };
  }

  const { error: memberErr } = await supabase.from("group_members").insert({
    user_id: user.id,
    group_id: input.groupId,
    person_id: person.id,
  });
  if (memberErr) {
    return { error: "Added them to People, but couldn't add to the group." };
  }

  revalidatePath(`/groups/${input.groupId}`);
  revalidatePath("/people");
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
