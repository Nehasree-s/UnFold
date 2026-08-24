import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import Tesseract from "tesseract.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Extract text from a PDF file.
 */
export async function extractTextFromPDF(file, onProgress) {
  const arrayBuffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
  }).promise;

  let fullText = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);

    const textContent = await page.getTextContent();

    const pageText = textContent.items
      .map((item) => item.str)
      .join(" ");

    fullText += `\n\n--- Page ${pageNumber} ---\n\n`;
    fullText += pageText;

    if (onProgress) {
      onProgress(Math.round((pageNumber / pdf.numPages) * 100));
    }
  }

  return fullText.trim();
}

/**
 * Extract text from an image using Tesseract OCR.
 */
export async function extractTextFromImage(file, onProgress) {
  const result = await Tesseract.recognize(file, "eng", {
    logger: (message) => {
      if (message.status === "recognizing text" && onProgress) {
        onProgress(Math.round(message.progress * 100));
      }
    },
  });

  return result.data.text.trim();
}

/**
 * Automatically choose the correct extraction method.
 */
export async function extractText(file, onProgress) {
  if (file.type === "application/pdf") {
    return extractTextFromPDF(file, onProgress);
  }

  if (
    file.type === "image/png" ||
    file.type === "image/jpeg" ||
    file.type === "image/jpg"
  ) {
    return extractTextFromImage(file, onProgress);
  }

  throw new Error("Unsupported file type.");
}