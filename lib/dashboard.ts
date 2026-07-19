import { createClient } from "@/lib/supabase/server";
import type { PromiseWithRelations } from "@/types/database";

export type WhoEntry = {
  key: string;
  type: "person" | "group";
  id: string;
  name: string;
  promises: PromiseWithRelations[];
  activeNeedsCount: number;
  hasUrgent: boolean;
};

export interface DashboardData {
  displayName: string;
  faithMode: boolean;
  needsWeeklyReflection: boolean;
  /** People and groups with something active — a promise, a need, or a due
   * follow-up. This is the dashboard's main content: not "12 things to do,"
   * but who currently needs your attention. */
  activeCare: WhoEntry[];
  /** People and groups with nothing active right now — nothing to fix, just
   * someone worth keeping in mind. */
  simplyRemember: { type: "person" | "group"; id: string; name: string }[];
  /** Promises to yourself — kept separate so they don't crowd out the
   * people-focused sections above; the dashboard's job is remembering
   * others first. */
  selfPromises: PromiseWithRelations[];
  /** Distinct people/groups with an overdue or due-today promise. */
  peopleWaiting: number;
}

function todayISO(): string {
  // Server-local date as YYYY-MM-DD. (We'll move to per-user timezones later.)
  return new Date().toISOString().slice(0, 10);
}

export async function getDashboardData(): Promise<DashboardData | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = todayISO();

  const [
    { data: profile },
    { data: recentReflections },
    { data: activePromises },
    { data: followUpPromises },
    { data: people },
    { data: groups },
    { data: needRows },
  ] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("display_name, faith_mode")
      .eq("id", user.id)
      .maybeSingle(),
    // Has the user reflected in the last 7 days?
    supabase
      .from("reflections")
      .select("id")
      .gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString())
      .limit(1),
    supabase
      .from("promises")
      .select(
        `*, person:people ( id, name ), group:groups ( id, name ), category:categories ( id, name, color ), need:needs ( id, title )`,
      )
      .eq("status", "active")
      .order("due_date", { ascending: true }),
    // Queried separately: a completed one-time promise can still have a
    // pending follow-up check-in, so this isn't limited to active rows.
    supabase
      .from("promises")
      .select(
        `*, person:people ( id, name ), group:groups ( id, name ), category:categories ( id, name, color ), need:needs ( id, title )`,
      )
      .not("next_follow_up_date", "is", null)
      .lte("next_follow_up_date", today)
      .neq("status", "released"),
    supabase.from("people").select("id, name").eq("status", "active"),
    supabase.from("groups").select("id, name").eq("status", "active"),
    supabase
      .from("needs")
      .select("person_id, group_id")
      .eq("user_id", user.id)
      .eq("status", "active"),
  ]);

  const needsWeeklyReflection = (recentReflections ?? []).length === 0;

  // Merge active promises + due-follow-up promises, de-duplicated by id.
  const rowsById = new Map<string, PromiseWithRelations>();
  for (const p of (activePromises ?? []) as unknown as PromiseWithRelations[]) {
    rowsById.set(p.id, p);
  }
  for (const p of (followUpPromises ?? []) as unknown as PromiseWithRelations[]) {
    rowsById.set(p.id, p);
  }
  const rows = Array.from(rowsById.values());

  const needsCountByKey = new Map<string, number>();
  for (const n of needRows ?? []) {
    const key = n.person_id
      ? `person:${n.person_id}`
      : n.group_id
        ? `group:${n.group_id}`
        : null;
    if (key) needsCountByKey.set(key, (needsCountByKey.get(key) ?? 0) + 1);
  }

  // Seed the map from the full people/groups universe, so someone with
  // literally nothing pending still shows up in "Simply remember."
  const byKey = new Map<string, WhoEntry>();
  for (const p of people ?? []) {
    const key = `person:${p.id}`;
    byKey.set(key, {
      key,
      type: "person",
      id: p.id as string,
      name: p.name as string,
      promises: [],
      activeNeedsCount: needsCountByKey.get(key) ?? 0,
      hasUrgent: false,
    });
  }
  for (const g of groups ?? []) {
    const key = `group:${g.id}`;
    byKey.set(key, {
      key,
      type: "group",
      id: g.id as string,
      name: g.name as string,
      promises: [],
      activeNeedsCount: needsCountByKey.get(key) ?? 0,
      hasUrgent: false,
    });
  }

  const selfPromises: PromiseWithRelations[] = [];

  for (const p of rows) {
    if (p.target_type === "self") {
      selfPromises.push(p);
      continue;
    }
    const key =
      p.target_type === "person" && p.person
        ? `person:${p.person.id}`
        : p.target_type === "group" && p.group
          ? `group:${p.group.id}`
          : null;
    if (!key) continue;
    const entry = byKey.get(key);
    if (!entry) continue;

    entry.promises.push(p);

    const isFollowUpDue =
      p.next_follow_up_date != null && p.next_follow_up_date <= today;
    const isOverdueOrToday =
      p.status === "active" && p.due_date != null && p.due_date <= today;
    if (isFollowUpDue || isOverdueOrToday) entry.hasUrgent = true;
  }

  const all = Array.from(byKey.values());

  const activeCare = all
    .filter((e) => e.promises.length > 0 || e.activeNeedsCount > 0)
    .sort((a, b) => {
      if (a.hasUrgent !== b.hasUrgent) return a.hasUrgent ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  const simplyRemember = all
    .filter((e) => e.promises.length === 0 && e.activeNeedsCount === 0)
    .map((e) => ({ type: e.type, id: e.id, name: e.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const peopleWaiting = activeCare.filter((e) => e.hasUrgent).length;

  return {
    displayName:
      (profile?.display_name as string | undefined) ??
      (user.user_metadata?.display_name as string | undefined) ??
      user.email?.split("@")[0] ??
      "friend",
    faithMode: Boolean(profile?.faith_mode),
    needsWeeklyReflection,
    activeCare,
    simplyRemember,
    selfPromises,
    peopleWaiting,
  };
}
