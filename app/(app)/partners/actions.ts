"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/database";

export async function invitePartner(input: {
  email: string;
  visibility: "everything" | "overdue_only";
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
