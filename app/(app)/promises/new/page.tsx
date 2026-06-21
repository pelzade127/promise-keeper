import { createClient } from "@/lib/supabase/server";
import { PromiseFlow } from "@/components/promise-flow";

export const dynamic = "force-dynamic";

export default async function NewPromisePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

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

  return (
    <div className="container py-10 sm:py-14">
      <PromiseFlow people={people ?? []} categories={categories ?? []} />
    </div>
  );
}
