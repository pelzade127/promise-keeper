"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAnswer } from "@/lib/security-question";

type Result = { error?: string; message?: string };

/** Look up both security questions for an email, without revealing anything else. */
export async function getSecurityQuestions(
  email: string,
): Promise<Result & { question1?: string; question2?: string }> {
  const clean = email.trim().toLowerCase();
  if (!clean) return { error: "Enter your email." };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error:
        "Password reset isn't set up yet. Ask whoever manages this app to configure it.",
    };
  }

  const { data: profile } = await admin
    .from("user_profiles")
    .select("security_question_1, security_question_2")
    .ilike("email", clean)
    .maybeSingle();

  if (!profile?.security_question_1 || !profile?.security_question_2) {
    // Deliberately vague — don't reveal whether the account exists.
    return {
      error:
        "No security questions are set up for that email. Ask whoever manages this app for help.",
    };
  }

  return {
    question1: profile.security_question_1 as string,
    question2: profile.security_question_2 as string,
  };
}

/** Verify both answers and, if correct, set a new password directly. */
export async function resetPasswordWithSecurityAnswers(input: {
  email: string;
  answer1: string;
  answer2: string;
  newPassword: string;
}): Promise<Result> {
  const email = input.email.trim().toLowerCase();
  if (!input.answer1.trim() || !input.answer2.trim()) {
    return { error: "Answer both questions." };
  }
  if (input.newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "Password reset isn't set up yet." };
  }

  const { data: profile } = await admin
    .from("user_profiles")
    .select("id, security_answer_hash_1, security_answer_hash_2")
    .ilike("email", email)
    .maybeSingle();

  if (!profile?.security_answer_hash_1 || !profile?.security_answer_hash_2) {
    return { error: "That didn't match. Please try again." };
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

  const { error } = await admin.auth.admin.updateUserById(
    profile.id as string,
    { password: input.newPassword },
  );
  if (error) return { error: "Couldn't update your password. Try again." };

  return { message: "Your password has been reset. You can sign in now." };
}
