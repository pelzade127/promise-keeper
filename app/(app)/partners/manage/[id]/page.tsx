import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { ShareManager } from "@/components/share-manager";

export const dynamic = "force-dynamic";

type Rel = { name?: string } | { name?: string }[] | null | undefined;
function nameOf(rel: Rel): string | null {
  const r = Array.isArray(rel) ? rel[0] : rel;
  return r?.name ?? null;
}

export default async function ManagePartnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: partner } = await supabase
    .from("accountability_partners")
    .select("id, partner_email, visibility, owner_id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!partner) notFound();

  const partnerLabel =
    (partner.partner_email as string | null) ?? "your partner";

  const [{ data: promises }, { data: shares }] = await Promise.all([
    supabase
      .from("promises")
      .select(
        "id, title, target_type, person:people ( name ), group:groups ( name )",
      )
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    supabase
      .from("partner_promise_shares")
      .select("promise_id")
      .eq("accountability_partner_id", id),
  ]);

  const promiseList = ((promises ?? []) as Record<string, unknown>[]).map(
    (p) => {
      const tt = p.target_type as string;
      const who =
        tt === "self"
          ? "To yourself"
          : tt === "group"
            ? (nameOf(p.group as Rel) ?? "A group")
            : (nameOf(p.person as Rel) ?? "Someone");
      return { id: p.id as string, title: p.title as string, who };
    },
  );

  const initialShared = (shares ?? []).map((s) => s.promise_id as string);

  const vis = partner.visibility as string;
  const initialVisibility = (
    ["everything", "overdue_only", "selected_promises"].includes(vis)
      ? vis
      : "overdue_only"
  ) as "everything" | "overdue_only" | "selected_promises";

  return (
    <div className="container py-10 sm:py-14">
      <AppNav />

      <Link
        href="/partners"
        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        ← Accountability
      </Link>

      <header className="mt-4 mb-8">
        <h1 className="font-display text-4xl text-foreground">
          Sharing with {partnerLabel}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Choose exactly what this partner can see. Changes save as you go.
        </p>
      </header>

      <div className="max-w-2xl">
        <ShareManager
          partnerId={partner.id as string}
          initialVisibility={initialVisibility}
          promises={promiseList}
          initialShared={initialShared}
        />
      </div>
    </div>
  );
}
