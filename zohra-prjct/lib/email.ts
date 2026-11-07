import nodemailer, { type Transporter } from "nodemailer";

/**
 * Sends email through Gmail SMTP (free, about 500 messages a day).
 *
 * Needs GMAIL_USER, GMAIL_APP_PASSWORD and EMAIL_FROM. When you get your own domain,
 * only this file and those variables change; nothing else in the app calls SMTP.
 *
 * In development, if the Gmail variables are missing, the email is printed to the
 * terminal instead, so you can copy the verification link and keep working.
 */
let transporter: Transporter | null = null;

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  transporter ??= nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
  return transporter;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const smtp = getTransporter();
  if (!smtp) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Email is not configured: set GMAIL_USER and GMAIL_APP_PASSWORD.");
    }
    console.warn(`\n[email:dev] GMAIL_USER / GMAIL_APP_PASSWORD not set. Would have sent:\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
    return;
  }
  await smtp.sendMail({
    from: process.env.EMAIL_FROM || process.env.GMAIL_USER,
    to,
    subject,
    html,
    text,
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

export function verificationEmail({ name, url }: { name?: string | null; url: string }) {
  const first = name?.trim() ? name.trim().split(/\s+/)[0] : "";
  const greeting = first ? `Hi ${escapeHtml(first)},` : "Hi,";
  const safeUrl = escapeHtml(url);
  const html = `<!doctype html>
<html><body style="margin:0;background:#f4f3fa;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:460px;background:#ffffff;border-radius:16px;padding:32px;">
      <tr><td>
        <p style="margin:0 0 4px;font-size:13px;font-weight:700;letter-spacing:.08em;color:#6d28d9;text-transform:uppercase;">Zohra</p>
        <h1 style="margin:0 0 16px;font-size:22px;color:#18181b;">Confirm your email</h1>
        <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#3f3f46;">${greeting}</p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3f3f46;">Tap the button to verify your email and start using Zohra.</p>
        <a href="${safeUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 22px;border-radius:12px;">Verify my email</a>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#71717a;">This link expires in 24 hours. If the button doesn't work, paste this into your browser:<br><span style="word-break:break-all;">${safeUrl}</span></p>
        <p style="margin:16px 0 0;font-size:13px;color:#71717a;">Didn't sign up? You can safely ignore this email.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  const text = `${first ? `Hi ${first},` : "Hi,"}\n\nVerify your email to start using Zohra:\n${url}\n\nThis link expires in 24 hours. If you didn't sign up, ignore this email.`;
  return { subject: "Verify your Zohra email", html, text };
}
