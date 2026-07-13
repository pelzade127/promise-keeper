"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { hashAnswer } from "@/lib/security-question";

export type AuthState = { error?: string; message?: string };

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: "That email and password didn't match. Try again." };

  const next = String(formData.get("next") ?? "").trim();
  revalidatePath("/", "layout");
  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const question1 = String(formData.get("security_question_1") ?? "").trim();
  const answer1 = String(formData.get("security_answer_1") ?? "").trim();
  const question2 = String(formData.get("security_question_2") ?? "").trim();
  const answer2 = String(formData.get("security_answer_2") ?? "").trim();

  if (password !== confirmPassword) {
    return { error: "Those passwords don't match." };
  }
  if (!question1 || !answer1 || !question2 || !answer2) {
    return { error: "Set up both security questions to continue." };
  }
  if (question1.trim().toLowerCase() === question2.trim().toLowerCase()) {
    return { error: "Make your two questions different from each other." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });

  if (error) return { error: error.message };
  if (!data.user) return { error: "Something went wrong. Please try again." };

  // The profile row already exists (created by the signup trigger) — attach
  // the security questions to it now that the account is created.
  const { error: profileError } = await supabase
    .from("user_profiles")
    .update({
      security_question_1: question1,
      security_answer_hash_1: hashAnswer(answer1),
      security_question_2: question2,
      security_answer_hash_2: hashAnswer(answer2),
    })
    .eq("id", data.user.id);
  if (profileError) {
    return {
      error:
        "Your account was created, but saving your security questions failed. Please try again from Settings.",
    };
  }

  // Email confirmation is off, so the user is signed in immediately —
  // send them straight to the dashboard (or wherever they were headed).
  const next = String(formData.get("next") ?? "").trim();
  revalidatePath("/", "layout");
  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const origin = (await headers()).get("origin") ?? "";

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/update-password`,
  });

  if (error) return { error: error.message };
  return { message: "If that email has an account, a reset link is on its way." };
}

export async function updatePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
