import Link from "next/link";
import { getDashboardData } from "@/lib/dashboard";
import type { WhoEntry } from "@/lib/dashboard";
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

function PersonGroup({
  entry,
  today,
  faithMode,
}: {
  entry: WhoEntry;
  today: string;
  faithMode: boolean;
}) {
  const href = entry.type === "person" ? `/people/${entry.id}` : `/groups/${entry.id}`;
  return (
    <section className="mb-8">
      <div className="mb-2.5 flex items-baseline gap-2.5">
        <Link
          href={href}
          className="font-display text-2xl text-foreground underline-offset-4 hover:text-primary hover:underline"
        >
          {entry.name}
        </Link>
        {entry.activeNeedsCount > 0 && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
            {entry.activeNeedsCount} need{entry.activeNeedsCount === 1 ? "" : "s"}
          </span>
        )}
      </div>
      {entry.promises.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing due — but there's a need to keep in mind.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {entry.promises.map((p) => (
            <PromiseCard key={p.id} promise={p} today={today} faithMode={faithMode} />
          ))}
        </div>
      )}
    </section>
  );
}

function SimplyRemember({
  people,
}: {
  people: { type: "person" | "group"; id: string; name: string }[];
}) {
  if (people.length === 0) return null;
  return (
    <section className="mt-14 border-t border-border pt-8">
      <h2 className="mb-1 text-sm font-medium text-muted-foreground">
        Simply remember
      </h2>
      <p className="mb-4 text-xs text-muted-foreground/70">
        Nothing to fix here. Sometimes remembering someone is enough.
      </p>
      <div className="flex flex-wrap gap-2">
        {people.map((p) => (
          <Link
            key={`${p.type}:${p.id}`}
            href={p.type === "person" ? `/people/${p.id}` : `/groups/${p.id}`}
            className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-foreground transition hover:border-primary"
          >
            {p.name}
          </Link>
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

  const nothingPending = data.activeCare.length === 0;

  return (
    <div className="container py-10 sm:py-14">
      <AppNav />

      {data.faithMode && <VerseCard verse={verseOfToday()} />}

      {data.faithMode && data.needsWeeklyReflection && <WeeklyReflection />}

      <header className="mb-10 max-w-2xl">
        {/* The signature: names treated as the content, set in the display face. */}
        <h1 className="font-display text-4xl leading-[1.1] text-foreground sm:text-5xl">
          Here's who needs you today.
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
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Active care
          </h2>
          {data.activeCare.map((entry) => (
            <PersonGroup
              key={entry.key}
              entry={entry}
              today={today}
              faithMode={data.faithMode}
            />
          ))}
        </>
      )}

      <SimplyRemember people={data.simplyRemember} />

      <SelfSection
        promises={data.selfPromises}
        today={today}
        faithMode={data.faithMode}
      />
    </div>
  );
}
