import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { FaithModeToggle } from "@/components/faith-mode-toggle";
import { SecurityQuestionForm } from "@/components/security-question-form";
import { ChangePasswordForm } from "@/components/change-password-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("faith_mode, security_question_1, security_question_2")
    .eq("id", user.id)
    .maybeSingle();

  const q1 = (profile?.security_question_1 as string | null) ?? null;
  const q2 = (profile?.security_question_2 as string | null) ?? null;

  return (
    <div className="container py-10 sm:py-14">
      <AppNav />

      <header className="mb-8">
        <h1 className="font-display text-4xl text-foreground">Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Shape how Promise Keeper feels.
        </p>
      </header>

      <div className="max-w-2xl space-y-4">
        <FaithModeToggle initial={Boolean(profile?.faith_mode)} />
        <SecurityQuestionForm currentQuestion1={q1} currentQuestion2={q2} />
        <ChangePasswordForm question1={q1} question2={q2} />
      </div>
    </div>
  );
}
