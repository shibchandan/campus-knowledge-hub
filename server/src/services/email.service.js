import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { User } from "../modules/auth/auth.model.js";

let transporterPromise = null;

async function getTransporter() {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
    return null;
  }

  if (!transporterPromise) {
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host: env.smtpHost,
        port: env.smtpPort,
        secure: env.smtpSecure,
        auth: {
          user: env.smtpUser,
          pass: env.smtpPass
        }
      })
    );
  }

  return transporterPromise;
}

export async function sendEmail({ to, subject, text, html }) {
  const transporter = await getTransporter();

  if (!transporter) {
    console.log("[Email fallback] SMTP is not configured.");
    console.log(`[Email fallback] To: ${to}`);
    console.log(`[Email fallback] Subject: ${subject}`);
    console.log(`[Email fallback] Body: ${text}`);
    return { delivered: false, fallback: true };
  }

  await transporter.sendMail({
    from: env.smtpFrom,
    to,
    subject,
    text,
    html
  });

  return { delivered: true, fallback: false };
}

export async function sendAdminNotification({ subject, text, html }) {
  const configuredEmails = env.adminNotificationEmails || [];
  const activeAdminEmails = await User.find({ role: "admin", status: "active" })
    .select("email")
    .lean();

  const recipients = [...configuredEmails, ...activeAdminEmails.map((admin) => admin.email)]
    .map((email) => String(email || "").trim().toLowerCase())
    .filter(Boolean)
    .filter((email, index, list) => list.indexOf(email) === index);

  if (recipients.length === 0) {
    console.log("[Admin notification fallback] No admin notification recipients configured.");
    console.log(`[Admin notification fallback] Subject: ${subject}`);
    console.log(`[Admin notification fallback] Body: ${text}`);
    return { delivered: false, fallback: true, recipients: [] };
  }

  return sendEmail({
    to: recipients,
    subject,
    text,
    html
  });
}
