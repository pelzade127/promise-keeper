"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/database";

export async function saveReflection(content: string): Promise<ActionResult> {
  const text = content.trim();
  if (!text) return { error: "Write a few words first." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase
    .from("reflections")
    .insert({ user_id: user.id, content: text });
  if (error) return { error: "Couldn't save your reflection." };

  revalidatePath("/dashboard");
  revalidatePath("/prayer");
  return {};
}
