import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { MILESTONE_LABEL } from "@/lib/milestones";

export const dynamic = "force-dynamic";

function formatDate(at: string): string {
  return new Date(at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default async function YearInReviewPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year: yearParam } = await params;
  const year = Number(yearParam);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const start = `${year}-01-01`;
  const end = `${year + 1}-01-01`;

  const [
    { data: events },
    { data: people },
    { data: groups },
    { data: milestones },
    { data: needsCreated },
    { data: needsResolved },
  ] = await Promise.all([
    supabase
      .from("promise_events")
      .select("id, event_type, person_id, group_id, note, reflection, created_at")
      .in("event_type", ["completed", "care_occurrence"])
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: false }),
    supabase.from("people").select("id, name"),
    supabase.from("groups").select("id, name"),
    supabase
      .from("milestones")
      .select("id, person_id, group_id, milestone_type, title, note, occurred_on")
      .gte("occurred_on", start)
      .lt("occurred_on", end)
      .order("occurred_on", { ascending: false }),
    // Needs touched this year — created, or resolved — is what the "This
    // year..." narrative is built from. Two separate queries, merged, since
    // a need could be created in one year and resolved in another.
    supabase
      .from("needs")
      .select("id, person_id, group_id, title, status, created_at, resolved_at")
      .gte("created_at", start)
      .lt("created_at", end),
    supabase
      .from("needs")
      .select("id, person_id, group_id, title, status, created_at, resolved_at")
      .gte("resolved_at", start)
      .lt("resolved_at", end),
  ]);

  const needsById = new Map<
    string,
    { id: string; person_id: string | null; group_id: string | null; title: string; status: string; created_at: string; resolved_at: string | null }
  >();
  for (const n of [...(needsCreated ?? []), ...(needsResolved ?? [])] as Record<
    string,
    unknown
  >[]) {
    needsById.set(n.id as string, n as never);
  }
  const needsThisYear = Array.from(needsById.values());

  const peopleName = new Map<string, string>();
  for (const p of people ?? []) peopleName.set(p.id as string, p.name as string);
  const groupName = new Map<string, string>();
  for (const g of groups ?? []) groupName.set(g.id as string, g.name as string);

  const whoOf = (personId: string | null, groupId: string | null): string => {
    if (personId) return peopleName.get(personId) ?? "Someone";
    if (groupId) return groupName.get(groupId) ?? "A group";
    return "Yourself";
  };

  const completed = (events ?? []) as Record<string, unknown>[];
  const milestoneList = (milestones ?? []) as Record<string, unknown>[];

  // "This year..." — built from real data, never generated. Each sentence is
  // a fact: a need that reached resolution, named plainly.
  const resolvedThisYear = needsThisYear.filter(
    (n) => n.status === "resolved" && n.resolved_at && n.resolved_at >= start && n.resolved_at < end,
  );
  const resolutionSentences = resolvedThisYear.map(
    (n) => `${whoOf(n.person_id, n.group_id)}'s ${n.title} journey reached resolution.`,
  );

  const touchedPeople = new Set(
    needsThisYear.map((n) => n.person_id ?? n.group_id).filter(Boolean),
  );
  const stillActiveCount = needsThisYear.filter((n) => n.status === "active").length;

  const summarySentence =
    needsThisYear.length > 0
      ? `You walked alongside ${touchedPeople.size} ${touchedPeople.size === 1 ? "person" : "people"} through ${needsThisYear.length} different need${needsThisYear.length === 1 ? "" : "s"}. ${resolvedThisYear.length} need${resolvedThisYear.length === 1 ? "" : "s"} reached resolution. ${stillActiveCount} journey${stillActiveCount === 1 ? "" : "s"} continue${stillActiveCount === 1 ? "s" : ""} today.`
      : null;

  const peopleSet = new Set<string>();
  const groupSet = new Set<string>();
  for (const e of completed) {
    if (e.person_id) peopleSet.add(e.person_id as string);
    if (e.group_id) groupSet.add(e.group_id as string);
  }

  const stats = [
    { label: "Acts of faithfulness", value: completed.length },
    { label: "People shown up for", value: peopleSet.size },
    { label: "Groups cared for", value: groupSet.size },
    { label: "Milestones marked", value: milestoneList.length },
  ];

  type LaneItem = {
    id: string;
    at: string;
    kind: "event" | "milestone";
    text: string;
    body?: string | null;
  };

  const lane: LaneItem[] = [
    ...completed.map((e) => ({
      id: `e_${e.id}`,
      at: e.created_at as string,
      kind: "event" as const,
      text: `${e.event_type === "care_occurrence" ? "You showed up for" : "You kept your word to"} ${whoOf(e.person_id as string | null, e.group_id as string | null)}${(e.note as string | null) ? ` — ${e.note as string}` : ""}`,
      body: (e.reflection as string | null) || null,
    })),
    ...milestoneList.map((m) => ({
      id: `m_${m.id}`,
      at: m.occurred_on as string,
      kind: "milestone" as const,
      text: `${MILESTONE_LABEL[m.milestone_type as keyof typeof MILESTONE_LABEL]} — ${whoOf(m.person_id as string | null, m.group_id as string | null)}`,
      body: [m.title, m.note].filter(Boolean).join(" — ") || null,
    })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));

  const isEmpty =
    completed.length === 0 && milestoneList.length === 0 && needsThisYear.length === 0;

  return (
    <div className="container py-10 sm:py-14">
      <AppNav />

      <Link
        href="/journey"
        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        ← Your journey
      </Link>

      <header className="mt-4 mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-foreground">{year}</h1>
          <p className="mt-2 text-muted-foreground">
            A year in review, built from what actually happened.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link
            href={`/journey/${year - 1}`}
            className="rounded-lg border border-border px-3 py-1.5 text-foreground transition hover:border-primary"
          >
            ← {year - 1}
          </Link>
          <Link
            href={`/journey/${year + 1}`}
            className="rounded-lg border border-border px-3 py-1.5 text-foreground transition hover:border-primary"
          >
            {year + 1} →
          </Link>
        </div>
      </header>

      {isEmpty ? (
        <p className="rounded-lg border border-dashed border-border bg-card/60 p-10 text-center text-muted-foreground">
          Nothing recorded for {year} yet.
        </p>
      ) : (
        <div className="space-y-10">
          {(resolutionSentences.length > 0 || summarySentence) && (
            <section className="rounded-lg border border-accent/30 bg-accent/5 p-6">
              <p className="mb-3 font-display text-lg text-foreground">
                This year…
              </p>
              <div className="space-y-2 text-foreground/90">
                {resolutionSentences.map((s, i) => (
                  <p key={i}>{s}</p>
                ))}
                {summarySentence && (
                  <p className="pt-1 text-muted-foreground">{summarySentence}</p>
                )}
              </div>
            </section>
          )}

          <section>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg border border-border bg-card px-4 py-5 text-center"
                >
                  <p className="font-display text-3xl text-foreground">
                    {s.value}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </section>

          {milestoneList.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Milestones this year
              </h2>
              <div className="space-y-2">
                {milestoneList.map((m) => (
                  <div
                    key={m.id as string}
                    className="rounded-lg border border-accent/30 bg-accent/5 px-5 py-4"
                  >
                    <p className="text-sm font-medium text-accent-foreground/80">
                      {
                        MILESTONE_LABEL[
                          m.milestone_type as keyof typeof MILESTONE_LABEL
                        ]
                      }
                    </p>
                    <p className="mt-0.5 text-foreground">
                      {m.title as string}
                      {m.note ? ` — ${m.note as string}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/70">
                      {whoOf(m.person_id as string | null, m.group_id as string | null)}{" "}
                      · {formatDate(m.occurred_on as string)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              The year, in order
            </h2>
            <ol className="relative space-y-5 border-l border-border pl-6">
              {lane.map((item) => (
                <li key={item.id} className="relative">
                  <span
                    className={
                      item.kind === "milestone"
                        ? "absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-accent bg-card"
                        : "absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary"
                    }
                  />
                  <p className="text-foreground">
                    {item.kind === "milestone" && (
                      <span className="mr-1.5 text-sm text-accent-foreground/80">
                        Milestone ·
                      </span>
                    )}
                    {item.text}
                  </p>
                  {item.body && (
                    <p className="mt-0.5 text-sm italic text-muted-foreground">
                      “{item.body}”
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground/70">
                    {formatDate(item.at)}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </div>
  );
}
