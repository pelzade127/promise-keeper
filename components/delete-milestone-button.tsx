"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteMilestone } from "@/app/(app)/milestones/actions";

export function DeleteMilestoneButton({
  id,
  personId,
  groupId,
}: {
  id: string;
  personId?: string;
  groupId?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await deleteMilestone({ id, personId, groupId });
        router.refresh();
      }}
      className="text-xs text-muted-foreground underline-offset-4 transition hover:text-destructive hover:underline disabled:opacity-50"
    >
      {busy ? "Removing…" : "Remove"}
    </button>
  );
}
