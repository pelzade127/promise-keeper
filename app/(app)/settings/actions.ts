"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/database";

export async function setFaithMode(enabled: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase
    .from("user_profiles")
    .upsert({ id: user.id, faith_mode: enabled }, { onConflict: "id" });
  if (error) return { error: "Couldn't update your settings." };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return {};
}
