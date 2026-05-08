import crypto from "crypto";
import { env } from "../config/env.js";

const PAYMENT_GATEWAY_BASE_URL = "https://api.razorpay.com/v1";

function buildBasicAuthHeader() {
  const encoded = Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString("base64");
  return `Basic ${encoded}`;
}

export function isPaymentGatewayConfigured() {
  return Boolean(env.razorpayKeyId && env.razorpayKeySecret);
}

export function assertPaymentGatewayConfigured() {
  if (!isPaymentGatewayConfigured()) {
    const error = new Error(
      "Payment gateway is not configured yet. Add Razorpay credentials in server/.env."
    );
    error.statusCode = 503;
    throw error;
  }
}

export function toGatewayAmount(amount) {
  const numeric = Number(amount || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    const error = new Error("Payment amount must be greater than zero.");
    error.statusCode = 400;
    throw error;
  }

  return Math.round(numeric * 100);
}

export async function createRazorpayOrder({
  amount,
  currency = "INR",
  receipt,
  notes = {}
}) {
  assertPaymentGatewayConfigured();

  const response = await fetch(`${PAYMENT_GATEWAY_BASE_URL}/orders`, {
    method: "POST",
    headers: {
      Authorization: buildBasicAuthHeader(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount: toGatewayAmount(amount),
      currency: String(currency || "INR").toUpperCase(),
      receipt,
      notes
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      payload?.error?.description || payload?.message || "Failed to create Razorpay order."
    );
    error.statusCode = response.status || 502;
    throw error;
  }

  return payload;
}

export function verifyRazorpaySignature({ orderId, paymentId, signature }) {
  assertPaymentGatewayConfigured();

  const expectedSignature = crypto
    .createHmac("sha256", env.razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature);
  const providedBuffer = Buffer.from(String(signature || ""));

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

export function buildRazorpayCheckoutPayload({
  order,
  title,
  description,
  customer
}) {
  return {
    gateway: "razorpay",
    keyId: env.razorpayKeyId,
    amount: order.amount,
    currency: order.currency,
    gatewayOrderId: order.id,
    title,
    description,
    prefill: {
      name: customer?.fullName || "",
      email: customer?.email || ""
    }
  };
}
