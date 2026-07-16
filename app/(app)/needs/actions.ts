"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/database";

type Owner = { personId?: string; groupId?: string };

function ownerPaths(o: Owner, needId?: string): string[] {
  const paths: string[] = [];
  if (o.personId) {
    paths.push(`/people/${o.personId}`);
    if (needId) paths.push(`/people/${o.personId}/needs/${needId}`);
  }
  if (o.groupId) {
    paths.push(`/groups/${o.groupId}`);
    if (needId) paths.push(`/groups/${o.groupId}/needs/${needId}`);
  }
  return paths;
}

export async function createNeed(
  input: Owner & { title: string; description?: string },
): Promise<ActionResult & { id?: string }> {
  const title = input.title.trim();
  if (!title) return { error: "Give this need a title." };
  if (!input.personId && !input.groupId) {
    return { error: "Missing who this need is about." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { data, error } = await supabase
    .from("needs")
    .insert({
      user_id: user.id,
      person_id: input.personId ?? null,
      group_id: input.groupId ?? null,
      title,
      description: input.description?.trim() || null,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Couldn't create that need." };

  for (const p of ownerPaths(input)) revalidatePath(p);
  return { id: data.id as string };
}

export async function updateNeed(
  input: Owner & { id: string; title: string; description?: string },
): Promise<ActionResult> {
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

  for (const p of ownerPaths(input, input.id)) revalidatePath(p);
  return {};
}

export async function resolveNeed(
  input: Owner & { id: string },
): Promise<ActionResult> {
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

  for (const p of ownerPaths(input, input.id)) revalidatePath(p);
  return {};
}

export async function archiveNeed(
  input: Owner & { id: string },
): Promise<ActionResult> {
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

  for (const p of ownerPaths(input, input.id)) revalidatePath(p);
  return {};
}

export async function reopenNeed(
  input: Owner & { id: string },
): Promise<ActionResult> {
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

  for (const p of ownerPaths(input, input.id)) revalidatePath(p);
  return {};
}

/**
 * Permanently remove a need. Anything tied to it (promises, journal entries,
 * milestones) is NOT deleted — it just detaches (need_id becomes null),
 * matching the "on delete set null" foreign keys. Only the need record itself
 * is gone.
 */
export async function deleteNeed(
  input: Owner & { id: string },
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase
    .from("needs")
    .delete()
    .eq("id", input.id)
    .eq("user_id", user.id);
  if (error) return { error: "Couldn't remove that need." };

  for (const p of ownerPaths(input)) revalidatePath(p);
  return {};
}
