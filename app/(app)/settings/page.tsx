import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { FaithModeToggle } from "@/components/faith-mode-toggle";
import { SecurityQuestionForm } from "@/components/security-question-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("faith_mode, security_question")
    .eq("id", user.id)
    .maybeSingle();

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
        <SecurityQuestionForm
          hasQuestion={Boolean(profile?.security_question)}
          currentQuestion={(profile?.security_question as string | null) ?? null}
        />
      </div>
    </div>
  );
}
