import type { PromiseType, PromiseRecurrence, FollowUpType } from "@/types/database";

export type Person = { id: string; name: string };
export type Group = { id: string; name: string };
export type Category = { id: string; name: string; color: string | null };

/** Steps in the "who is this promise for, then what is it" creation wizard. */
export type CreationStep =
  | "target"
  | "ask"
  | "select"
  | "newPerson"
  | "selectGroup"
  | "details";

/** The collected fields from the promise details form, before submission. */
export type PromiseDetails = {
  title: string;
  categoryId?: string;
  whyItMatters?: string;
  promiseType: PromiseType;
  recurrence?: PromiseRecurrence;
  dueDate?: string;
  reminderEnabled: boolean;
  followUpType: FollowUpType;
  followUpIntervalDays?: number;
  needId?: string;
};

/** Steps within the "complete a promise" flow (see promise-card.tsx). */
export type CompletionStepName = "confirm" | "reflect" | "continue" | "followup" | "done";

export const field =
  "w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30";

export const label = "block text-sm font-medium text-foreground mb-1.5";
