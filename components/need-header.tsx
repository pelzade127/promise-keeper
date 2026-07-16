"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateNeed,
  resolveNeed,
  archiveNeed,
  reopenNeed,
  deleteNeed,
} from "@/app/(app)/needs/actions";
import type { NeedStatus } from "@/types/database";

const field =
  "w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30";

const STATUS_LABEL: Record<NeedStatus, string> = {
  active: "Active",
  resolved: "Resolved",
  archived: "Archived",
};

export function NeedHeader({
  needId,
  personId,
  groupId,
  initialTitle,
  initialDescription,
  status,
  returnTo,
}: {
  needId: string;
  personId?: string;
  groupId?: string;
  initialTitle: string;
  initialDescription: string | null;
  status: NeedStatus;
  returnTo: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (!title.trim()) {
      setError("Give this need a title.");
      return;
    }
    setBusy(true);
    const res = await updateNeed({ id: needId, personId, groupId, title, description });
    setBusy(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function changeStatus(action: typeof resolveNeed) {
    setBusy(true);
    await action({ id: needId, personId, groupId });
    setBusy(false);
    router.refresh();
  }

  async function confirmDelete() {
    setBusy(true);
    await deleteNeed({ id: needId, personId, groupId });
    router.push(returnTo);
    router.refresh();
  }

  if (editing) {
    return (
      <div className="w-full max-w-md">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={`${field} font-display text-2xl`}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Any more context? (optional)"
          className={`${field} mt-2`}
        />
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        <div className="mt-3 flex gap-2">
          <button
            onClick={save}
            disabled={busy}
            className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            onClick={() => {
              setTitle(initialTitle);
              setDescription(initialDescription ?? "");
              setEditing(false);
            }}
            className="rounded-lg px-4 py-2 text-muted-foreground transition hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-4xl text-foreground">{initialTitle}</h1>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
          {STATUS_LABEL[status]}
        </span>
        <button
          onClick={() => setEditing(true)}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Edit
        </button>
      </div>
      {initialDescription && (
        <p className="mt-1 text-muted-foreground">{initialDescription}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {status === "active" ? (
          <>
            <button
              disabled={busy}
              onClick={() => changeStatus(resolveNeed)}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
            >
              Mark resolved
            </button>
            <button
              disabled={busy}
              onClick={() => changeStatus(archiveNeed)}
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
            >
              Archive
            </button>
          </>
        ) : (
          <button
            disabled={busy}
            onClick={() => changeStatus(reopenNeed)}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
          >
            Reopen this need
          </button>
        )}

        {confirmingDelete ? (
          <span className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Delete this need for good?</span>
            <button
              disabled={busy}
              onClick={confirmDelete}
              className="font-medium text-destructive underline-offset-4 hover:underline disabled:opacity-50"
            >
              {busy ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="text-sm text-muted-foreground underline-offset-4 hover:text-destructive hover:underline"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
