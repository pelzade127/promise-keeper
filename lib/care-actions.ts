import type { JournalEntryType } from "@/types/database";

/** The brief's own vocabulary — small, specific acts of care that aren't a
 * promise. "Prayed" reuses the existing 'prayer' entry type rather than
 * duplicating it. */
export const CARE_ACTION_TYPES: [JournalEntryType, string][] = [
  ["prayer", "Prayed"],
  ["checked_in", "Checked in"],
  ["sent_encouragement", "Sent encouragement"],
  ["called", "Called"],
  ["visited", "Visited"],
  ["celebrated", "Celebrated"],
  ["delivered_meal", "Delivered a meal"],
  ["sent_resource", "Sent a resource"],
];

export const CARE_ACTION_LABEL: Partial<Record<JournalEntryType, string>> =
  Object.fromEntries(CARE_ACTION_TYPES);
