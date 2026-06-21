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
