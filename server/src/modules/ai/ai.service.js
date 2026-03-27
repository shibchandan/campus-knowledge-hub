import { env } from "../../config/env.js";

function buildSystemPrompt({ intent = "general", contextSummary = "", historySummary = "" }) {
  return [
    "You are an academic assistant for college students.",
    "Prefer the supplied campus resources over general knowledge when relevant.",
    `Current task intent: ${intent}.`,
    contextSummary ? `Campus resource context:\n${contextSummary}` : "No campus resource context was found.",
    historySummary ? `Recent conversation summary:\n${historySummary}` : "No prior conversation context.",
    "Answer clearly and categorically.",
    "Return strict JSON with keys:",
    "title (string),",
    "summary (string),",
    "categories (array of objects with heading and points array),",
    "nextSteps (array of strings),",
    "confidence (one of: high, medium, low),",
    "sources (array of short source labels).",
    "If the campus sources are weak, say so briefly in the summary."
  ].join(" ");
}

function parseAiJson(rawText) {
  try {
    const start = rawText.indexOf("{");
    const end = rawText.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    return JSON.parse(rawText.slice(start, end + 1));
  } catch {
    return null;
  }
}

function normalizeAnswer(answer, { question, sources = [], debug = "", fallback = false }) {
  return {
    title: answer?.title || "Study Assistant Response",
    summary:
      answer?.summary ||
      "Here is a structured study response based on the available academic resources.",
    categories: Array.isArray(answer?.categories) ? answer.categories : [],
    nextSteps: Array.isArray(answer?.nextSteps) ? answer.nextSteps : [],
    confidence: answer?.confidence || (fallback ? "low" : "medium"),
    sources: Array.isArray(answer?.sources) && answer.sources.length ? answer.sources : sources,
    debug,
    usedFallback: fallback,
    question
  };
}

function fallbackAnswer(question, sources = [], reason = "") {
  return normalizeAnswer(
    {
      title: "Study Assistant Response",
      summary:
        "AI provider is not configured or unavailable. Here is a structured fallback answer guided by the uploaded campus content when available.",
      categories: [
        {
          heading: "Question Interpretation",
          points: [
            `Focus area: ${question || "General academic guidance"}`,
            "Break the topic into definitions, concepts, and examples."
          ]
        },
        {
          heading: "How To Study",
          points: [
            "Read class notes first, then standard books.",
            "Solve PYQs and mark repeated patterns.",
            "Prepare short revision bullets for exam day."
          ]
        }
      ],
      nextSteps: [
        "Revise one unit at a time.",
        "Practice 2-3 previous year questions.",
        "Ask follow-up doubts for weak topics."
      ],
      confidence: "low",
      sources
    },
    { question, sources, debug: reason || "No provider error details available.", fallback: true }
  );
}

async function callOpenAI(question, prompt) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.openAiApiKey}`
    },
    body: JSON.stringify({
      model: env.openAiModel,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: question }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API request failed: ${response.status}`);
  }

  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content || "";
  return parseAiJson(text);
}

