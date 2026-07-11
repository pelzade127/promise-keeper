"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/notify";
import type { ActionResult } from "@/types/database";

async function baseUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  const host = h.get("host") ?? "";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

export async function invitePartner(input: {
  email: string;
  visibility: "everything" | "overdue_only" | "selected_promises";
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) return { error: "Enter a valid email." };
  if (email === user.email?.toLowerCase()) {
    return { error: "You can't invite yourself." };
  }

  // One invitation per owner per email.
  const { data: existing } = await supabase
    .from("accountability_partners")
    .select("id")
    .eq("owner_id", user.id)
    .ilike("partner_email", email);
  if ((existing ?? []).length > 0) {
    return { error: "You've already invited that email." };
  }

  const { error } = await supabase.from("accountability_partners").insert({
    owner_id: user.id,
    partner_email: email,
    visibility: input.visibility,
    status: "pending",
  });
  if (error) return { error: "Couldn't send that invitation." };

  // Best-effort email (no-ops if Resend isn't configured).
  const { data: me } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  const inviter =
    (me?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Someone";

  const { data: hasAccount } = await supabase.rpc("partner_account_exists", {
    p_email: email,
    p_phone: null,
  });

  const site = await baseUrl();
  const body = hasAccount
    ? `${inviter} invited you to be their accountability partner on Promise Keeper. Open the app and go to Partners to accept.`
    : `${inviter} invited you to be their accountability partner on Promise Keeper. Create an account to accept: ${site}/login`;

  await sendEmail(email, `${inviter} invited you on Promise Keeper`, body);

  revalidatePath("/partners");
  return {};
}

export async function revokePartner(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  // Owner deletes their own invitation/partnership.
  const { error } = await supabase
    .from("accountability_partners")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);
  if (error) return { error: "Couldn't remove that partner." };

  revalidatePath("/partners");
  return {};
}

/** Partner accepts or declines an invitation addressed to them. */
export async function respondToInvite(input: {
  id: string;
  accept: boolean;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase
    .from("accountability_partners")
    .update({
      status: input.accept ? "accepted" : "declined",
      responded_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("partner_id", user.id);
  if (error) return { error: "Couldn't update that invitation." };

  revalidatePath("/partners");
  return {};
}

/** Change what a partner can see. */
export async function setPartnerVisibility(input: {
  id: string;
  visibility: "everything" | "overdue_only" | "selected_promises";
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { error } = await supabase
    .from("accountability_partners")
    .update({ visibility: input.visibility })
    .eq("id", input.id)
    .eq("owner_id", user.id);
  if (error) return { error: "Couldn't update that." };

  revalidatePath(`/partners/manage/${input.id}`);
  revalidatePath("/partners");
  return {};
}

/** Share or unshare a single promise with one partner. */
export async function togglePromiseShare(input: {
  partnerId: string;
  promiseId: string;
  share: boolean;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  if (input.share) {
    const { error } = await supabase.from("partner_promise_shares").insert({
      owner_id: user.id,
      accountability_partner_id: input.partnerId,
      promise_id: input.promiseId,
    });
    if (error && !`${error.message}`.toLowerCase().includes("duplicate")) {
      return { error: "Couldn't share that promise." };
    }
  } else {
    const { error } = await supabase
      .from("partner_promise_shares")
      .delete()
      .eq("accountability_partner_id", input.partnerId)
      .eq("promise_id", input.promiseId)
      .eq("owner_id", user.id);
    if (error) return { error: "Couldn't unshare that promise." };
  }

  revalidatePath(`/partners/manage/${input.partnerId}`);
  return {};
}

/** Copy one partner's shared set to every other accepted/pending partner. */
export async function applySharesToAllPartners(
  fromPartnerId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  // The promise ids shared with the source partner.
  const { data: sourceShares } = await supabase
    .from("partner_promise_shares")
    .select("promise_id")
    .eq("accountability_partner_id", fromPartnerId)
    .eq("owner_id", user.id);
  const promiseIds = (sourceShares ?? []).map((s) => s.promise_id as string);

  // All of my partners.
  const { data: partners } = await supabase
    .from("accountability_partners")
    .select("id")
    .eq("owner_id", user.id);

  for (const p of partners ?? []) {
    const pid = p.id as string;
    // Reset this partner's shares, then copy the source set.
    await supabase
      .from("partner_promise_shares")
      .delete()
      .eq("accountability_partner_id", pid)
      .eq("owner_id", user.id);
    if (promiseIds.length) {
      await supabase.from("partner_promise_shares").insert(
        promiseIds.map((promise_id) => ({
          owner_id: user.id,
          accountability_partner_id: pid,
          promise_id,
        })),
      );
    }
    await supabase
      .from("accountability_partners")
      .update({ visibility: "selected_promises" })
      .eq("id", pid)
      .eq("owner_id", user.id);
  }

  revalidatePath("/partners");
  return {};
}

/** Generate a one-time shareable invite link (no email required). */
export async function generateInviteLink(input: {
  visibility: "everything" | "overdue_only" | "selected_promises";
}): Promise<ActionResult & { url?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { data, error } = await supabase
    .from("accountability_partners")
    .insert({
      owner_id: user.id,
      visibility: input.visibility,
      status: "pending",
    })
    .select("invite_token")
    .single();
  if (error || !data) return { error: "Couldn't create an invite link." };

  const site = await baseUrl();
  revalidatePath("/partners");
  return { url: `${site}/partners/invite/${data.invite_token}` };
}

/** Claim a shareable link (attach the current user as its partner). */
export async function claimInviteLink(
  token: string,
): Promise<ActionResult & { id?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { data, error } = await supabase.rpc("claim_invite_link", {
    p_token: token,
  });
  if (error) {
    const msg = `${error.message}`.includes("cannot_invite_yourself")
      ? "That's your own invite link."
      : "This invite link is invalid or has already been used.";
    return { error: msg };
  }

  revalidatePath("/partners");
  return { id: data as string };
}

/**
 * Reciprocal invite: after accepting a partnership where I'm the partner
 * (I watch them), invite them back so they can watch me too. Creates a new,
 * independent invitation that they must separately accept.
 */
export async function inviteBack(
  originalRowId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const { data: original } = await supabase
    .from("accountability_partners")
    .select("owner_id, status")
    .eq("id", originalRowId)
    .eq("partner_id", user.id)
    .maybeSingle();
  if (!original || original.status !== "accepted") {
    return { error: "That partnership isn't active yet." };
  }

  const theirId = original.owner_id as string;

  const { data: already } = await supabase
    .from("accountability_partners")
    .select("id")
    .eq("owner_id", user.id)
    .eq("partner_id", theirId);
  if ((already ?? []).length > 0) {
    return { error: "You've already invited them." };
  }

  const { data: theirProfile } = await supabase
    .from("user_profiles")
    .select("email")
    .eq("id", theirId)
    .maybeSingle();

  const { error } = await supabase.from("accountability_partners").insert({
    owner_id: user.id,
    partner_id: theirId,
    partner_email: (theirProfile?.email as string | null) ?? null,
    visibility: "overdue_only",
    status: "pending",
  });
  if (error) return { error: "Couldn't send the invitation back." };

  revalidatePath("/partners");
  return {};
}
