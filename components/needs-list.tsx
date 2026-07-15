"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { resolveNeed, reopenNeed } from "@/app/(app)/needs/actions";
import { NeedComposer } from "@/components/need-composer";

type NeedRow = {
  id: string;
  title: string;
  description: string | null;
  status: "active" | "resolved" | "archived";
};

function NeedActions({
  need,
  personId,
}: {
  need: NeedRow;
  personId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run(
    action: (input: { id: string; personId: string }) => Promise<unknown>,
  ) {
    setBusy(true);
    await action({ id: need.id, personId });
    setBusy(false);
    router.refresh();
  }

  if (need.status === "active") {
    return (
      <button
        disabled={busy}
        onClick={() => run(resolveNeed)}
        className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
      >
        Mark resolved
      </button>
    );
  }

  return (
    <button
      disabled={busy}
      onClick={() => run(reopenNeed)}
      className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
    >
      Reopen
    </button>
  );
}

export function NeedsList({
  personId,
  name,
  needs,
}: {
  personId: string;
  name: string;
  needs: NeedRow[];
}) {
  const [showResolved, setShowResolved] = useState(false);
  const active = needs.filter((n) => n.status === "active");
  const resolved = needs.filter((n) => n.status === "resolved");
  const archived = needs.filter((n) => n.status === "archived");

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Needs
        </h2>
        <NeedComposer personId={personId} name={name} />
      </div>

      {active.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-card/60 p-4 text-sm text-muted-foreground">
          No current needs — nothing that needs fixing right now.
        </p>
      ) : (
        <div className="space-y-2">
          {active.map((n) => (
            <div
              key={n.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
            >
              <Link
                href={`/people/${personId}/needs/${n.id}`}
                className="text-foreground underline-offset-4 hover:text-primary hover:underline"
              >
                {n.title}
              </Link>
              <NeedActions need={n} personId={personId} />
            </div>
          ))}
        </div>
      )}

      {(resolved.length > 0 || archived.length > 0) && (
        <div className="mt-3">
          <button
            onClick={() => setShowResolved((v) => !v)}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {showResolved ? "Hide" : "Show"} resolved needs ({resolved.length})
          </button>
          {showResolved && (
            <div className="mt-2 space-y-2">
              {[...resolved, ...archived].map((n) => (
                <div
                  key={n.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card/60 px-4 py-3"
                >
                  <Link
                    href={`/people/${personId}/needs/${n.id}`}
                    className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    ✓ {n.title}
                  </Link>
                  <NeedActions need={n} personId={personId} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
