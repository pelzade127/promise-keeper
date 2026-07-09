import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditPromiseForm } from "@/components/edit-promise-form";

export const dynamic = "force-dynamic";

export default async function EditPromisePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: promise }, { data: categories }] = await Promise.all([
    supabase
      .from("promises")
      .select(
        "id, title, why_it_matters, category_id, promise_type, recurrence, due_date, reminder_enabled, follow_up_type, follow_up_interval_days, target_type, person:people ( name ), group:groups ( name )",
      )
      .eq("id", id)
      .single(),
    supabase
      .from("categories")
      .select("id, name, color")
      .order("name", { ascending: true }),
  ]);

  if (!promise) notFound();

  const personRel = Array.isArray(promise.person)
    ? promise.person[0]
    : promise.person;
  const groupRel = Array.isArray(promise.group)
    ? promise.group[0]
    : promise.group;
  const who =
    promise.target_type === "self"
      ? "yourself"
      : promise.target_type === "group"
        ? (groupRel?.name ?? "your group")
        : (personRel?.name ?? "them");

  const redirectTo = from && from.startsWith("/") ? from : "/dashboard";

  return (
    <div className="container py-10 sm:py-14">
      <EditPromiseForm
        promise={promise}
        categories={categories ?? []}
        who={who}
        redirectTo={redirectTo}
      />
    </div>
  );
}
