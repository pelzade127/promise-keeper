import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { JournalComposer } from "@/components/journal-composer";
import { MemberManager } from "@/components/groups-ui";

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

export default async function GroupPage({
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

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, description, status")
    .eq("id", id)
    .single();

  if (!group) notFound();

  const [
    { data: memberRows },
    { data: allPeople },
    { data: promises },
    { data: journal },
    { data: events },
  ] = await Promise.all([
    supabase
      .from("group_members")
      .select("id, person_id, people ( id, name )")
      .eq("group_id", id),
    supabase
      .from("people")
      .select("id, name")
      .eq("status", "active")
      .order("name", { ascending: true }),
    supabase
      .from("promises")
      .select("id, title, status")
      .eq("group_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("journal_entries")
      .select("id, entry_type, content, created_at")
      .eq("group_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("promise_events")
      .select("id, event_type, note, reflection, missed_reason, created_at")
      .eq("group_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const members = ((memberRows ?? []) as unknown[]).map((row) => {
    const m = row as {
      id: string;
      person_id: string;
      people?: { name?: string } | { name?: string }[] | null;
    };
    const personRel = Array.isArray(m.people) ? m.people[0] : m.people;
    return {
      memberId: m.id,
      personId: m.person_id,
      name: personRel?.name ?? "Someone",
    };
  });
  const memberPersonIds = new Set(members.map((m) => m.personId));
  const candidates = (allPeople ?? []).filter(
    (p) => !memberPersonIds.has(p.id),
  );

  const active = (promises ?? []).filter((p) => p.status === "active");
  const keptCount = (events ?? []).filter(
    (e) => e.event_type === "completed",
  ).length;

  const timeline: TimelineItem[] = [
    ...(events ?? []).map((e) => {
      let labelText = EVENT_LABEL[e.event_type] ?? "Update";
      if (e.event_type === "released" && e.missed_reason) {
        labelText += ` · ${REASON_LABEL[e.missed_reason] ?? e.missed_reason}`;
      }
      const body = e.note
        ? `"${e.note}"${e.reflection ? ` — ${e.reflection}` : ""}`
        : e.reflection || null;
      return {
        id: `e_${e.id}`,
        kind: "event" as const,
        at: e.created_at,
        label: labelText,
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
        href="/groups"
        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        ← All groups
      </Link>

      <header className="mt-4 mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-foreground">{group.name}</h1>
          <p className="mt-1 text-muted-foreground">
            {group.description ? `${group.description} · ` : ""}
            {keptCount === 0
              ? "Your story together is just beginning."
              : `${keptCount} promise${keptCount === 1 ? "" : "s"} kept so far.`}
          </p>
        </div>
        <Link
          href={`/promises/new?group=${group.id}`}
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
                  <div
                    key={p.id}
                    className="rounded-lg border border-border bg-card px-4 py-3"
                  >
                    <p className="text-foreground">{p.title}</p>
                  </div>
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
                Nothing here yet. Make a promise or add a note, and the group’s
                story will start to fill in.
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
          <MemberManager
            groupId={group.id}
            members={members}
            candidates={candidates}
          />
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Add to the journal
            </h2>
            <JournalComposer groupId={group.id} name={group.name} />
          </div>
        </div>
      </div>
    </div>
  );
}
