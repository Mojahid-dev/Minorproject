import nodemailer from "nodemailer";

export type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

const smtpPassword = process.env.SMTP_PASS ?? process.env.SMTP_PASSWORD;

const transporter = process.env.SMTP_HOST && process.env.SMTP_USER && smtpPassword
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: (process.env.SMTP_PORT ?? "587") === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: smtpPassword,
      },
    })
  : null;

export async function sendEmail({ to, subject, text, html }: EmailPayload) {
  if (!transporter) {
    throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS to send account emails.");
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "no-reply@localhost",
    to,
    subject,
    text,
    html,
  });
}
