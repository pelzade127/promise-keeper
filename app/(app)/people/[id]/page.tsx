import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { JournalComposer } from "@/components/journal-composer";
import { EditablePersonHeader } from "@/components/people-ui";
import { VerseAttach } from "@/components/verse-attach";

export const dynamic = "force-dynamic";

type TimelineItem = {
  id: string;
  kind: "event" | "journal";
  at: string;
  label: string;
  body?: string | null;
};

const EVENT_LABEL: Record<string, string> = {
  created: "Made a promise",
  completed: "Kept a promise",
  care_occurrence: "Showed up",
  recommitted: "Recommitted",
  released: "Released a promise",
  missed: "Missed a promise",
  follow_up_completed: "Checked in",
  evolved: "A promise evolved",
  journal_added: "Added to the journal",
  memorialized: "Memorialized",
};

const REASON_LABEL: Record<string, string> = {
  forgot: "Forgot",
  got_busy: "Got busy",
  avoided: "Avoided it",
  circumstances_changed: "Things changed",
  no_longer_relevant: "No longer relevant",
};

const JOURNAL_LABEL: Record<string, string> = {
  note: "Note",
  reflection: "Reflection",
  prayer: "Prayer",
  update: "Update",
  memory: "Memory",
};

function formatDate(at: string): string {
  return new Date(at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: person } = await supabase
    .from("people")
    .select("id, name, relationship_note, status, created_at")
    .eq("id", id)
    .single();

  if (!person) notFound();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("faith_mode")
    .eq("id", user.id)
    .maybeSingle();
  const faithMode = Boolean(profile?.faith_mode);

  const [{ data: promises }, { data: journal }, { data: events }] =
    await Promise.all([
      supabase
        .from("promises")
        .select("id, title, status, due_date, promise_type")
        .eq("person_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("journal_entries")
        .select("id, entry_type, content, created_at")
        .eq("person_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("promise_events")
        .select("id, event_type, note, reflection, missed_reason, created_at")
        .eq("person_id", id)
        .order("created_at", { ascending: false }),
    ]);

  const allPromises = promises ?? [];
  const active = allPromises.filter((p) => p.status === "active");
  const keptCount = (events ?? []).filter(
    (e) => e.event_type === "completed",
  ).length;

  // Merge events + journal entries into one timeline.
  const timeline: TimelineItem[] = [
    ...(events ?? []).map((e) => {
      let label = EVENT_LABEL[e.event_type] ?? "Update";
      if (e.event_type === "released" && e.missed_reason) {
        label += ` · ${REASON_LABEL[e.missed_reason] ?? e.missed_reason}`;
      }
      const body =
        e.note && e.event_type !== "checked_in"
          ? `"${e.note}"${e.reflection ? ` — ${e.reflection}` : ""}`
          : e.reflection || null;
      return {
        id: `e_${e.id}`,
        kind: "event" as const,
        at: e.created_at,
        label,
        body,
      };
    }),
    ...(journal ?? []).map((j) => ({
      id: `j_${j.id}`,
      kind: "journal" as const,
      at: j.created_at,
      label: JOURNAL_LABEL[j.entry_type] ?? "Note",
      body: j.content,
    })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <div className="container py-10 sm:py-14">
      <AppNav />

      <Link
        href="/people"
        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        ← All people
      </Link>

      <header className="mt-4 mb-8 flex flex-wrap items-end justify-between gap-4">
        <EditablePersonHeader
          personId={person.id}
          initialName={person.name}
          initialNote={person.relationship_note}
          keptText={
            keptCount === 0
              ? "Your story together is just beginning."
              : `${keptCount} promise${keptCount === 1 ? "" : "s"} kept so far.`
          }
        />
        <Link
          href={`/promises/new?person=${person.id}`}
          className="rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          Make a promise
        </Link>
      </header>

      <div className="grid gap-8 md:grid-cols-[1fr_340px]">
        <div>
          {active.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Open promises
              </h2>
              <div className="space-y-2">
                {active.map((p) => (
                  <Link
                    key={p.id}
                    href={`/promises/${p.id}/edit?from=/people/${person.id}`}
                    className="block rounded-lg border border-border bg-card px-4 py-3 transition hover:border-primary"
                  >
                    <span className="text-foreground">{p.title}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              The story so far
            </h2>
            {timeline.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-card/60 p-8 text-center text-muted-foreground">
                Nothing here yet. Make a promise or add a note, and {person.name}
                ’s story will start to fill in.
              </p>
            ) : (
              <ol className="relative space-y-5 border-l border-border pl-6">
                {timeline.map((item) => (
                  <li key={item.id} className="relative">
                    <span
                      className={`absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full ${
                        item.kind === "journal" ? "bg-accent" : "bg-primary"
                      }`}
                    />
                    <p className="text-sm font-medium text-foreground">
                      {item.label}
                    </p>
                    {item.body && (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {item.body}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-muted-foreground/70">
                      {formatDate(item.at)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="space-y-5">
          {faithMode && (
            <VerseAttach personId={person.id} name={person.name} />
          )}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Add to the journal
            </h2>
            <JournalComposer personId={person.id} name={person.name} />
          </div>
        </div>
      </div>
    </div>
  );
}
