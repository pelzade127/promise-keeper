"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hashAnswer, verifyAnswer } from "@/lib/security-question";
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

export async function setSecurityQuestions(input: {
  question1: string;
  answer1: string;
  question2: string;
  answer2: string;
}): Promise<ActionResult> {
  const question1 = input.question1.trim();
  const question2 = input.question2.trim();
  const answer1 = input.answer1.trim();
  const answer2 = input.answer2.trim();
  if (!question1 || !question2) return { error: "Enter both questions." };
  if (
    question1.toLowerCase() === question2.toLowerCase() &&
    question1.length > 0
  ) {
    return { error: "Make your two questions different from each other." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const update: Record<string, unknown> = {
    id: user.id,
    security_question_1: question1,
    security_question_2: question2,
  };

  const { data: existing } = await supabase
    .from("user_profiles")
    .select("security_answer_hash_1, security_answer_hash_2")
    .eq("id", user.id)
    .maybeSingle();

  if (answer1) {
    update.security_answer_hash_1 = hashAnswer(answer1);
  } else if (!existing?.security_answer_hash_1) {
    return { error: "Enter an answer for question 1." };
  }

  if (answer2) {
    update.security_answer_hash_2 = hashAnswer(answer2);
  } else if (!existing?.security_answer_hash_2) {
    return { error: "Enter an answer for question 2." };
  }

  const { error } = await supabase
    .from("user_profiles")
    .upsert(update, { onConflict: "id" });
  if (error) return { error: "Couldn't save that." };

  revalidatePath("/settings");
  return {};
}

/**
 * Change password while logged in, using the two security questions instead
 * of the current password. Works for the currently authenticated user only.
 */
export async function changePasswordWithAnswers(input: {
  answer1: string;
  answer2: string;
  newPassword: string;
}): Promise<ActionResult> {
  if (input.newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("security_answer_hash_1, security_answer_hash_2")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.security_answer_hash_1 || !profile?.security_answer_hash_2) {
    return {
      error: "Set up both security questions first before using this.",
    };
  }

  const correct1 = verifyAnswer(
    input.answer1,
    profile.security_answer_hash_1 as string,
  );
  const correct2 = verifyAnswer(
    input.answer2,
    profile.security_answer_hash_2 as string,
  );
  if (!correct1 || !correct2) {
    return { error: "Those answers don't match. Please try again." };
  }

  const { error } = await supabase.auth.updateUser({
    password: input.newPassword,
  });
  if (error) return { error: "Couldn't update your password. Try again." };

  return {};
}
