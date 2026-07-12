"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAnswer } from "@/lib/security-question";

type Result = { error?: string; message?: string };

/** Look up the security question for an email, without revealing anything else. */
export async function getSecurityQuestion(
  email: string,
): Promise<Result & { question?: string }> {
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
    .select("security_question")
    .ilike("email", clean)
    .maybeSingle();

  if (!profile?.security_question) {
    // Deliberately vague — don't reveal whether the account exists.
    return {
      error:
        "No security question is set up for that email. Ask whoever manages this app for help.",
    };
  }

  return { question: profile.security_question as string };
}

/** Verify the answer and, if correct, set a new password directly. */
export async function resetPasswordWithSecurityAnswer(input: {
  email: string;
  answer: string;
  newPassword: string;
}): Promise<Result> {
  const email = input.email.trim().toLowerCase();
  if (!input.answer.trim()) return { error: "Enter your answer." };
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
    .select("id, security_answer_hash")
    .ilike("email", email)
    .maybeSingle();

  if (!profile?.security_answer_hash) {
    return { error: "That didn't match. Please try again." };
  }

  const correct = verifyAnswer(
    input.answer,
    profile.security_answer_hash as string,
  );
  if (!correct) {
    return { error: "That answer doesn't match. Please try again." };
  }

  const { error } = await admin.auth.admin.updateUserById(
    profile.id as string,
    { password: input.newPassword },
  );
  if (error) return { error: "Couldn't update your password. Try again." };

  return { message: "Your password has been reset. You can sign in now." };
}
