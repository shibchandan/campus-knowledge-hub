import { AiHistory } from "./aiHistory.model.js";
import { generateStructuredAnswer, verifyAiProvider } from "./ai.service.js";
import { Resource } from "../resources/resource.model.js";
import { env } from "../../config/env.js";
import { createHttpError, readEnum, readMongoId, readString } from "../../utils/requestValidation.js";

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length >= 3);
}

function scoreResource(resource, terms) {
  const haystack = [
    resource.title,
    resource.description,
    resource.textContent,
    resource.categoryId,
    resource.subjectId
  ]
    .join(" ")
    .toLowerCase();

  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

async function getRelevantResources({
  question,
  collegeName = "",
  programId = "",
  branchId = "",
  semesterId = "",
  subjectId = "",
  categoryId = "",
  limit = 5
}) {
  const filters = {};

  if (collegeName) filters.collegeName = collegeName;
  if (programId) filters.programId = programId;
  if (branchId) filters.branchId = branchId;
  if (semesterId) filters.semesterId = semesterId;
  if (subjectId) filters.subjectId = subjectId;
  if (categoryId) filters.categoryId = categoryId;

  const terms = tokenize(question);
  const resources = await Resource.find(filters)
    .sort({ createdAt: -1 })
    .limit(40)
    .lean();

  return resources
    .map((resource) => ({
      ...resource,
      _score: scoreResource(resource, terms)
    }))
    .sort((a, b) => b._score - a._score || new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}

async function saveAiHistory({
  req,
  question,
  answer,
  intent,
  sourceResources
}) {
  await AiHistory.create({
    user: req.user.id,
    provider: env.aiProvider || "",
    question,
    intent,
    answer,
    collegeName: req.body?.collegeName || req.query?.collegeName || "",
    filters: {
      programId: req.body?.programId || req.query?.programId || "",
      branchId: req.body?.branchId || req.query?.branchId || "",
      semesterId: req.body?.semesterId || req.query?.semesterId || "",
      subjectId: req.body?.subjectId || req.query?.subjectId || "",
      categoryId: req.body?.categoryId || req.query?.categoryId || ""
    },
    sourceResources: sourceResources.map((resource) => resource._id),
    usedFallback: Boolean(answer.usedFallback)
  });
}

async function buildAiResponse({
  req,
  question,
  intent = "general",
  categoryId = "",
  persist = true
}) {
  const sourceResources = await getRelevantResources({
    question,
    collegeName: req.body?.collegeName || req.query?.collegeName || "",
    programId: req.body?.programId || req.query?.programId || "",
    branchId: req.body?.branchId || req.query?.branchId || "",
    semesterId: req.body?.semesterId || req.query?.semesterId || "",
    subjectId: req.body?.subjectId || req.query?.subjectId || "",
    categoryId
  });

  const historyItems = await AiHistory.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .limit(3)
    .lean();

  const answer = await generateStructuredAnswer({
    question,
    contextResources: sourceResources,
    historyItems,
    intent
  });

  answer.contextUsed = sourceResources.map((resource) => ({
    id: resource._id,
    title: resource.title,
    categoryId: resource.categoryId,
    subjectId: resource.subjectId
  }));

  if (persist) {
    await saveAiHistory({ req, question, answer, intent, sourceResources });
  }

  return answer;
}

export async function summarizeLecture(req, res, next) {
  try {
    const lectureTopic =
      readString(req.query.question, {
        field: "question",
        min: 3,
        max: 2000,
        required: false
      }) || "Summarize the selected lecture.";
    const answer = await buildAiResponse({
      req,
      question: lectureTopic,
      intent: "lecture-summary",
      categoryId: "lecture",
      persist: true
    });
    res.json({ success: true, data: answer });
  } catch (error) {
    next(error);
  }
}

export async function generatePyqAnswer(req, res, next) {
  try {
    const prompt =
      readString(req.query.question, {
        field: "question",
        min: 3,
        max: 2000,
        required: false
      }) || "Generate PYQ-focused answers from the available study material.";
    const answer = await buildAiResponse({
      req,
      question: prompt,
      intent: "pyq-answer",
      categoryId: "pyq",
      persist: true
    });
    res.json({ success: true, data: answer });
  } catch (error) {
    next(error);
  }
}

export async function getRecommendations(req, res, next) {
  try {
    const prompt =
      readString(req.query.question, {
        field: "question",
        min: 3,
        max: 2000,
        required: false
      }) ||
      "Give personalized study recommendations using the most relevant campus resources.";
    const answer = await buildAiResponse({
      req,
      question: prompt,
      intent: "study-recommendations",
      persist: true
    });
    res.json({ success: true, data: answer });
  } catch (error) {
    next(error);
  }
}

export async function askAi(req, res, next) {
  try {
    const question = readString(req.body?.question, {
      field: "Question",
      min: 3,
      max: 2000
    });
    const intent = readEnum(req.body?.intent, {
      field: "intent",
      allowed: ["general", "lecture-summary", "pyq-answer", "study-recommendations"],
      defaultValue: "general"
    });

    const answer = await buildAiResponse({
      req,
      question,
      intent,
      persist: true
    });
    res.json({ success: true, data: answer });
  } catch (error) {
    next(error);
  }
}

export async function getAiHistory(req, res, next) {
  try {
    const history = await AiHistory.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("sourceResources", "title categoryId subjectId");

    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
}

export async function deleteAiHistoryItem(req, res, next) {
  try {
    const historyId = readMongoId(req.params.historyId, { field: "historyId" });
    const historyItem = await AiHistory.findById(historyId);

    if (!historyItem) {
      throw createHttpError("AI history entry not found.", 404);
    }

    const isOwner = String(historyItem.user) === String(req.user.id);
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      throw createHttpError("You are not allowed to delete this AI history item.", 403);
    }

    await historyItem.deleteOne();
    res.json({ success: true, message: "AI history item deleted." });
  } catch (error) {
    next(error);
  }
}

export async function clearAiHistory(req, res, next) {
  try {
    await AiHistory.deleteMany({ user: req.user.id });
    res.json({ success: true, message: "AI history cleared." });
  } catch (error) {
    next(error);
  }
}

export async function getAiStatus(_req, res, next) {
  try {
    const status = await verifyAiProvider();
    res.json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
}
