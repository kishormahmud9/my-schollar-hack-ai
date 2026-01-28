import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { tempDB } from "./tempDatabase.js";

/* =========================
   SITE CONFIG
========================= */

const COLLEGE_SITES = {
  "scholarships.com": {
    url: "https://www.scholarships.com/scholarships",
    level: "college"
  },
  "fastweb.com": {
    url: "https://www.fastweb.com/college-scholarships",
    level: "college"
  }
};

const UNIVERSITY_SITES = {
  "daad.de": {
    url: "https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/",
    level: "university"
  },
  "mastersportal.com": {
    url: "https://www.mastersportal.com/search/scholarships/master",
    level: "university"
  },
  "iefa.org": {
    url: "https://www.iefa.org/scholarships",
    level: "university"
  }
};

/* ========================= FILTER ======================== */

function isValidTitle(title = "") {
  const t = title.toLowerCase();
  const blocked = ["directory", "database", "list", "providers"];
  if (blocked.some(b => t.includes(b))) return false;

  return (
    t.includes("$") ||
    t.includes("award") ||
    t.includes("grant") ||
    t.includes("fellowship") ||
    t.includes("fund")
  );
}

/* ========================= HELPERS ======================== */

function extractDeadline(text = "") {
  const match = text.match(/(deadline|apply by).*?\d{4}/i);
  return match ? match[0].trim() : null;
}

function extractAmount(text = "") {
  const match = text.match(/(\$|usd|eur|€|£)\s?\d+/i);
  return match ? match[0] : null;
}

function inferType(text = "") {
  const t = text.toLowerCase();
  if (t.includes("merit")) return "Merit-based";
  if (t.includes("need")) return "Need-based";
  if (t.includes("fellowship")) return "Fellowship";
  if (t.includes("grant")) return "Grant";
  return "General";
}

async function scrapeDetailPage(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return {};

    const html = await res.text();
    const $ = cheerio.load(html);
    const text = $("body").text();

    return {
      deadline: extractDeadline(text),
      amount: extractAmount(text),
      type: inferType(text)
    };
  } catch {
    return {};
  }
}

async function scrapeSiteForce(siteName, config) {
  const collected = [];
  const res = await fetch(config.url);
  const html = await res.text();
  const $ = cheerio.load(html);

  $("a").each((_, el) => {
    const title = $(el).text().trim();
    const href = $(el).attr("href");
    if (!title || !href) return;
    if (!isValidTitle(title)) return;

    const fullUrl = href.startsWith("http")
      ? href
      : new URL(href, config.url).href;

    collected.push({ title, url: fullUrl });
  });

  const results = [];
  for (const item of collected.slice(0, 20)) {
    const detail = await scrapeDetailPage(item.url);

    results.push({
      scholarshipId: Buffer.from(item.title).toString("base64").slice(0, 12),
      title: item.title,
      type: detail.type || "General",
      deadline: detail.deadline || null,
      amount: detail.amount || null,
      level: config.level,
      source: siteName
    });
  }

  return results;
}

/* ========================= MAIN ======================== */

export async function scrapeAllScholarships() {
  tempDB.college = [];
  tempDB.university = [];

  for (const [name, cfg] of Object.entries(COLLEGE_SITES)) {
    tempDB.college.push(...await scrapeSiteForce(name, cfg));
  }

  for (const [name, cfg] of Object.entries(UNIVERSITY_SITES)) {
    tempDB.university.push(...await scrapeSiteForce(name, cfg));
  }

  tempDB.college = [
    ...new Map(tempDB.college.map(s => [s.title.toLowerCase(), s])).values()
  ];
  tempDB.university = [
    ...new Map(tempDB.university.map(s => [s.title.toLowerCase(), s])).values()
  ];

  const allScholarships = [
    ...tempDB.college,
    ...tempDB.university
  ];

  return allScholarships;  
}
