/**
 * Database types for Promise Keeper.
 *
 * Hand-written to match supabase/migrations/0001_promise_keeper_schema.sql.
 * Once the project is linked you can regenerate the canonical version with:
 *   supabase gen types typescript --linked > types/database.ts
 */

export type EntityStatus = "active" | "archived" | "memorialized";
export type PromiseTarget = "person" | "group" | "self";
export type PromiseType = "one_time" | "recurring" | "open_ended_care";
export type PromiseStatus = "active" | "completed" | "released";
export type PromiseRecurrence =
  | "none" | "daily" | "weekly" | "biweekly" | "monthly" | "custom";
export type FollowUpType = "none" | "one_time" | "recurring";

/** Result shape returned by server actions (a plain module so "use server" files can import, not export, it). */
export type ActionResult = { error?: string };

/** Input for creating a promise via the person-first flow. */
export type NeedStatus = "active" | "resolved" | "archived";

export type Need = {
  id: string;
  user_id: string;
  person_id: string | null;
  group_id: string | null;
  title: string;
  description: string | null;
  status: NeedStatus;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePromiseInput {
  // Who/what the promise is for.
  target: PromiseTarget; // 'person' | 'group' | 'self'
  personId?: string; // an existing person
  newPersonName?: string; // a brand-new person to create
  groupId?: string; // an existing group
  needId?: string; // optional — which of the person's needs this serves

  // The promise itself
  title: string;
  categoryId?: string;
  whyItMatters?: string;
  promiseType: PromiseType;
  recurrence?: PromiseRecurrence;
  recurrenceIntervalDays?: number;
  dueDate?: string; // YYYY-MM-DD
  reminderEnabled: boolean;
  followUpType: FollowUpType;
  followUpIntervalDays?: number;
}
export type JournalEntryType =
  | "reflection" | "prayer" | "update" | "follow_up" | "note" | "memory"
  | "checked_in" | "sent_encouragement" | "called" | "visited"
  | "celebrated" | "delivered_meal" | "sent_resource";
export type PromiseEventType =
  | "created" | "completed" | "evolved" | "recommitted" | "released"
  | "missed" | "follow_up_completed" | "journal_added" | "memorialized"
  | "care_occurrence";

export type MilestoneType =
  | "answered_prayer"
  | "need_resolved"
  | "relationship_restored"
  | "major_life_event"
  | "grief_anniversary"
  | "meaningful_moment"
  | "promise_evolved";

export type Milestone = {
  id: string;
  user_id: string;
  person_id: string | null;
  group_id: string | null;
  promise_id: string | null;
  milestone_type: MilestoneType;
  title: string;
  note: string | null;
  occurred_on: string;
  created_at: string;
}
export type MissedReason =
  | "forgot" | "got_busy" | "avoided" | "circumstances_changed" | "no_longer_relevant";

export type RelationshipStatus = "active" | "dormant" | "reconnected" | "past";

export type Person = {
  id: string;
  user_id: string;
  name: string;
  relationship_note: string | null;
  status: EntityStatus;
  relationship_status: RelationshipStatus;
  memorialized_at: string | null;
  created_at: string;
  updated_at: string;
}

export type Category = {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  is_default: boolean;
  default_reminder_days: number | null;
  default_follow_up_days: number | null;
  created_at: string;
  updated_at: string;
}

export type Group = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
}

export type GroupMember = {
  id: string;
  user_id: string;
  group_id: string;
  person_id: string;
  created_at: string;
}

export type Promise = {
  id: string;
  user_id: string;
  title: string;
  why_it_matters: string | null;
  category_id: string | null;
  target_type: PromiseTarget;
  person_id: string | null;
  group_id: string | null;
  promise_type: PromiseType;
  status: PromiseStatus;
  recurrence: PromiseRecurrence;
  recurrence_interval_days: number | null;
  due_date: string | null;
  next_due_date: string | null;
  reminder_enabled: boolean;
  reminder_days_before: number;
  follow_up_type: FollowUpType;
  follow_up_interval_days: number | null;
  next_follow_up_date: string | null;
  completed_at: string | null;
  released_at: string | null;
  created_at: string;
  updated_at: string;
}

/** A promise row with its person and category joined in (dashboard shape). */
export type PromiseWithRelations = Promise & {
  person: Pick<Person, "id" | "name"> | null;
  group: { id: string; name: string } | null;
  category: Pick<Category, "id" | "name" | "color"> | null;
  need: { id: string; title: string } | null;
}

/**
 * Minimal Database surface for the typed Supabase client. Extend as we add
 * tables in later phases (or replace wholesale with generated types).
 */
export interface Database {
  public: {
    Tables: {
      people: {
        Row: Person;
        Insert: Partial<Person>;
        Update: Partial<Person>;
        Relationships: [];
      };
      categories: {
        Row: Category;
        Insert: Partial<Category>;
        Update: Partial<Category>;
        Relationships: [];
      };
      promises: {
        Row: Promise;
        Insert: Partial<Promise>;
        Update: Partial<Promise>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
