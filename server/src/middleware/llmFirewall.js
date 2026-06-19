import { createHttpError } from "../utils/requestValidation.js";

// A collection of regex patterns to catch common prompt injection, jailbreak, and system extraction attempts.
const MALICIOUS_PATTERNS = [
  // Jailbreak personas
  /\b(dan|do anything now|unrestricted ai|developer mode)\b/i,
  /\b(ignore all previous instructions|disregard previous instructions|forget previous instructions)\b/i,
  // System prompt extraction
  /\b(what are your instructions|repeat the prompt|what is your system prompt|print your instructions)\b/i,
  /\b(tell me your rules|how were you trained|who programmed you)\b/i,
  // Bypassing academic scope
  /\b(you are no longer an academic assistant|stop acting like an assistant)\b/i,
  // Attempting to execute raw code or OS commands
  /\b(execute this code|run this command|os\.system|child_process\.exec)\b/i,
  // Forced hypotheticals commonly used for jailbreaks
  /\b(hypothetically|pretend you are|act as if you are free)\b/i
];

export function llmFirewall(req, res, next) {
  // Extract question from either query (GET) or body (POST)
  const question = (req.query?.question || req.body?.question || "").toString().trim();

  if (!question) {
    return next(); // Empty questions will be caught by the controller's validation
  }

  // Scan the question against our blocklist
  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.test(question)) {
      console.warn(`[LLM FIREWALL BLOCKED] User ${req.user?.id || 'Unknown'} attempted malicious query: "${question}"`);
      return next(
        createHttpError(
          400,
          "Security Violation: Your prompt has been flagged by the LLM Firewall for attempting unauthorized instructions. Please ask standard academic questions."
        )
      );
    }
  }

  // If clean, proceed to the AI controller
  next();
}
