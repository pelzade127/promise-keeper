"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setRelationshipStatus } from "@/app/(app)/people/actions";
import type { RelationshipStatus } from "@/types/database";

const RELATIONSHIP_STATUS_LABEL: Record<RelationshipStatus, string> = {
  active: "Active",
  dormant: "Dormant",
  reconnected: "Reconnected",
  past: "Past",
};

const RELATIONSHIP_STATUS_HINT: Record<RelationshipStatus, string> = {
  active: "You're currently in touch.",
  dormant: "It's been quiet, but the relationship isn't over.",
  reconnected: "You picked this back up after some distance.",
  past: "This chapter has closed — the story stays here.",
};

export function RelationshipCard({
  personId,
  relationshipNote,
  relationshipStatus,
  personStatus,
  firstAdded,
  currentNeeds,
  resolvedNeeds,
  activePromises,
  lastActOfCare,
  currentJourney,
  needId,
}: {
  personId: string;
  relationshipNote: string | null;
  relationshipStatus: RelationshipStatus;
  personStatus: "Living" | "Memorial";
  firstAdded: string;
  currentNeeds: number;
  resolvedNeeds: number;
  activePromises: number;
  lastActOfCare: string | null;
  currentJourney: string | null;
  needId: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(relationshipStatus);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function pick(next: RelationshipStatus) {
    setOpen(false);
    if (next === status) return;
    setStatus(next);
    setBusy(true);
    await setRelationshipStatus({ personId, status: next });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {relationshipNote || "Relationship not set"}
          </p>
          <div className="relative mt-1 inline-block">
            <button
              onClick={() => setOpen((v) => !v)}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground transition hover:bg-secondary/80 disabled:opacity-60"
            >
              {RELATIONSHIP_STATUS_LABEL[status]}
              <span className="text-xs">▾</span>
            </button>
            {open && (
              <div className="absolute left-0 top-full z-10 mt-1 w-56 rounded-lg border border-border bg-card p-1 shadow-md">
                {(Object.keys(RELATIONSHIP_STATUS_LABEL) as RelationshipStatus[]).map(
                  (key) => (
                    <button
                      key={key}
                      onClick={() => pick(key)}
                      className={`block w-full rounded-md px-3 py-2 text-left text-sm transition hover:bg-muted ${
                        key === status ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      <span className="font-medium">
                        {RELATIONSHIP_STATUS_LABEL[key]}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {RELATIONSHIP_STATUS_HINT[key]}
                      </span>
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
        <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
          {personStatus}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">First added</dt>
          <dd className="text-foreground">{firstAdded}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Current needs</dt>
          <dd className="text-foreground">{currentNeeds}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Resolved needs</dt>
          <dd className="text-foreground">{resolvedNeeds}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Active promises</dt>
          <dd className="text-foreground">{activePromises}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Last act of care</dt>
          <dd className="text-foreground">{lastActOfCare ?? "Not yet"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Current journey</dt>
          <dd className="text-foreground">
            {currentJourney && needId ? (
              <Link
                href={`/people/${personId}/needs/${needId}`}
                className="underline-offset-4 hover:text-primary hover:underline"
              >
                {currentJourney}
              </Link>
            ) : (
              "Nothing pressing right now"
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}
