import { cn } from "@/lib/utils";
import type { PromiseWithRelations } from "@/types/database";

/** Quick actions from the spec — wired up in Phase 3 (completion flow). */
const ACTIONS = ["Complete", "Recommit", "Release", "View"] as const;

function formatDue(p: PromiseWithRelations, today: string): string {
  if (p.promise_type === "open_ended_care") return "Ongoing care";
  if (!p.due_date) return "No date set";
  if (p.due_date === today) return "Today";
  if (p.due_date < today) return "Overdue";
  return new Date(p.due_date + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function PromiseCard({
  promise,
  today,
}: {
  promise: PromiseWithRelations;
  today: string;
}) {
  const who =
    promise.target_type === "self"
      ? "Yourself"
      : (promise.person?.name ?? "Someone");
  const isOverdue =
    promise.due_date != null &&
    promise.due_date < today &&
    promise.promise_type !== "open_ended_care";

  return (
    <article className="group rounded-lg border border-border bg-card p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:shadow-[0_6px_20px_rgba(47,93,80,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          {/* The person is the headline — never the task. */}
          <p className="font-display text-lg leading-tight text-foreground">
            {who}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">{promise.title}</p>
        </div>
        {promise.category && (
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{
              backgroundColor: `${promise.category.color ?? "#999"}1A`,
              color: promise.category.color ?? "inherit",
            }}
          >
            {promise.category.name}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span
          className={cn(
            "text-xs font-medium",
            isOverdue ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {formatDue(promise, today)}
        </span>
        <div className="flex gap-1.5 opacity-80 transition group-hover:opacity-100">
          {ACTIONS.map((a) => (
            <button
              key={a}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs transition",
                a === "Complete"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}
