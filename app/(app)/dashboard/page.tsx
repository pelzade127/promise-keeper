import { getDashboardData } from "@/lib/dashboard";
import { PromiseCard } from "@/components/promise-card";
import { SignOutButton } from "@/components/sign-out-button";
import type { PromiseWithRelations } from "@/types/database";

export const dynamic = "force-dynamic";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function Section({
  title,
  promises,
  today,
}: {
  title: string;
  promises: PromiseWithRelations[];
  today: string;
}) {
  if (promises.length === 0) return null;
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {promises.map((p) => (
          <PromiseCard key={p.id} promise={p} today={today} />
        ))}
      </div>
    </section>
  );
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  const today = todayISO();

  if (!data) return null; // middleware handles the redirect

  const nothingPending =
    data.overdue.length === 0 &&
    data.dueToday.length === 0 &&
    data.followUps.length === 0 &&
    data.openCare.length === 0;

  return (
    <div className="container py-10 sm:py-14">
      <header className="mb-10 flex items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="font-display text-sm uppercase tracking-[0.2em] text-primary">
            Promise Keeper
          </p>
          {/* The signature: names treated as the content, set in the display face. */}
          <h1 className="mt-3 font-display text-4xl leading-[1.1] text-foreground sm:text-5xl">
            Today you can be faithful to…
          </h1>
          {data.peopleWaiting > 0 && (
            <p className="mt-4 text-muted-foreground">
              {data.peopleWaiting === 1
                ? "1 person is waiting on your follow-through."
                : `${data.peopleWaiting} people are waiting on your follow-through.`}
            </p>
          )}
        </div>
        <SignOutButton />
      </header>

      {nothingPending ? (
        <div className="rounded-lg border border-dashed border-border bg-card/60 p-10 text-center">
          <p className="font-display text-2xl text-foreground">
            All caught up, {data.displayName}.
          </p>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">
            No one is waiting today. When you make a promise, the person attached
            to it will show up here — and you'll get to keep your word.
          </p>
          {/* Phase 2 lands the real "make a promise" flow here. */}
          <button className="mt-6 rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground transition hover:bg-primary/90">
            Make a promise
          </button>
        </div>
      ) : (
        <>
          <Section title="Overdue" promises={data.overdue} today={today} />
          <Section title="Due today" promises={data.dueToday} today={today} />
          <Section
            title="Time to follow up"
            promises={data.followUps}
            today={today}
          />
          <Section
            title="Ongoing care"
            promises={data.openCare}
            today={today}
          />
        </>
      )}
    </div>
  );
}
