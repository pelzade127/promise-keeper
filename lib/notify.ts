// Server-only email helper. Degrades gracefully: if the Resend keys aren't
// configured, it no-ops and returns false, so invitations still work (they just
// sit pending) without any email being sent. No paid services are required.

import "server-only";

/** Send an email via Resend. Requires RESEND_API_KEY and RESEND_FROM. */
export async function sendEmail(
  to: string,
  subject: string,
  text: string,
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
