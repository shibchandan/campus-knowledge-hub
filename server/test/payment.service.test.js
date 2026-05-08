import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import {
  buildRazorpayCheckoutPayload,
  isPaymentGatewayConfigured,
  toGatewayAmount,
  verifyRazorpaySignature
} from "../src/services/payment.service.js";
import { env } from "../src/config/env.js";

test("toGatewayAmount converts rupees into paise", () => {
  assert.equal(toGatewayAmount(499), 49900);
  assert.equal(toGatewayAmount("199.99"), 19999);
});

test("toGatewayAmount rejects zero or invalid values", () => {
  assert.throws(() => toGatewayAmount(0), /greater than zero/);
  assert.throws(() => toGatewayAmount("bad"), /greater than zero/);
});

test("payment gateway configuration flag reacts to env credentials", () => {
  const previousKeyId = env.razorpayKeyId;
  const previousKeySecret = env.razorpayKeySecret;

  env.razorpayKeyId = "";
  env.razorpayKeySecret = "";
  assert.equal(isPaymentGatewayConfigured(), false);

  env.razorpayKeyId = "rzp_test_123";
  env.razorpayKeySecret = "secret_123";
  assert.equal(isPaymentGatewayConfigured(), true);

  env.razorpayKeyId = previousKeyId;
  env.razorpayKeySecret = previousKeySecret;
});

test("verifyRazorpaySignature accepts valid signatures and rejects bad ones", () => {
  const previousKeyId = env.razorpayKeyId;
  const previousKeySecret = env.razorpayKeySecret;
  env.razorpayKeyId = "rzp_test_123";
  env.razorpayKeySecret = "secret_123";

  const orderId = "order_123456";
  const paymentId = "pay_654321";
  const validSignature = crypto
    .createHmac("sha256", env.razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  assert.equal(
    verifyRazorpaySignature({
      orderId,
      paymentId,
      signature: validSignature
    }),
    true
  );

  assert.equal(
    verifyRazorpaySignature({
      orderId,
      paymentId,
      signature: "bad-signature"
    }),
    false
  );

  env.razorpayKeyId = previousKeyId;
  env.razorpayKeySecret = previousKeySecret;
});

test("buildRazorpayCheckoutPayload creates frontend checkout object", () => {
  const previousKeyId = env.razorpayKeyId;
  env.razorpayKeyId = "rzp_test_123";

  const payload = buildRazorpayCheckoutPayload({
    order: {
      id: "order_123",
      amount: 49900,
      currency: "INR"
    },
    title: "DBMS Masterclass",
    description: "Marketplace course purchase",
    customer: {
      fullName: "Shib Chandan",
      email: "student@example.com"
    }
  });

  assert.equal(payload.gateway, "razorpay");
  assert.equal(payload.keyId, "rzp_test_123");
  assert.equal(payload.gatewayOrderId, "order_123");
  assert.equal(payload.prefill.email, "student@example.com");

  env.razorpayKeyId = previousKeyId;
});
