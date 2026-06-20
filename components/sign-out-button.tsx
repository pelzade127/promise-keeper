"use client";

import { signOut } from "@/app/login/actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="text-sm text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
      >
        Sign out
      </button>
    </form>
  );
}
