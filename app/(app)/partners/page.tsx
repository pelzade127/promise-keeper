import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import {
  InvitePartnerForm,
  RevokeButton,
  RespondButtons,
} from "@/components/partners-ui";

export const dynamic = "force-dynamic";

const VISIBILITY_LABEL: Record<string, string> = {
  everything: "All active promises",
  overdue_only: "Overdue only",
  weekly_digest: "Weekly digest",
  selected_categories: "Selected categories",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Invited",
  accepted: "Active",
  declined: "Declined",
  revoked: "Revoked",
};

export default async function PartnersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Attach any invitations sent to this user's email.
  await supabase.rpc("claim_partner_invites");

  const [{ data: mine }, { data: supporting }] = await Promise.all([
    // Partners I've invited to watch my promises.
    supabase
      .from("accountability_partners")
      .select("id, partner_email, visibility, status, partner_id")
      .eq("owner_id", user.id)
      .order("invited_at", { ascending: false }),
    // Invitations where I'm the partner.
    supabase
      .from("accountability_partners")
      .select("id, owner_id, visibility, status")
      .eq("partner_id", user.id)
      .order("invited_at", { ascending: false }),
  ]);

  const myPartners = mine ?? [];
  const supportingRows = supporting ?? [];
  const pendingForMe = supportingRows.filter((r) => r.status === "pending");
  const acceptedForMe = supportingRows.filter((r) => r.status === "accepted");

  // Resolve owner display names for the "you're supporting" side.
  const ownerIds = Array.from(
    new Set(supportingRows.map((r) => r.owner_id as string)),
  );
  const nameById = new Map<string, string>();
  if (ownerIds.length) {
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("id, display_name")
      .in("id", ownerIds);
    for (const p of profiles ?? [])
      nameById.set(p.id as string, (p.display_name as string) ?? "Someone");
  }

  return (
    <div className="container py-10 sm:py-14">
      <AppNav />

      <header className="mb-8">
        <h1 className="font-display text-4xl text-foreground">
          Accountability
        </h1>
        <p className="mt-2 text-muted-foreground">
          Invite someone you trust to walk with you — and support others in turn.
        </p>
      </header>

      {pendingForMe.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Invitations for you
          </h2>
          <div className="space-y-2">
            {pendingForMe.map((r) => (
              <div
                key={r.id as string}
                className="flex items-center justify-between rounded-lg border border-primary/30 bg-secondary px-5 py-4"
              >
                <p className="text-foreground">
                  <span className="font-medium">
                    {nameById.get(r.owner_id as string) ?? "Someone"}
                  </span>{" "}
                  invited you to help keep them accountable.
                </p>
                <RespondButtons id={r.id as string} />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-8 md:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Your partners
            </h2>
            {myPartners.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-card/60 p-8 text-center text-muted-foreground">
                No partners yet. Invite someone to gently keep you accountable.
              </p>
            ) : (
              <div className="space-y-2">
                {myPartners.map((p) => (
                  <div
                    key={p.id as string}
                    className="flex items-center justify-between rounded-lg border border-border bg-card px-5 py-4"
                  >
                    <div>
                      <p className="text-foreground">{p.partner_email as string}</p>
                      <p className="text-sm text-muted-foreground">
                        {STATUS_LABEL[p.status as string] ?? p.status} ·{" "}
                        {VISIBILITY_LABEL[p.visibility as string] ??
                          p.visibility}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/partners/manage/${p.id}`}
                        className="text-sm font-medium text-primary underline-offset-4 transition hover:underline"
                      >
                        Choose promises
                      </Link>
                      <RevokeButton id={p.id as string} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              You're supporting
            </h2>
            {acceptedForMe.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-card/60 p-8 text-center text-muted-foreground">
                When you accept an invitation, you'll be able to check in on them
                here.
              </p>
            ) : (
              <div className="space-y-2">
                {acceptedForMe.map((r) => (
                  <Link
                    key={r.id as string}
                    href={`/partners/${r.owner_id}`}
                    className="flex items-center justify-between rounded-lg border border-border bg-card px-5 py-4 transition hover:border-primary"
                  >
                    <span className="font-display text-lg text-foreground">
                      {nameById.get(r.owner_id as string) ?? "Someone"}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Check in →
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <InvitePartnerForm />
      </div>
    </div>
  );
}
