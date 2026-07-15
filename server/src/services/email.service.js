import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { User } from "../modules/auth/auth.model.js";
import { CircuitBreaker } from "../utils/circuitBreaker.js";

const emailCircuitBreaker = new CircuitBreaker("SMTP", {
  failureThreshold: 3,
  requestTimeout: 10000, // 10 seconds timeout for email dispatch
  cooldownPeriod: 30000 // 30 seconds cooldown
});

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
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000
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

  return emailCircuitBreaker.fire(
    async () => {
      await transporter.sendMail({
        from: env.smtpFrom,
        to,
        subject,
        text,
        html
      });
      return { delivered: true, fallback: false };
    },
    (err) => {
      if (err) {
        console.error(`[Email CircuitBreaker Error] ${err.message}`);
      }
      console.log(`[Email fallback] To: ${to}`);
      console.log(`[Email fallback] Subject: ${subject}`);
      return { delivered: false, fallback: true, circuitOpen: true };
    }
  );
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

export async function testSmtpConnection() {
  const diagnostics = {
    smtpHost: env.smtpHost || null,
    smtpPort: env.smtpPort || null,
    smtpSecure: env.smtpSecure,
    smtpUser: env.smtpUser || null,
    hasSmtpPass: Boolean(env.smtpPass),
    smtpPassLength: env.smtpPass ? env.smtpPass.length : 0,
    smtpFrom: env.smtpFrom || null,
    connectionOk: false,
    errorMessage: null
  };

  try {
    if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
      throw new Error("Missing SMTP host, user, or password config.");
    }

    const transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000
    });

    await transporter.verify();
    diagnostics.connectionOk = true;
  } catch (error) {
    diagnostics.connectionOk = false;
    diagnostics.errorMessage = error.message;
  }

  return diagnostics;
}

