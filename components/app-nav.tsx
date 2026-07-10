import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";

export async function AppNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let faithMode = false;
  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("faith_mode")
      .eq("id", user.id)
      .maybeSingle();
    faithMode = Boolean(profile?.faith_mode);
  }

  return (
    <nav className="mb-10 flex items-center justify-between gap-4">
      <Link
        href="/dashboard"
        className="font-display text-sm uppercase tracking-[0.2em] text-primary"
      >
        Promise Keeper
      </Link>
      <div className="flex items-center gap-5 text-sm">
        <Link
          href="/people"
          className="text-muted-foreground transition hover:text-foreground"
        >
          People
        </Link>
        <Link
          href="/groups"
          className="text-muted-foreground transition hover:text-foreground"
        >
          Groups
        </Link>
        {faithMode && (
          <Link
            href="/prayer"
            className="text-muted-foreground transition hover:text-foreground"
          >
            Prayer
          </Link>
        )}
        <Link
          href="/journey"
          className="text-muted-foreground transition hover:text-foreground"
        >
          Journey
        </Link>
        <Link
          href="/partners"
          className="text-muted-foreground transition hover:text-foreground"
        >
          Partners
        </Link>
        <Link
          href="/settings"
          className="text-muted-foreground transition hover:text-foreground"
        >
          Settings
        </Link>
        <Link
          href="/promises/new"
          className="rounded-lg bg-primary px-3.5 py-2 font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          + Make a promise
        </Link>
        <SignOutButton />
      </div>
    </nav>
  );
}
