import { createClient } from "@/lib/supabase/server";
import { PromiseFlow } from "@/components/promise-flow";

export const dynamic = "force-dynamic";

export default async function NewPromisePage({
  searchParams,
}: {
  searchParams: Promise<{ person?: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { person: personId } = await searchParams;

  const [{ data: people }, { data: categories }] = await Promise.all([
    supabase
      .from("people")
      .select("id, name")
      .eq("status", "active")
      .order("name", { ascending: true }),
    supabase
      .from("categories")
      .select("id, name, color")
      .order("name", { ascending: true }),
  ]);

  const preselected =
    personId && people
      ? (people.find((p) => p.id === personId) ?? null)
      : null;

  return (
    <div className="container py-10 sm:py-14">
      <PromiseFlow
        people={people ?? []}
        categories={categories ?? []}
        preselectedPerson={preselected}
      />
    </div>
  );
}
