import { createClient } from "@/lib/supabase/server";
import { PromiseFlow } from "@/components/promise-flow/promise-flow";

export const dynamic = "force-dynamic";

export default async function NewPromisePage({
  searchParams,
}: {
  searchParams: Promise<{ person?: string; group?: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { person: personId, group: groupId } = await searchParams;

  const [{ data: people }, { data: groups }, { data: categories }, { data: needRows }] =
    await Promise.all([
      supabase
        .from("people")
        .select("id, name")
        .eq("status", "active")
        .order("name", { ascending: true }),
      supabase
        .from("groups")
        .select("id, name")
        .eq("status", "active")
        .order("name", { ascending: true }),
      supabase
        .from("categories")
        .select("id, name, color")
        .order("name", { ascending: true }),
      supabase
        .from("needs")
        .select("id, title, person_id, group_id")
        .eq("status", "active")
        .order("created_at", { ascending: false }),
    ]);

  const needsByPerson: Record<string, { id: string; title: string }[]> = {};
  const needsByGroup: Record<string, { id: string; title: string }[]> = {};
  for (const n of needRows ?? []) {
    const title = n.title as string;
    const id = n.id as string;
    if (n.person_id) {
      const pid = n.person_id as string;
      (needsByPerson[pid] ??= []).push({ id, title });
    } else if (n.group_id) {
      const gid = n.group_id as string;
      (needsByGroup[gid] ??= []).push({ id, title });
    }
  }

  const preselectedPerson =
    personId && people ? (people.find((p) => p.id === personId) ?? null) : null;
  const preselectedGroup =
    groupId && groups ? (groups.find((g) => g.id === groupId) ?? null) : null;

  return (
    <div className="container py-10 sm:py-14">
      <PromiseFlow
        people={people ?? []}
        groups={groups ?? []}
        categories={categories ?? []}
        needsByPerson={needsByPerson}
        needsByGroup={needsByGroup}
        preselectedPerson={preselectedPerson}
        preselectedGroup={preselectedGroup}
      />
    </div>
  );
}
