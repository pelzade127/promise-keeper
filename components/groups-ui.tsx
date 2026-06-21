"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createGroup,
  archiveGroup,
  restoreGroup,
  updateGroup,
  addGroupMember,
  addNewMemberToGroup,
  removeGroupMember,
} from "@/app/(app)/groups/actions";

const field =
  "w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30";

export function AddGroupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError(null);
    if (!name.trim()) {
      setError("Please name the group.");
      return;
    }
    setSaving(true);
    const fd = new FormData();
    fd.set("name", name);
    fd.set("description", description);
    const res = await createGroup(fd);
    setSaving(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setName("");
    setDescription("");
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="mb-3 font-medium text-foreground">New group</p>
      <div className="space-y-2.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Johnson Family, Tuesday Small Group"
          className={field}
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A short description (optional)"
          className={field}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          onClick={submit}
          disabled={saving}
          className="rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          {saving ? "Creating…" : "Create group"}
        </button>
      </div>
    </div>
  );
}

export function ArchiveGroupButton({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await archiveGroup(groupId);
        router.refresh();
      }}
      className="text-sm text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline disabled:opacity-50"
    >
      Archive
    </button>
  );
}

type Person = { id: string; name: string };

export function MemberManager({
  groupId,
  members,
  candidates,
}: {
  groupId: string;
  members: { memberId: string; personId: string; name: string }[];
  candidates: Person[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [newName, setNewName] = useState("");

  async function add(personId: string) {
    setBusy(true);
    await addGroupMember({ groupId, personId });
    setBusy(false);
    setPicking(false);
    router.refresh();
  }

  async function addNew() {
    if (!newName.trim()) return;
    setBusy(true);
    await addNewMemberToGroup({ groupId, name: newName });
    setBusy(false);
    setNewName("");
    setPicking(false);
    router.refresh();
  }

  async function remove(memberId: string) {
    setBusy(true);
    await removeGroupMember({ groupId, memberId });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="mb-3 font-medium text-foreground">Members</p>
      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No one yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {members.map((m) => (
            <li
              key={m.memberId}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-foreground">{m.name}</span>
              <button
                disabled={busy}
                onClick={() => remove(m.memberId)}
                className="text-xs text-muted-foreground underline-offset-4 hover:text-destructive hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        {picking ? (
          <div className="space-y-1.5">
            {candidates.map((p) => (
              <button
                key={p.id}
                disabled={busy}
                onClick={() => add(p.id)}
                className="block w-full rounded-md border border-border px-3 py-2 text-left text-sm text-foreground transition hover:border-primary disabled:opacity-50"
              >
                {p.name}
              </button>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Or add someone new…"
                className="flex-1 rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
              <button
                disabled={busy || !newName.trim()}
                onClick={addNew}
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
              >
                Add
              </button>
            </div>
            <button
              onClick={() => setPicking(false)}
              className="mt-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setPicking(true)}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            + Add a member
          </button>
        )}
      </div>
    </div>
  );
}

export function RestoreGroupButton({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await restoreGroup(groupId);
        router.refresh();
      }}
      className="text-sm font-medium text-primary underline-offset-4 transition hover:underline disabled:opacity-50"
    >
      Restore
    </button>
  );
}

export function EditableGroupHeader({
  groupId,
  initialName,
  initialDescription,
  keptText,
}: {
  groupId: string;
  initialName: string;
  initialDescription: string | null;
  keptText: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (!name.trim()) {
      setError("Name can't be empty.");
      return;
    }
    setBusy(true);
    const res = await updateGroup({ groupId, name, description });
    setBusy(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <div className="w-full max-w-md">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`${field} font-display text-2xl`}
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A short description (optional)"
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
              setName(initialName);
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
      <div className="flex items-center gap-3">
        <h1 className="font-display text-4xl text-foreground">{name}</h1>
        <button
          onClick={() => setEditing(true)}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Edit
        </button>
      </div>
      <p className="mt-1 text-muted-foreground">
        {description ? `${description} · ` : ""}
        {keptText}
      </p>
    </div>
  );
}
