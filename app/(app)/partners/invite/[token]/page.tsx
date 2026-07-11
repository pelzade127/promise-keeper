import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { ClaimInvite } from "@/components/claim-invite";

export const dynamic = "force-dynamic";

export default async function InviteLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="container py-10 sm:py-14">
        <div className="mx-auto max-w-md rounded-lg border border-border bg-card p-8 text-center">
          <h1 className="font-display text-2xl text-foreground">
            Sign in to accept this invitation
          </h1>
          <p className="mt-2 text-muted-foreground">
            Create an account or sign in, then come back to this link.
          </p>
          <a
            href={`/login?next=/partners/invite/${token}`}
            className="mt-5 inline-block rounded-lg bg-primary px-5 py-2.5 font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            Go to sign in
          </a>
        </div>
      </div>
    );
  }

  const { data: lookup } = await supabase.rpc("get_invite_link_owner", {
    p_token: token,
  });
  const row = Array.isArray(lookup) ? lookup[0] : lookup;

  return (
    <div className="container py-10 sm:py-14">
      <AppNav />
      <div className="mx-auto max-w-md">
        <ClaimInvite
          token={token}
          ownerName={(row?.display_name as string | undefined) ?? null}
          isSelf={row?.owner_id === user.id}
        />
      </div>
    </div>
  );
}
