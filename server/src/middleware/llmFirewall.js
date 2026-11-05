import { createHttpError } from "../utils/requestValidation.js";

// ── MITRE ATLAS AML.T0051 / AML.T0054 — LLM Prompt Injection Defense ────────
// Covers: jailbreaks, system-prompt extraction, role confusion, indirect injection
const MALICIOUS_PATTERNS = [
  // Jailbreak personas (AML.T0054.003)
  /\b(dan|do anything now|unrestricted ai|developer mode|jailbreak)\b/i,
  /\b(ignore all previous instructions|disregard previous instructions|forget previous instructions)\b/i,
  /\b(ignore the above|ignore your previous|override your instructions)\b/i,
  // System prompt extraction (AML.T0054.001)
  /\b(what are your instructions|repeat the prompt|what is your system prompt|print your instructions)\b/i,
  /\b(tell me your rules|how were you trained|who programmed you|show me your prompt)\b/i,
  /\b(output your initialization|reveal your context|dump your system message)\b/i,
  // Role confusion / persona hijacking (AML.T0054.002)
  /\b(you are no longer an academic assistant|stop acting like an assistant)\b/i,
  /\b(from now on you are|you are now|pretend to be|act as|roleplay as)\b/i,
  /\b(your new persona is|your true self is|your real purpose is)\b/i,
  // OS / code execution attempts (MITRE T1059)
  /\b(execute this code|run this command|os\.system|child_process\.exec|eval\(|exec\()\b/i,
  // Indirect prompt injection via content (AML.T0051)
  /\b(hypothetically speaking|in a fictional world|for a story|imagine you have no restrictions)\b/i,
  /\b(pretend you are free|act as if you are unconstrained|simulate an ai with no limits)\b/i,
  // Token smuggling / encoding tricks
  /(%00|\\u0000|\\x00|\u0000)/i,
  // Data exfiltration via crafted prompts (AML.T0057)
  /\b(send this to|post this to|forward this to|upload this to)\b.*http/i,
];

// ── Max question length guard (prevents context flooding) ────────────────────
const MAX_QUESTION_LENGTH = 2000;

export function llmFirewall(req, res, next) {
  const question = (req.query?.question || req.body?.question || "").toString().trim();

  if (!question) {
    return next();
  }

  // Block oversized questions (context flooding / token exhaustion attack)
  if (question.length > MAX_QUESTION_LENGTH) {
    return next(
      createHttpError(
        400,
        `Question too long. Please keep your question under ${MAX_QUESTION_LENGTH} characters.`
      )
    );
  }

  // Scan against prompt injection blocklist
  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.test(question)) {
      console.warn(
        `[LLM FIREWALL BLOCKED] User ${req.user?.id || "Unknown"} | Pattern: ${pattern} | Query: "${question.slice(0, 100)}..."`
      );
      return next(
        createHttpError(
          400,
          "Security Violation: Your prompt has been flagged by the LLM Firewall. Please ask standard academic questions."
        )
      );
    }
  }

  next();
}