async function callGemini(question, prompt) {
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent` +
    `?key=${encodeURIComponent(env.geminiApiKey)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: `${prompt}\n\nUser question: ${question}` }]
        }
      ],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API request failed: ${response.status}`);
  }

  const payload = await response.json();
  const text =
    payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n") || "";

  return parseAiJson(text);
}

async function callAnthropic(question, prompt) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.anthropicApiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: env.anthropicModel,
      max_tokens: 900,
      temperature: 0.3,
      system: prompt,
      messages: [{ role: "user", content: question }]
    })
  });

  if (!response.ok) {
    throw new Error(`Anthropic API request failed: ${response.status}`);
  }

  const payload = await response.json();
  const text = payload?.content?.map((block) => block.text || "").join("\n") || "";
  return parseAiJson(text);
}

export function summarizeHistory(historyItems = []) {
  return historyItems
    .slice(0, 3)
    .map((item, index) => `Q${index + 1}: ${item.question}\nA${index + 1}: ${item.answer?.summary || ""}`)
    .join("\n\n");
}

export function summarizeContextResources(resources = []) {
  return resources
    .slice(0, 5)
    .map((resource, index) => {
      const snippet =
        resource.textContent?.slice(0, 700) ||
        resource.description?.slice(0, 300) ||
        resource.title;

      return [
        `Source ${index + 1}: ${resource.title}`,
        `Category: ${resource.categoryId}`,
        `Academic path: ${resource.programId} / ${resource.branchId} / ${resource.semesterId} / ${resource.subjectId}`,
        `Snippet: ${snippet}`
      ].join("\n");
    })
    .join("\n\n");
}

function providerConfigStatus() {
  return {
    provider: env.aiProvider || "",
    model:
      env.aiProvider === "openai"
        ? env.openAiModel
        : env.aiProvider === "gemini"
          ? env.geminiModel
          : env.aiProvider === "anthropic"
            ? env.anthropicModel
            : "",
    configured:
      (env.aiProvider === "openai" && Boolean(env.openAiApiKey)) ||
      (env.aiProvider === "gemini" && Boolean(env.geminiApiKey)) ||
      (env.aiProvider === "anthropic" && Boolean(env.anthropicApiKey))
  };
}

export async function verifyAiProvider() {
  const status = providerConfigStatus();

  if (!status.provider) {
    return { ...status, verified: false, message: "AI_PROVIDER is not set." };
  }

  if (!status.configured) {
    return { ...status, verified: false, message: "Provider key is missing for the selected AI provider." };
  }

  try {
    const prompt = buildSystemPrompt({ intent: "provider-verification" });
    const question = "Return a tiny JSON response confirming the provider is reachable.";

    let result = null;
    if (status.provider === "openai") {
      result = await callOpenAI(question, prompt);
    } else if (status.provider === "gemini") {
      result = await callGemini(question, prompt);
    } else if (status.provider === "anthropic") {
      result = await callAnthropic(question, prompt);
    }

    if (!result) {
      return { ...status, verified: false, message: "Provider responded but JSON parsing failed." };
    }

    return { ...status, verified: true, message: "Provider verified successfully." };
  } catch (error) {
    return { ...status, verified: false, message: error.message };
  }
}

export async function generateStructuredAnswer({
  question,
  contextResources = [],
  historyItems = [],
  intent = "general"
}) {
  const trimmedQuestion = question?.trim();
  if (!trimmedQuestion) {
    throw new Error("Question is required.");
  }

  const provider = env.aiProvider;
  const sourceLabels = contextResources.map((resource) => `${resource.categoryId}: ${resource.title}`);
  const prompt = buildSystemPrompt({
    intent,
    contextSummary: summarizeContextResources(contextResources),
    historySummary: summarizeHistory(historyItems)
  });

  try {
    let rawAnswer = null;

    if (provider === "openai" && env.openAiApiKey) {
      rawAnswer = await callOpenAI(trimmedQuestion, prompt);
    } else if (provider === "gemini" && env.geminiApiKey) {
      rawAnswer = await callGemini(trimmedQuestion, prompt);
    } else if (provider === "anthropic" && env.anthropicApiKey) {
      rawAnswer = await callAnthropic(trimmedQuestion, prompt);
    }

    if (rawAnswer) {
      return normalizeAnswer(rawAnswer, { question: trimmedQuestion, sources: sourceLabels });
    }
  } catch (error) {
    return fallbackAnswer(
      trimmedQuestion,
      sourceLabels,
      `${provider || "unknown"} provider error: ${error.message}`
    );
  }

  const reason = [
    `AI_PROVIDER=${provider || "(empty)"}`,
    `OPENAI_API_KEY=${env.openAiApiKey ? "set" : "missing"}`,
    `GEMINI_API_KEY=${env.geminiApiKey ? "set" : "missing"}`,
    `ANTHROPIC_API_KEY=${env.anthropicApiKey ? "set" : "missing"}`
  ].join(" | ");

  return fallbackAnswer(trimmedQuestion, sourceLabels, `Provider not matched/configured. ${reason}`);
}
