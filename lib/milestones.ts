import type { MilestoneType } from "@/types/database";

export const MILESTONE_TYPES: [MilestoneType, string][] = [
  ["answered_prayer", "Answered prayer"],
  ["need_resolved", "Need resolved"],
  ["relationship_restored", "Relationship restored"],
  ["major_life_event", "Major life event"],
  ["grief_anniversary", "Grief anniversary"],
  ["meaningful_moment", "Meaningful moment"],
  ["promise_evolved", "Promise evolved"],
];

export const MILESTONE_LABEL: Record<MilestoneType, string> =
  Object.fromEntries(MILESTONE_TYPES) as Record<MilestoneType, string>;
