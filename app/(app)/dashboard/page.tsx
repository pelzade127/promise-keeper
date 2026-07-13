import Link from "next/link";
import { getDashboardData } from "@/lib/dashboard";
import { verseOfToday } from "@/lib/faith";
import { PromiseCard } from "@/components/promise-card";
import { VerseCard } from "@/components/verse-card";
import { WeeklyReflection } from "@/components/weekly-reflection";
import { AppNav } from "@/components/app-nav";
import type { PromiseWithRelations } from "@/types/database";

export const dynamic = "force-dynamic";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function Section({
  title,
  promises,
  today,
  context = "default",
  faithMode = false,
}: {
  title: string;
  promises: PromiseWithRelations[];
  today: string;
  context?: "default" | "followup";
  faithMode?: boolean;
}) {
  if (promises.length === 0) return null;
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {promises.map((p) => (
          <PromiseCard
            key={p.id}
            promise={p}
            today={today}
            context={context}
            faithMode={faithMode}
          />
        ))}
      </div>
    </section>
  );
}

function SelfSection({
  promises,
  today,
  faithMode,
}: {
  promises: PromiseWithRelations[];
  today: string;
  faithMode: boolean;
}) {
  if (promises.length === 0) return null;
  return (
    <section className="mt-14 border-t border-border pt-8">
      <h2 className="mb-1 text-sm font-medium text-muted-foreground">
        For yourself, too
      </h2>
      <p className="mb-4 text-xs text-muted-foreground/70">
        The dashboard above is about the people in your life. This is just
        for you.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {promises.map((p) => (
          <PromiseCard
            key={p.id}
            promise={p}
            today={today}
            faithMode={faithMode}
          />
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
      <AppNav />

      {data.faithMode && <VerseCard verse={verseOfToday()} />}

      {data.faithMode && data.needsWeeklyReflection && <WeeklyReflection />}

      <header className="mb-10 max-w-2xl">
        {/* The signature: names treated as the content, set in the display face. */}
        <h1 className="font-display text-4xl leading-[1.1] text-foreground sm:text-5xl">
          Today you can be faithful to…
        </h1>
        {data.peopleWaiting > 0 && (
          <p className="mt-4 text-muted-foreground">
            {data.peopleWaiting === 1
              ? "1 person is waiting on your follow-through."
              : `${data.peopleWaiting} people are waiting on your follow-through.`}
          </p>
        )}
      </header>

      {nothingPending ? (
        <div className="rounded-lg border border-dashed border-border bg-card/60 p-10 text-center">
          <p className="font-display text-2xl text-foreground">
            All caught up, {data.displayName}.
          </p>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">
            No one is waiting today. When you make a promise, the person attached
            to it will show up here — and you’ll get to keep your word.
          </p>
          <Link
            href="/promises/new"
            className="mt-6 inline-block rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            Make a promise
          </Link>
        </div>
      ) : (
        <>
          <Section
            title="Overdue"
            promises={data.overdue}
            today={today}
            faithMode={data.faithMode}
          />
          <Section
            title="Due today"
            promises={data.dueToday}
            today={today}
            faithMode={data.faithMode}
          />
          <Section
            title="Time to follow up"
            promises={data.followUps}
            today={today}
            context="followup"
            faithMode={data.faithMode}
          />
          <Section
            title="Ongoing care"
            promises={data.openCare}
            today={today}
            faithMode={data.faithMode}
          />
        </>
      )}

      <SelfSection
        promises={data.selfPromises}
        today={today}
        faithMode={data.faithMode}
      />
    </div>
  );
}
