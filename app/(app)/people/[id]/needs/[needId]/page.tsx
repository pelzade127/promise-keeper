import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { NeedHeader } from "@/components/need-header";
import { MILESTONE_LABEL } from "@/lib/milestones";

export const dynamic = "force-dynamic";

type TimelineItem = {
  id: string;
  kind: "event" | "journal" | "milestone";
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

export default async function NeedPage({
  params,
}: {
  params: Promise<{ id: string; needId: string }>;
}) {
  const { id: personId, needId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: person }, { data: need }] = await Promise.all([
    supabase.from("people").select("id, name").eq("id", personId).maybeSingle(),
    supabase
      .from("needs")
      .select("id, title, description, status")
      .eq("id", needId)
      .eq("person_id", personId)
      .maybeSingle(),
  ]);

  if (!person || !need) notFound();

  const { data: needPromiseRows } = await supabase
    .from("promises")
    .select("id")
    .eq("need_id", needId);
  const needPromiseIds = (needPromiseRows ?? []).map((p) => p.id as string);

  const [{ data: promises }, { data: journal }, { data: events }, { data: milestones }] =
    await Promise.all([
      supabase
        .from("promises")
        .select("id, title, status")
        .eq("need_id", needId)
        .order("created_at", { ascending: false }),
      supabase
        .from("journal_entries")
        .select("id, entry_type, content, created_at")
        .eq("need_id", needId)
        .order("created_at", { ascending: false }),
      needPromiseIds.length
        ? supabase
            .from("promise_events")
            .select("id, event_type, note, reflection, created_at, promise_id")
            .in("promise_id", needPromiseIds)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as unknown[] }),
      supabase
        .from("milestones")
        .select("id, milestone_type, title, note, occurred_on")
        .eq("need_id", needId)
        .order("occurred_on", { ascending: false }),
    ]);

  const active = (promises ?? []).filter((p) => p.status === "active");

  const timeline: TimelineItem[] = [
    ...((events ?? []) as Record<string, unknown>[]).map((e) => ({
      id: `e_${e.id}`,
      kind: "event" as const,
      at: e.created_at as string,
      label: EVENT_LABEL[e.event_type as string] ?? "Update",
      body: e.note
        ? `"${e.note as string}"${e.reflection ? ` — ${e.reflection as string}` : ""}`
        : (e.reflection as string | null) || null,
    })),
    ...(journal ?? []).map((j) => ({
      id: `j_${j.id}`,
      kind: "journal" as const,
      at: j.created_at as string,
      label: JOURNAL_LABEL[j.entry_type as string] ?? "Note",
      body: j.content as string,
    })),
    ...(milestones ?? []).map((m) => ({
      id: `m_${m.id}`,
      kind: "milestone" as const,
      at: m.occurred_on as string,
      label: MILESTONE_LABEL[m.milestone_type as keyof typeof MILESTONE_LABEL],
      body: [m.title, m.note].filter(Boolean).join(" — "),
    })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <div className="container py-10 sm:py-14">
      <AppNav />

      <Link
        href={`/people/${person.id}`}
        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        ← {person.name}
      </Link>

      <header className="mt-4 mb-8">
        <NeedHeader
          needId={need.id}
          personId={person.id}
          initialTitle={need.title}
          initialDescription={need.description}
          status={need.status}
        />
      </header>

      <div className="grid gap-8 md:grid-cols-[1fr_320px]">
        <div>
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              This season, in order
            </h2>
            {timeline.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-card/60 p-8 text-center text-muted-foreground">
                Nothing recorded here yet. A promise tied to this need, a
                journal entry, or a milestone will show up here.
              </p>
            ) : (
              <ol className="relative space-y-5 border-l border-border pl-6">
                {timeline.map((item) => (
                  <li key={item.id} className="relative">
                    <span
                      className={
                        item.kind === "milestone"
                          ? "absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-accent bg-card"
                          : `absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full ${
                              item.kind === "journal" ? "bg-accent" : "bg-primary"
                            }`
                      }
                    />
                    <p className="text-sm font-medium text-foreground">
                      {item.kind === "milestone" && (
                        <span className="mr-1.5 text-accent-foreground/80">
                          Milestone ·
                        </span>
                      )}
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

        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Promises serving this need
          </h2>
          {active.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border bg-card/60 p-4 text-sm text-muted-foreground">
              None yet.
            </p>
          ) : (
            <div className="space-y-2">
              {active.map((p) => (
                <Link
                  key={p.id}
                  href={`/promises/${p.id}/edit?from=/people/${person.id}/needs/${need.id}`}
                  className="block rounded-lg border border-border bg-card px-4 py-3 transition hover:border-primary"
                >
                  <span className="text-foreground">{p.title}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
