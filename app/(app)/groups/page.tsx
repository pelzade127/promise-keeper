import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { AddGroupForm, ArchiveGroupButton } from "@/components/groups-ui";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: groups }, { data: members }, { data: promises }] =
    await Promise.all([
      supabase
        .from("groups")
        .select("id, name, description")
        .eq("status", "active")
        .order("name", { ascending: true }),
      supabase.from("group_members").select("group_id"),
      supabase.from("promises").select("group_id").eq("status", "active"),
    ]);

  const memberCounts = new Map<string, number>();
  for (const m of members ?? []) {
    if (m.group_id)
      memberCounts.set(m.group_id, (memberCounts.get(m.group_id) ?? 0) + 1);
  }
  const promiseCounts = new Map<string, number>();
  for (const p of promises ?? []) {
    if (p.group_id)
      promiseCounts.set(p.group_id, (promiseCounts.get(p.group_id) ?? 0) + 1);
  }

  const list = groups ?? [];

  return (
    <div className="container py-10 sm:py-14">
      <AppNav />

      <header className="mb-8">
        <h1 className="font-display text-4xl text-foreground">Your groups</h1>
        <p className="mt-2 text-muted-foreground">
          Families, small groups, teams — the circles you show up for.
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-[1fr_320px]">
        <div className="space-y-2.5">
          {list.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-card/60 p-8 text-center text-muted-foreground">
              No groups yet. Create one to make promises to a whole circle of
              people at once.
            </p>
          ) : (
            list.map((group) => {
              const mc = memberCounts.get(group.id) ?? 0;
              const pc = promiseCounts.get(group.id) ?? 0;
              return (
                <div
                  key={group.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card px-5 py-4"
                >
                  <div>
                    <Link
                      href={`/groups/${group.id}`}
                      className="font-display text-lg text-foreground underline-offset-4 hover:text-primary hover:underline"
                    >
                      {group.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {mc} member{mc === 1 ? "" : "s"} ·{" "}
                      {pc === 0
                        ? "no active promises"
                        : `${pc} active promise${pc === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/promises/new?group=${group.id}`}
                      className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                    >
                      Make a promise
                    </Link>
                    <ArchiveGroupButton groupId={group.id} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <AddGroupForm />
      </div>
    </div>
  );
}
