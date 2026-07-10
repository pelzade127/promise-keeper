"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/database";

export async function invitePartner(input: {
  email: string;
  visibility: "everything" | "overdue_only" | "selected_promises";
}): Promise<ActionResult> {
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  if (email === user.email?.toLowerCase()) {
    return { error: "You can't invite yourself." };
  }

  const { error } = await supabase.from("accountability_partners").insert({
    owner_id: user.id,
    partner_email: email,
    visibility: input.visibility,
    status: "pending",
  });
  if (error) return { error: "Couldn't send that invitation." };

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
