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
