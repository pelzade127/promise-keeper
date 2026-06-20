import { createClient } from "@/lib/supabase/server";
import type { PromiseWithRelations } from "@/types/database";

export interface DashboardData {
  displayName: string;
  overdue: PromiseWithRelations[];
  dueToday: PromiseWithRelations[];
  followUps: PromiseWithRelations[];
  openCare: PromiseWithRelations[];
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

  // RLS already scopes to this user; we still filter for clarity + index use.
  const { data: promises } = await supabase
    .from("promises")
    .select(
      `*, person:people ( id, name ), category:categories ( id, name, color )`,
    )
    .eq("status", "active")
    .order("due_date", { ascending: true });

  const rows = (promises ?? []) as unknown as PromiseWithRelations[];

  const overdue: PromiseWithRelations[] = [];
  const dueToday: PromiseWithRelations[] = [];
  const followUps: PromiseWithRelations[] = [];
  const openCare: PromiseWithRelations[] = [];

  for (const p of rows) {
    if (p.promise_type === "open_ended_care") {
      openCare.push(p);
      continue;
    }
    if (p.next_follow_up_date && p.next_follow_up_date <= today) {
      followUps.push(p);
    }
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
      (user.user_metadata?.display_name as string | undefined) ??
      user.email?.split("@")[0] ??
      "friend",
    overdue,
    dueToday,
    followUps,
    openCare,
    peopleWaiting: waiting.size,
  };
}
