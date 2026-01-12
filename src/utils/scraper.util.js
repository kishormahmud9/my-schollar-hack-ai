import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { tempDB } from "./tempDatabase.js";

/* -----------------------------
   SOURCE LISTS (UNCHANGED)
------------------------------ */

const COLLEGE_SITES = [
  "https://www.scholarships.com/financial-aid/college-scholarships/scholarship-directory",
  "https://www.fastweb.com/college-scholarships/featured-scholarships"
];

const UNIVERSITY_SITES = [
  "https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/",
  "https://www.mastersportal.com/search/scholarships/master",
  "https://www.iefa.org/scholarships"
];

/* -----------------------------
   HELPERS (ONLY ADDITIVE)
------------------------------ */

function isValidTitle(title = "") {
  const t = title.toLowerCase();
  return t.includes("scholarship") && t.length > 20;
}

/* 🔹 FIX: deadline extractor (was missing) */
function extractDeadline(text = "") {
  const match = text.match(
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}/i
  );
  return match ? match[0] : null;
}

/* 🔹 ADD: amount extractor */
function extractAmount(text = "") {
  const match = text.match(
    /(\$|usd|eur|€|£)\s?\d{1,3}(?:,\d{3})*(?:\.\d+)?/i
  );
  return match ? match[0] : null;
}

/* 🔹 ADD: dynamic type inference */
function inferType(text = "") {
  const t = text.toLowerCase();

  if (t.includes("merit")) return "Merit-based";
  if (t.includes("need")) return "Need-based";
  if (t.includes("fellowship")) return "Fellowship";
  if (t.includes("grant")) return "Grant";

  return "General"; // fallback only
}

/* -----------------------------
   CORE SCRAPER (UNCHANGED FLOW)
------------------------------ */

async function scrapeSite(url, level) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });

  if (!res.ok) return [];

  const $ = cheerio.load(await res.text());
  const list = [];

  $("a").each((_, el) => {
    const title = $(el).text().trim();
    if (!isValidTitle(title)) return;

    const contextText =
      $(el).closest("li, div, tr").text() || $(el).parent().text();

    const deadline = extractDeadline(contextText);
    const amount = extractAmount(contextText);
    const type = inferType(contextText);

    list.push({
      scholarshipId: Buffer.from(title).toString("base64").slice(0, 12),
      title,
      type,          // now dynamic
      deadline,      // real date or null
      amount,        // real amount or null
      level
    });
  });

  return list;
}

/* -----------------------------
   STARTUP SCRAPER (UNCHANGED)
------------------------------ */

export async function scrapeAllScholarships() {
  tempDB.college = [];
  tempDB.university = [];

  for (const s of COLLEGE_SITES) {
    tempDB.college.push(...await scrapeSite(s, "college"));
  }

  for (const s of UNIVERSITY_SITES) {
    tempDB.university.push(...await scrapeSite(s, "university"));
  }

  // Deduplicate by title
  tempDB.college = [
    ...new Map(tempDB.college.map(s => [s.title.toLowerCase(), s])).values()
  ];

  tempDB.university = [
    ...new Map(tempDB.university.map(s => [s.title.toLowerCase(), s])).values()
  ];

  console.log("College scholarships:", tempDB.college.length);
  console.log("University scholarships:", tempDB.university.length);
}
