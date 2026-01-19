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

/* =========================
   VALID TITLE FILTER (YOURS)
========================= */

function isValidTitle(title = "") {
  const t = title.toLowerCase();

  const blocked = [
    "find scholarships",
    "featured scholarships",
    "scholarship news",
    "scholarship winners",
    "directory",
    "database",
    "list",
    "providers"
  ];
  if (blocked.some(b => t.includes(b))) return false;

  return (
    t.includes("$") ||
    t.includes("€") ||
    t.includes("£") ||
    t.includes("award") ||
    t.includes("grant") ||
    t.includes("fellowship") ||
    t.includes("fund") ||
    t.includes("stipend")
  );
}

/* =========================
   EXTRACTION HELPERS
========================= */

function extractDeadline(text = "") {
  const match = text.match(
    /(deadline|apply by|closing date)[^a-z0-9]{0,10}.*?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}/i
  );
  return match ? match[0].trim() : null;
}

function extractAmount(text = "") {
  const match = text.match(
    /(\$|usd|eur|€|£)\s?\d{1,3}(?:,\d{3})*(?:\.\d+)?/i
  );
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

/* =========================
   FORCE FETCH
========================= */

async function forceFetch(url) {
  return fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120",
      "Accept-Language": "en-US,en;q=0.9"
    }
  });
}

/* =========================
   DETAIL PAGE SCRAPER
========================= */

async function scrapeDetailPage(url) {
  try {
    const res = await forceFetch(url);
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

/* =========================
   FORCE SITE SCRAPER
========================= */

async function scrapeSiteForce(siteName, config) {
  console.log(`\n🔍 FORCE SCRAPING: ${siteName}`);

  const collected = [];

  try {
    const res = await forceFetch(config.url);
    if (!res.ok) {
      console.log(`❌ ${siteName} blocked (${res.status})`);
      return [];
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    $("a").each((_, el) => {
      const title = $(el).text().trim();
      const href = $(el).attr("href");

      if (!title || !href) return;
      if (!isValidTitle(title)) return;

      let fullUrl = href.startsWith("http")
        ? href
        : new URL(href, config.url).href;

      collected.push({
        title,
        url: fullUrl
      });
    });

    console.log(`🔗 ${siteName}: found ${collected.length} candidate links`);

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

    console.log(`✅ ${siteName}: scraped ${results.length} scholarships`);
    return results;
  } catch (err) {
    console.log(`❌ ${siteName} error: ${err.message}`);
    return [];
  }
}

/* =========================
   MASTER SCRAPER
========================= */

export async function scrapeAllScholarships() {
  tempDB.college = [];
  tempDB.university = [];

  console.log("\n===== COLLEGE =====");
  for (const [name, cfg] of Object.entries(COLLEGE_SITES)) {
    tempDB.college.push(...await scrapeSiteForce(name, cfg));
  }

  console.log("\n===== UNIVERSITY =====");
  for (const [name, cfg] of Object.entries(UNIVERSITY_SITES)) {
    tempDB.university.push(...await scrapeSiteForce(name, cfg));
  }

  // Deduplicate
  tempDB.college = [
    ...new Map(tempDB.college.map(s => [s.title.toLowerCase(), s])).values()
  ];
  tempDB.university = [
    ...new Map(tempDB.university.map(s => [s.title.toLowerCase(), s])).values()
  ];

  console.log("\n===== SUMMARY =====");
  console.log("College:", tempDB.college.length);
  console.log("University:", tempDB.university.length);
}
