import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

export function AppNav() {
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
