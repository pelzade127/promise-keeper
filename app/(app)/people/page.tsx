import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { AddPersonForm, ArchiveButton, RestoreButton } from "@/components/people-ui";

export const dynamic = "force-dynamic";

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  const { show } = await searchParams;
  const archived = show === "archived";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: people }, { data: promises }] = await Promise.all([
    supabase
      .from("people")
      .select("id, name, relationship_note")
      .eq("status", archived ? "archived" : "active")
      .order("name", { ascending: true }),
    supabase.from("promises").select("person_id").eq("status", "active"),
  ]);

  const counts = new Map<string, number>();
  for (const p of promises ?? []) {
    if (p.person_id) counts.set(p.person_id, (counts.get(p.person_id) ?? 0) + 1);
  }

  const list = people ?? [];

  return (
    <div className="container py-10 sm:py-14">
      <AppNav />

      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-foreground">
            {archived ? "Archived people" : "Your people"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {archived
              ? "Folks you've set aside. You can restore anyone."
              : "The folks you've committed to remember."}
          </p>
        </div>
        <Link
          href={archived ? "/people" : "/people?show=archived"}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {archived ? "← Back to active" : "View archived"}
        </Link>
      </header>

      <div className="grid gap-8 md:grid-cols-[1fr_320px]">
        <div className="space-y-2.5">
          {list.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-card/60 p-8 text-center text-muted-foreground">
              {archived ? (
                "No archived people."
              ) : (
                <>
                  No one here yet. Add someone, or just{" "}
                  <Link
                    href="/promises/new"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    make a promise
                  </Link>{" "}
                  — they'll be added along the way.
                </>
              )}
            </p>
          ) : (
            list.map((person) => {
              const count = counts.get(person.id) ?? 0;
              return (
                <div
                  key={person.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card px-5 py-4"
                >
                  <div>
                    <Link
                      href={`/people/${person.id}`}
                      className="font-display text-lg text-foreground underline-offset-4 hover:text-primary hover:underline"
                    >
                      {person.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {person.relationship_note
                        ? `${person.relationship_note} · `
                        : ""}
                      {count === 0
                        ? "No active promises"
                        : `${count} active promise${count === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {archived ? (
                      <RestoreButton personId={person.id} />
                    ) : (
                      <>
                        <Link
                          href={`/promises/new?person=${person.id}`}
                          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                        >
                          Make a promise
                        </Link>
                        <ArchiveButton personId={person.id} />
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {!archived && <AddPersonForm />}
      </div>
    </div>
  );
}
