/**
 * One-time backfill script: extracts text from existing PDF resources
 * that have an empty textContent field.
 *
 * Run on Render via: node src/scripts/backfillPdfText.js
 * Or locally: node server/src/scripts/backfillPdfText.js
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import { readSecretValue } from "../config/secretLoader.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || readSecretValue("MONGODB_URI", "");
const BATCH_SIZE = 10;
const REQUEST_DELAY_MS = 300; // be gentle with cloud storage

if (!MONGODB_URI) {
  console.error("FATAL: MONGODB_URI is not set.");
  process.exit(1);
}

// ── Inline Resource schema (avoid circular imports) ────────────────────────
const resourceSchema = new mongoose.Schema({
  fileMimeType:    { type: String, default: "" },
  fileUrl:         { type: String, default: "" },
  storageProvider: { type: String, default: "local" },
  textContent:     { type: String, default: "" },
  title:           { type: String, default: "" }
}, { strict: false, timestamps: true });

const Resource = mongoose.models.Resource || mongoose.model("Resource", resourceSchema);

// ── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function extractText(resource) {
  const { fileMimeType, fileUrl, storageProvider } = resource;

  if (fileMimeType !== "application/pdf") return "";
  if (storageProvider === "local" || !fileUrl) {
    // Local files on Render don't persist — skip gracefully
    return "";
  }

  try {
    const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");
    const buffer = await downloadBuffer(fileUrl);
    const data = await pdfParse(buffer);
    return (data?.text || "").replace(/\s+/g, " ").trim().slice(0, 20000);
  } catch (err) {
    console.warn(`  ⚠ Could not extract text for "${resource.title}": ${err.message}`);
    return "";
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to MongoDB\n");

  // Find all PDF resources with empty or missing textContent
  const total = await Resource.countDocuments({
    fileMimeType: "application/pdf",
    $or: [{ textContent: "" }, { textContent: { $exists: false } }]
  });

  console.log(`📄 Found ${total} PDF resources with no extracted text.\n`);

  if (total === 0) {
    console.log("Nothing to do. All PDFs already have text content.");
    await mongoose.disconnect();
    return;
  }

  let processed = 0;
  let updated = 0;
  let skipped = 0;

  const cursor = Resource.find({
    fileMimeType: "application/pdf",
    $or: [{ textContent: "" }, { textContent: { $exists: false } }]
  }).cursor();

  const batch = [];

  for await (const resource of cursor) {
    batch.push(resource);

    if (batch.length >= BATCH_SIZE) {
      await processBatch(batch, { updated, skipped });
      const result = await processBatch(batch);
      updated += result.updated;
      skipped += result.skipped;
      processed += batch.length;
      batch.length = 0;
      console.log(`  Progress: ${processed}/${total}\n`);
      await sleep(REQUEST_DELAY_MS);
    }
  }

  // Process remaining
  if (batch.length > 0) {
    const result = await processBatch(batch);
    updated += result.updated;
    skipped += result.skipped;
    processed += batch.length;
  }

  console.log("\n─────────────────────────────");
  console.log(`✅ Done! Processed: ${processed}, Updated: ${updated}, Skipped: ${skipped}`);
  await mongoose.disconnect();
}

async function processBatch(resources) {
  let updated = 0;
  let skipped = 0;

  await Promise.all(
    resources.map(async (resource) => {
      const text = await extractText(resource);
      if (text) {
        await Resource.updateOne({ _id: resource._id }, { $set: { textContent: text } });
        console.log(`  ✓ Extracted ${text.length} chars — "${resource.title}"`);
        updated++;
      } else {
        console.log(`  ○ Skipped (local/empty) — "${resource.title}"`);
        skipped++;
      }
    })
  );

  return { updated, skipped };
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
