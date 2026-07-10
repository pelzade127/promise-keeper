import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { PrayThrough } from "@/components/pray-through";

export const dynamic = "force-dynamic";

type Rel = { name?: string } | { name?: string }[] | null | undefined;

function nameOf(rel: Rel): string | null {
  const r = Array.isArray(rel) ? rel[0] : rel;
  return r?.name ?? null;
}

function whoOf(row: {
  target_type: string;
  person?: Rel;
  group?: Rel;
}): string {
  if (row.target_type === "self") return "Yourself";
  if (row.target_type === "group") return nameOf(row.group) ?? "A group";
  return nameOf(row.person) ?? "Someone";
}

function formatDate(at: string): string {
  return new Date(at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function PrayerPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("faith_mode")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.faith_mode) redirect("/settings");

  // The Prayer category (seeded by default).
  const { data: prayerCat } = await supabase
    .from("categories")
    .select("id")
    .eq("name", "Prayer")
    .maybeSingle();
  const prayerCatId = prayerCat?.id ?? null;

  const promiseSelect =
    "id, title, why_it_matters, target_type, person:people ( name ), group:groups ( name )";

  const [
    { data: openPrayers },
    { data: answered },
    { data: prayerNotes },
    { data: reflections },
  ] = await Promise.all([
    prayerCatId
      ? supabase
          .from("promises")
          .select(promiseSelect)
          .eq("category_id", prayerCatId)
          .eq("status", "active")
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as unknown[] }),
    supabase
      .from("promises")
      .select(
        "id, title, answer_note, answered_at, target_type, person:people ( name ), group:groups ( name )",
      )
      .not("answered_at", "is", null)
      .order("answered_at", { ascending: false }),
    supabase
      .from("journal_entries")
      .select(
        "id, content, created_at, person:people ( name ), group:groups ( name )",
      )
      .eq("entry_type", "prayer")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("reflections")
      .select("id, content, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const prayerItems = ((openPrayers ?? []) as Record<string, unknown>[]).map(
    (p) => ({
      id: p.id as string,
      title: p.title as string,
      who: whoOf(p as never),
      why: (p.why_it_matters as string | null) ?? null,
    }),
  );

  const answeredList = (answered ?? []) as Record<string, unknown>[];
  const notesList = (prayerNotes ?? []) as Record<string, unknown>[];
  const reflectionList = (reflections ?? []) as Record<string, unknown>[];

  return (
    <div className="container py-10 sm:py-14">
      <AppNav />

      <header className="mb-8">
        <h1 className="font-display text-4xl text-foreground">Prayer</h1>
        <p className="mt-2 text-muted-foreground">
          A quiet place to carry the people on your heart.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-10">
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Pray through
            </h2>
            <PrayThrough items={prayerItems} />
          </section>

          {answeredList.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Answered prayers
              </h2>
              <div className="space-y-2">
                {answeredList.map((a) => (
                  <div
                    key={a.id as string}
                    className="rounded-lg border border-accent/30 bg-accent/5 px-5 py-4"
                  >
                    <p className="font-medium text-foreground">
                      {whoOf(a as never)} · {a.title as string}
                    </p>
                    {(a.answer_note as string | null) && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {a.answer_note as string}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      Answered {formatDate(a.answered_at as string)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {notesList.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Prayer notes
              </h2>
              <div className="space-y-2">
                {notesList.map((n) => (
                  <div
                    key={n.id as string}
                    className="rounded-lg border border-border bg-card px-5 py-4"
                  >
                    <p className="text-foreground">{n.content as string}</p>
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      {nameOf(n.person as Rel) ??
                        nameOf(n.group as Rel) ??
                        "General"}{" "}
                      · {formatDate(n.created_at as string)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recent reflections
          </h2>
          {reflectionList.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
              Your weekly reflections will gather here.
            </p>
          ) : (
            <div className="space-y-2">
              {reflectionList.map((r) => (
                <div
                  key={r.id as string}
                  className="rounded-lg border border-border bg-card px-4 py-3"
                >
                  <p className="text-sm text-foreground">{r.content as string}</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    {formatDate(r.created_at as string)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
