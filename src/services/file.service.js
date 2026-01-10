import fs from "fs";
import path from "path";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import mammoth from "mammoth";

export async function readDocument(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  switch (ext) {
    case ".pdf":
      return readPDF(filePath);
    case ".txt":
      return fs.readFileSync(filePath, "utf8").trim();
    case ".docx":
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value.trim();
    default:
      throw new Error("Unsupported file type");
  }
}

async function readPDF(filePath) {
  const data = new Uint8Array(fs.readFileSync(filePath));
  const pdf = await pdfjs.getDocument({ data }).promise;

  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(i => i.str).join(" ") + "\n";
  }
  return text.trim();
}
