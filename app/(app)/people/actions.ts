"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/database";

export async function createPerson(formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const note = String(formData.get("relationship_note") ?? "").trim();

  if (!name) return { error: "Please enter a name." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase.from("people").insert({
    user_id: user.id,
    name,
    relationship_note: note || null,
  });

  if (error) return { error: "Couldn't add that person. Please try again." };

  revalidatePath("/people");
  return {};
}

export async function setRelationshipStatus(input: {
  personId: string;
  status: "active" | "dormant" | "reconnected" | "past";
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase
    .from("people")
    .update({ relationship_status: input.status })
    .eq("id", input.personId);
  if (error) return { error: "Couldn't update that." };

  revalidatePath(`/people/${input.personId}`);
  return {};
}

export async function updatePerson(input: {
  personId: string;
  name: string;
  relationshipNote?: string;
}): Promise<ActionResult> {
  const name = input.name.trim();
  if (!name) return { error: "Name can't be empty." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase
    .from("people")
    .update({
      name,
      relationship_note: input.relationshipNote?.trim() || null,
    })
    .eq("id", input.personId);
  if (error) return { error: "Couldn't save those changes." };

  revalidatePath(`/people/${input.personId}`);
  revalidatePath("/people");
  return {};
}

export async function restorePerson(personId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase
    .from("people")
    .update({ status: "active" })
    .eq("id", personId);
  if (error) return { error: "Couldn't restore that person." };

  revalidatePath("/people");
  return {};
}

export async function archivePerson(personId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase
    .from("people")
    .update({ status: "archived" })
    .eq("id", personId);

  if (error) return { error: "Couldn't archive that person." };

  revalidatePath("/people");
  return {};
}

/** Add a journal entry to a person's or group's story. */
/**
 * Log a quick act of care — Called, Visited, Delivered a meal, etc. Distinct
 * from addJournalEntry: no writing required, and can optionally tie back to
 * a specific promise ("this was one of the weekly prayers for Sarah").
 */
export async function logCareAction(input: {
  personId?: string;
  groupId?: string;
  promiseId?: string;
  entryType: string;
  note?: string;
  label: string;
}): Promise<ActionResult> {
  if (!input.personId && !input.groupId) {
    return { error: "Missing who this is about." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase.from("journal_entries").insert({
    user_id: user.id,
    person_id: input.personId ?? null,
    group_id: input.groupId ?? null,
    promise_id: input.promiseId ?? null,
    entry_type: input.entryType,
    // Content can't be empty — fall back to the action's own name so the
    // timeline still reads sensibly with no extra note.
    content: input.note?.trim() || input.label,
  });
  if (error) return { error: "Couldn't log that. Please try again." };

  if (input.personId) revalidatePath(`/people/${input.personId}`);
  if (input.groupId) revalidatePath(`/groups/${input.groupId}`);
  return {};
}

export async function addJournalEntry(input: {
  personId?: string;
  groupId?: string;
  entryType: string;
  content: string;
}): Promise<ActionResult> {
  const content = input.content.trim();
  if (!content) return { error: "Write something first." };
  if (!input.personId && !input.groupId) {
    return { error: "Missing who this is about." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase.from("journal_entries").insert({
    user_id: user.id,
    person_id: input.personId ?? null,
    group_id: input.groupId ?? null,
    entry_type: input.entryType,
    content,
  });

  if (error) return { error: "Couldn't save that entry. Please try again." };

  if (input.groupId) revalidatePath(`/groups/${input.groupId}`);
  if (input.personId) revalidatePath(`/people/${input.personId}`);
  return {};
}
