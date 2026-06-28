import fs from "fs";
import path from "path";

/**
 * Extracts plain text from a PDF file using pdf-parse.
 * Returns an empty string for non-PDF files or on any error.
 *
 * @param {object|undefined} file - Multer file object (req.file)
 * @returns {Promise<string>} Extracted text, max 20000 chars
 */
export async function extractTextFromFile(file) {
  if (!file) return "";

  const mime = file.mimetype || "";
  const isPdf = mime === "application/pdf";

  if (!isPdf) return "";

  try {
    // Dynamically import pdf-parse to avoid issues with ESM/CJS interop
    const { default: pdfParse } = await import("pdf-parse/lib/pdf-parse.js");

    const fileBuffer = fs.readFileSync(file.path);
    const data = await pdfParse(fileBuffer);

    const text = (data?.text || "")
      .replace(/\s+/g, " ")   // collapse whitespace
      .trim()
      .slice(0, 20000);        // cap at 20k chars to avoid bloating MongoDB

    return text;
  } catch (error) {
    // Non-fatal — log the error but don't block the upload
    console.warn(`[pdfExtract] Failed to extract text from ${file.originalname}: ${error.message}`);
    return "";
  }
}
