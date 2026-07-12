"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hashAnswer } from "@/lib/security-question";
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

export async function setSecurityQuestion(input: {
  question: string;
  answer: string;
}): Promise<ActionResult> {
  const question = input.question.trim();
  const answer = input.answer.trim();
  if (!question) return { error: "Enter a question." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const update: Record<string, unknown> = { id: user.id, security_question: question };

  if (answer) {
    update.security_answer_hash = hashAnswer(answer);
  } else {
    // No new answer given — keep the existing one, if any.
    const { data: existing } = await supabase
      .from("user_profiles")
      .select("security_answer_hash")
      .eq("id", user.id)
      .maybeSingle();
    if (!existing?.security_answer_hash) {
      return { error: "Enter an answer." };
    }
  }

  const { error } = await supabase
    .from("user_profiles")
    .upsert(update, { onConflict: "id" });
  if (error) return { error: "Couldn't save that." };

  revalidatePath("/settings");
  return {};
}
