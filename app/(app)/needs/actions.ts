"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/database";

export async function createNeed(input: {
  personId: string;
  title: string;
  description?: string;
}): Promise<ActionResult & { id?: string }> {
  const title = input.title.trim();
  if (!title) return { error: "Give this need a title." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { data, error } = await supabase
    .from("needs")
    .insert({
      user_id: user.id,
      person_id: input.personId,
      title,
      description: input.description?.trim() || null,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Couldn't create that need." };

  revalidatePath(`/people/${input.personId}`);
  return { id: data.id as string };
}

export async function updateNeed(input: {
  id: string;
  personId: string;
  title: string;
  description?: string;
}): Promise<ActionResult> {
  const title = input.title.trim();
  if (!title) return { error: "Give this need a title." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase
    .from("needs")
    .update({ title, description: input.description?.trim() || null })
    .eq("id", input.id)
    .eq("user_id", user.id);
  if (error) return { error: "Couldn't save that." };

  revalidatePath(`/people/${input.personId}`);
  revalidatePath(`/people/${input.personId}/needs/${input.id}`);
  return {};
}

export async function resolveNeed(input: {
  id: string;
  personId: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase
    .from("needs")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", input.id)
    .eq("user_id", user.id);
  if (error) return { error: "Couldn't update that." };

  revalidatePath(`/people/${input.personId}`);
  revalidatePath(`/people/${input.personId}/needs/${input.id}`);
  return {};
}

export async function archiveNeed(input: {
  id: string;
  personId: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase
    .from("needs")
    .update({ status: "archived" })
    .eq("id", input.id)
    .eq("user_id", user.id);
  if (error) return { error: "Couldn't update that." };

  revalidatePath(`/people/${input.personId}`);
  revalidatePath(`/people/${input.personId}/needs/${input.id}`);
  return {};
}

export async function reopenNeed(input: {
  id: string;
  personId: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase
    .from("needs")
    .update({ status: "active", resolved_at: null })
    .eq("id", input.id)
    .eq("user_id", user.id);
  if (error) return { error: "Couldn't update that." };

  revalidatePath(`/people/${input.personId}`);
  revalidatePath(`/people/${input.personId}/needs/${input.id}`);
  return {};
}
