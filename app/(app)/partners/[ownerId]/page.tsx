import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";

export const dynamic = "force-dynamic";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function whoLabel(targetType: string): string {
  if (targetType === "self") return "Themselves";
  if (targetType === "group") return "A group";
  return "Someone";
}

export default async function PartnerViewPage({
  params,
}: {
  params: Promise<{ ownerId: string }>;
}) {
  const { ownerId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // display_name is readable only if an accepted partnership exists (RLS).
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("id", ownerId)
    .maybeSingle();

  // RLS returns only the promises this partnership is allowed to see.
  const { data: promises } = await supabase
    .from("promises")
    .select("id, title, target_type, promise_type, status, due_date")
    .eq("user_id", ownerId)
    .order("due_date", { ascending: true });

  const rows = (promises ?? []) as Record<string, unknown>[];
  const active = rows.filter((p) => p.status === "active");
  const today = todayISO();
  const overdue = active.filter(
    (p) => p.due_date && (p.due_date as string) < today,
  );
  const upcoming = active.filter(
    (p) => !p.due_date || (p.due_date as string) >= today,
  );

  const name = (profile?.display_name as string | undefined) ?? "Someone";

  const Card = ({ p }: { p: Record<string, unknown> }) => (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <p className="text-foreground">{p.title as string}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {whoLabel(p.target_type as string)}
        {p.due_date ? ` · due ${p.due_date as string}` : ""}
      </p>
    </div>
  );

  return (
    <div className="container py-10 sm:py-14">
      <AppNav />

      <Link
        href="/partners"
        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        ← Accountability
      </Link>

      <header className="mt-4 mb-8">
        <h1 className="font-display text-4xl text-foreground">{name}</h1>
        <p className="mt-2 text-muted-foreground">
          You're here to encourage, not to police. A little "how's it going?"
          goes a long way.
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-card/60 p-8 text-center text-muted-foreground">
          Nothing to show right now — either they're all caught up, or their
          settings keep this view quiet.
        </p>
      ) : (
        <div className="space-y-8">
          {overdue.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-destructive">
                Could use a nudge
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {overdue.map((p) => (
                  <Card key={p.id as string} p={p} />
                ))}
              </div>
            </section>
          )}

          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                In progress
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {upcoming.map((p) => (
                  <Card key={p.id as string} p={p} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
