/**
 * Transactional email transport (Resend).
 *
 * When RESEND_API_KEY is unset we log the message instead of sending, so local
 * and preview environments work without a provider configured. Drop the key in
 * (plus RESEND_FROM) in production and the same calls send real email — nothing
 * here silently pretends a configured send succeeded: a real Resend failure throws.
 */

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.cloudleak.io").replace(/\/$/, "");

/** Absolute app URL for links embedded in emails, e.g. appUrl(`/invite/${token}`). */
export function appUrl(path = ""): string {
  return `${APP_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "CloudLeak <noreply@cloudleak.io>";

  if (!apiKey) {
    console.log(
      `[email] RESEND_API_KEY not set — skipping send to ${opts.to} (subject: "${opts.subject}")`,
    );
    return { sent: false };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
  return { sent: true };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Invitation email: branded, with a single accept CTA and a copy-paste fallback link. */
export function inviteEmailHtml(opts: {
  orgName: string;
  inviterEmail: string | null;
  role: string;
  acceptUrl: string;
  expiresAt: string;
}): string {
  const org = escapeHtml(opts.orgName);
  const inviter = opts.inviterEmail ? escapeHtml(opts.inviterEmail) : "A teammate";
  const expires = new Date(opts.expiresAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;background:#f9f9f7;margin:0;padding:24px;">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e5e0;overflow:hidden;">
  <div style="background:#1a6b3a;padding:24px 32px;">
    <p style="color:#a7f3c0;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin:0 0 4px;">CloudLeak</p>
    <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0;">You're invited</h1>
  </div>
  <div style="padding:32px;color:#222;font-size:14px;line-height:1.6;">
    <p style="margin:0 0 16px;"><strong>${inviter}</strong> invited you to join <strong>${org}</strong> on CloudLeak as ${escapeHtml(opts.role)}.</p>
    <p style="margin:0 0 24px;">CloudLeak finds AWS waste and hands you Terraform-ready fixes — estimated savings, risk, and remediation for every finding.</p>
    <a href="${opts.acceptUrl}"
       style="display:inline-block;background:#1a6b3a;color:#fff;text-decoration:none;border-radius:8px;padding:12px 24px;font-size:14px;font-weight:600;">
      Accept invitation →
    </a>
    <p style="font-size:12px;color:#888;margin-top:24px;">
      Or paste this link into your browser:<br>
      <a href="${opts.acceptUrl}" style="color:#1a6b3a;word-break:break-all;">${opts.acceptUrl}</a>
    </p>
    <p style="font-size:12px;color:#aaa;margin-top:16px;">This invitation expires ${expires}.</p>
  </div>
</div>
</body>
</html>`;
}
