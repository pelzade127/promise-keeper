import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { MILESTONE_LABEL } from "@/lib/milestones";

export const dynamic = "force-dynamic";

function weekStart(d: Date): string {
  const day = (d.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(d);
  monday.setDate(d.getDate() - day);
  return monday.toISOString().slice(0, 10);
}

function currentWeeklyStreak(isoDates: string[]): number {
  const weeks = new Set(isoDates.map((s) => weekStart(new Date(s))));
  let streak = 0;
  const cursor = new Date();
  // Walk back week by week while each week has at least one kept promise.
  // Allow the streak to "still count" if this week is empty but last week isn't.
  let allowSkipThisWeek = !weeks.has(weekStart(cursor));
  while (true) {
    const ws = weekStart(cursor);
    if (weeks.has(ws)) {
      streak++;
      allowSkipThisWeek = false;
    } else if (allowSkipThisWeek) {
      allowSkipThisWeek = false;
    } else {
      break;
    }
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

function formatDate(at: string): string {
  return new Date(at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function JourneyPage() {
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
  const faithMode = Boolean(profile?.faith_mode);

  const [
    { data: events },
    { data: people },
    { data: groups },
    { data: answered },
    { data: milestones },
  ] = await Promise.all([
    supabase
      .from("promise_events")
      .select("id, event_type, person_id, group_id, note, reflection, created_at")
      .in("event_type", ["completed", "care_occurrence"])
      .order("created_at", { ascending: false }),
    supabase.from("people").select("id, name"),
    supabase.from("groups").select("id, name"),
    supabase
      .from("promises")
      .select("id")
      .not("answered_at", "is", null),
    supabase
      .from("milestones")
      .select("id, person_id, group_id, milestone_type, title, note, occurred_on")
      .order("occurred_on", { ascending: false }),
  ]);

  const completed = (events ?? []) as Record<string, unknown>[];
  const peopleName = new Map<string, string>();
  for (const p of people ?? [])
    peopleName.set(p.id as string, p.name as string);
  const groupName = new Map<string, string>();
  for (const g of groups ?? [])
    groupName.set(g.id as string, g.name as string);

  const keptCount = completed.length;

  const now = Date.now();
  const keptLast30 = completed.filter(
    (e) => now - new Date(e.created_at as string).getTime() <= 30 * 86_400_000,
  ).length;

  const peopleSet = new Set<string>();
  const groupSet = new Set<string>();
  const perPerson = new Map<string, number>();
  for (const e of completed) {
    const pid = e.person_id as string | null;
    const gid = e.group_id as string | null;
    if (pid) {
      peopleSet.add(pid);
      perPerson.set(pid, (perPerson.get(pid) ?? 0) + 1);
    }
    if (gid) groupSet.add(gid);
  }

  const streak = currentWeeklyStreak(
    completed.map((e) => e.created_at as string),
  );

  const topPeople = [...perPerson.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, count]) => ({ name: peopleName.get(id) ?? "Someone", count }));

  const answeredCount = (answered ?? []).length;
  const milestoneList = (milestones ?? []) as Record<string, unknown>[];

  const whoOf = (personId: string | null, groupId: string | null): string => {
    if (personId) return peopleName.get(personId) ?? "Someone";
    if (groupId) return groupName.get(groupId) ?? "A group";
    return "Yourself";
  };

  const whoOfEvent = (e: Record<string, unknown>): string =>
    whoOf(e.person_id as string | null, e.group_id as string | null);

  // Memory Lane weaves kept-promise events and deliberately marked milestones
  // into one real, data-built feed — never AI-generated, always something
  // that actually happened.
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
      text: `${e.event_type === "care_occurrence" ? "You showed up for" : "You kept your word to"} ${whoOfEvent(e)}${(e.note as string | null) ? ` — ${e.note as string}` : ""}`,
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

  const stats: { label: string; value: number }[] = [
    { label: "Acts of faithfulness", value: keptCount },
    { label: "Kept in the last 30 days", value: keptLast30 },
    { label: "People shown up for", value: peopleSet.size },
    { label: "Groups cared for", value: groupSet.size },
    { label: "Milestones marked", value: milestoneList.length },
  ];
  if (faithMode) {
    stats.push({ label: "Answered prayers", value: answeredCount });
  }

  return (
    <div className="container py-10 sm:py-14">
      <AppNav />

      <header className="mb-8">
        <h1 className="font-display text-4xl text-foreground">Your journey</h1>
        <p className="mt-2 text-muted-foreground">
          A record of the times you kept your word.
        </p>
      </header>

      {keptCount === 0 && milestoneList.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-card/60 p-10 text-center text-muted-foreground">
          Your story is just beginning. Keep your first promise and it'll appear
          here.{" "}
          <Link
            href="/dashboard"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Back to today
          </Link>
        </p>
      ) : (
        <div className="space-y-10">
          {streak > 0 && (
            <div className="rounded-lg border border-accent/30 bg-accent/10 px-5 py-4">
              <p className="font-display text-2xl text-foreground">
                {streak} week{streak === 1 ? "" : "s"} of faithfulness
              </p>
              <p className="text-sm text-muted-foreground">
                Weeks in a row you've kept at least one promise. Keep it going.
              </p>
            </div>
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

          {topPeople.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                People you've shown up for most
              </h2>
              <div className="space-y-2">
                {topPeople.map((t) => (
                  <div
                    key={t.name}
                    className="flex items-center justify-between rounded-lg border border-border bg-card px-5 py-3"
                  >
                    <span className="font-display text-lg text-foreground">
                      {t.name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {t.count} kept
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Memory lane
            </h2>
            <ol className="relative space-y-5 border-l border-border pl-6">
              {lane.slice(0, 60).map((item) => (
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
