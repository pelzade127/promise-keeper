import { createClient } from "@/lib/supabase/server";
import type { PromiseWithRelations } from "@/types/database";

export interface DashboardData {
  displayName: string;
  faithMode: boolean;
  needsWeeklyReflection: boolean;
  overdue: PromiseWithRelations[];
  dueToday: PromiseWithRelations[];
  followUps: PromiseWithRelations[];
  openCare: PromiseWithRelations[];
  /** Promises to yourself — kept separate so they don't crowd out the
   * people-focused sections above; the dashboard's job is remembering
   * others first. */
  selfPromises: PromiseWithRelations[];
  /** Distinct people awaiting follow-through across overdue + today. */
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

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name, faith_mode")
    .eq("id", user.id)
    .maybeSingle();

  // Has the user reflected in the last 7 days?
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data: recentReflections } = await supabase
    .from("reflections")
    .select("id")
    .gte("created_at", weekAgo)
    .limit(1);
  const needsWeeklyReflection = (recentReflections ?? []).length === 0;

  // Active promises drive the overdue / today / open-care sections.
  const { data: promises } = await supabase
    .from("promises")
    .select(
      `*, person:people ( id, name ), group:groups ( id, name ), category:categories ( id, name, color ), need:needs ( id, title )`,
    )
    .eq("status", "active")
    .order("due_date", { ascending: true });

  // Follow-ups are queried independently: a check-in is usually due *after* a
  // one-time promise is completed, so it must not be limited to active rows.
  const { data: followUpData } = await supabase
    .from("promises")
    .select(
      `*, person:people ( id, name ), group:groups ( id, name ), category:categories ( id, name, color ), need:needs ( id, title )`,
    )
    .not("next_follow_up_date", "is", null)
    .lte("next_follow_up_date", today)
    .neq("status", "released")
    .order("next_follow_up_date", { ascending: true });

  const rows = (promises ?? []) as unknown as PromiseWithRelations[];
  const followUps = (followUpData ?? []) as unknown as PromiseWithRelations[];

  const overdue: PromiseWithRelations[] = [];
  const dueToday: PromiseWithRelations[] = [];
  const openCare: PromiseWithRelations[] = [];
  const selfPromises: PromiseWithRelations[] = [];

  const followUpIds = new Set(followUps.map((p) => p.id));

  for (const p of rows) {
    // Self-promises get their own quiet section, not the people-focused
    // buckets — the dashboard's job is remembering other people first.
    if (p.target_type === "self") {
      selfPromises.push(p);
      continue;
    }
    if (p.promise_type === "open_ended_care") {
      openCare.push(p);
      continue;
    }
    // Don't double-list a promise that's already shown as a due check-in.
    if (followUpIds.has(p.id)) continue;
    if (p.due_date && p.due_date < today) {
      overdue.push(p);
    } else if (p.due_date === today) {
      dueToday.push(p);
    }
  }

  const waiting = new Set(
    [...overdue, ...dueToday]
      .map((p) => p.person?.id)
      .filter((id): id is string => Boolean(id)),
  );

  return {
    displayName:
      (profile?.display_name as string | undefined) ??
      (user.user_metadata?.display_name as string | undefined) ??
      user.email?.split("@")[0] ??
      "friend",
    faithMode: Boolean(profile?.faith_mode),
    needsWeeklyReflection,
    overdue,
    dueToday,
    followUps,
    openCare,
    selfPromises,
    peopleWaiting: waiting.size,
  };
}
