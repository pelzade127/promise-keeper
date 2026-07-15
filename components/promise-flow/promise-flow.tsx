"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createPromise } from "@/app/(app)/promises/actions";
import type { PromiseTarget, CreatePromiseInput } from "@/types/database";
import { PromiseForm } from "./promise-form";
import {
  type Person,
  type Group,
  type Category,
  type CreationStep,
  type PromiseDetails,
  field,
} from "./types";

export function PromiseFlow({
  people,
  groups,
  categories,
  needsByPerson = {},
  preselectedPerson = null,
  preselectedGroup = null,
}: {
  people: Person[];
  groups: Group[];
  categories: Category[];
  needsByPerson?: Record<string, { id: string; title: string }[]>;
  preselectedPerson?: Person | null;
  preselectedGroup?: Group | null;
}) {
  const router = useRouter();

  const initialStep: CreationStep =
    preselectedPerson || preselectedGroup ? "details" : "target";
  const [step, setStep] = useState<CreationStep>(initialStep);
  const [target, setTarget] = useState<PromiseTarget>(
    preselectedGroup ? "group" : "person",
  );
  const [chosenPerson, setChosenPerson] = useState<Person | null>(
    preselectedPerson,
  );
  const [chosenGroup, setChosenGroup] = useState<Group | null>(
    preselectedGroup,
  );
  const [newPersonName, setNewPersonName] = useState("");
  const [query, setQuery] = useState("");
  const [groupQuery, setGroupQuery] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) => p.name.toLowerCase().includes(q));
  }, [people, query]);

  const groupMatches = useMemo(() => {
    const q = groupQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups, groupQuery]);

  const whoName =
    target === "self"
      ? "yourself"
      : target === "group"
        ? (chosenGroup?.name ?? "your group")
        : (chosenPerson?.name ?? newPersonName.trim());

  const heading =
    target === "self"
      ? "Your promise to yourself"
      : `Your promise to ${whoName || "them"}`;

  async function handleSubmit(details: PromiseDetails) {
    setError(null);
    if (!details.title.trim()) {
      setError("Give the promise a title.");
      return;
    }
    setSubmitting(true);

    const input: CreatePromiseInput = {
      target,
      personId: target === "person" ? chosenPerson?.id : undefined,
      newPersonName:
        target === "person" && !chosenPerson ? newPersonName.trim() : undefined,
      groupId: target === "group" ? chosenGroup?.id : undefined,
      ...details,
    };

    const res = await createPromise(input);
    if (res?.error) {
      setError(res.error);
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg animate-fade-up">
      <button
        onClick={() => router.push("/dashboard")}
        className="mb-6 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        ← Back to dashboard
      </button>

      {step === "target" && (
        <div>
          <h1 className="font-display text-3xl text-foreground">
            Who is this promise for?
          </h1>
          <div className="mt-6 grid gap-3">
            <button
              onClick={() => {
                setTarget("person");
                setStep(people.length ? "ask" : "newPerson");
              }}
              className="rounded-lg border border-border bg-card p-4 text-left transition hover:border-primary hover:shadow-sm"
            >
              <p className="font-medium text-foreground">A person</p>
              <p className="text-sm text-muted-foreground">
                Someone you want to show up for.
              </p>
            </button>
            <button
              onClick={() => {
                setTarget("group");
                setStep("selectGroup");
              }}
              className="rounded-lg border border-border bg-card p-4 text-left transition hover:border-primary hover:shadow-sm"
            >
              <p className="font-medium text-foreground">A group</p>
              <p className="text-sm text-muted-foreground">
                A family, small group, or team.
              </p>
            </button>
            <button
              onClick={() => {
                setTarget("self");
                setStep("details");
              }}
              className="rounded-lg border border-border bg-card p-4 text-left transition hover:border-primary hover:shadow-sm"
            >
              <p className="font-medium text-foreground">Myself</p>
              <p className="text-sm text-muted-foreground">
                A promise to your own growth.
              </p>
            </button>
          </div>
        </div>
      )}

      {step === "ask" && (
        <div>
          <h1 className="font-display text-3xl text-foreground">
            Who are you making a promise to?
          </h1>
          <p className="mt-2 text-muted-foreground">
            Is this person already in your promise list?
          </p>
          <div className="mt-6 grid gap-3">
            <button
              onClick={() => setStep(people.length ? "select" : "newPerson")}
              className="rounded-lg border border-border bg-card p-4 text-left transition hover:border-primary hover:shadow-sm"
            >
              <p className="font-medium text-foreground">
                Yes — find them in my list
              </p>
              <p className="text-sm text-muted-foreground">
                {people.length
                  ? `Search ${people.length} ${people.length === 1 ? "person" : "people"} you've cared for.`
                  : "You haven't added anyone yet."}
              </p>
            </button>
            <button
              onClick={() => setStep("newPerson")}
              className="rounded-lg border border-border bg-card p-4 text-left transition hover:border-primary hover:shadow-sm"
            >
              <p className="font-medium text-foreground">
                No — this is someone new
              </p>
              <p className="text-sm text-muted-foreground">Add them to your list.</p>
            </button>
          </div>
        </div>
      )}

      {step === "select" && (
        <div>
          <h1 className="font-display text-3xl text-foreground">
            Please select from your list
          </h1>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type any part of their name…"
            className={`${field} mt-4`}
          />
          <div className="mt-4 space-y-2">
            {matches.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No one matches that.{" "}
                <button
                  onClick={() => setStep("newPerson")}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Add someone new
                </button>
              </p>
            )}
            {matches.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setChosenPerson(p);
                  setStep("details");
                }}
                className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left transition hover:border-primary"
              >
                <span className="font-medium text-foreground">{p.name}</span>
                <span className="text-sm text-muted-foreground">Select →</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep("newPerson")}
            className="mt-5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Actually, they're new →
          </button>
        </div>
      )}

      {step === "newPerson" && (
        <div>
          <h1 className="font-display text-3xl text-foreground">
            Who are you remembering?
          </h1>
          <p className="mt-2 text-muted-foreground">
            Just their name for now — you can add more later.
          </p>
          <input
            autoFocus
            value={newPersonName}
            onChange={(e) => setNewPersonName(e.target.value)}
            placeholder="e.g. Sarah, Mom, Pastor John"
            className={`${field} mt-5`}
          />
          <button
            disabled={!newPersonName.trim()}
            onClick={() => {
              setChosenPerson(null);
              setStep("details");
            }}
            className="mt-4 w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      )}

      {step === "selectGroup" && (
        <div>
          <h1 className="font-display text-3xl text-foreground">
            Which group?
          </h1>
          {groups.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-border bg-card/60 p-6 text-center text-muted-foreground">
              You haven't made any groups yet. Create one on the{" "}
              <button
                onClick={() => router.push("/groups")}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Groups page
              </button>{" "}
              first.
            </p>
          ) : (
            <>
              <input
                autoFocus
                value={groupQuery}
                onChange={(e) => setGroupQuery(e.target.value)}
                placeholder="Type part of the group's name…"
                className={`${field} mt-4`}
              />
              <div className="mt-4 space-y-2">
                {groupMatches.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      setChosenGroup(g);
                      setStep("details");
                    }}
                    className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-left transition hover:border-primary"
                  >
                    <span className="font-medium text-foreground">{g.name}</span>
                    <span className="text-sm text-muted-foreground">Select →</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {step === "details" && (
        <PromiseForm
          heading={heading}
          categories={categories}
          availableNeeds={
            target === "person" && chosenPerson
              ? (needsByPerson[chosenPerson.id] ?? [])
              : []
          }
          submitting={submitting}
          error={error}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
