import fetch from "node-fetch";
import * as cheerio from "cheerio";

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
   SAFE FETCH
========================= */
function safeFetch(url, maxWait = 20000) {
  return Promise.race([
    fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } }),
    new Promise(resolve => setTimeout(() => resolve(null), maxWait))
  ]);
}

/* =========================
   TITLE FILTER
========================= */
function isValidTitle(title = "") {
  const t = title.toLowerCase().trim();

  const blocked = [
    "find scholarships", "featured scholarships", "scholarship news",
    "providers", "directory", "builder", "list",
    "login", "sign in", "register", "menu"
  ];

  if (blocked.some(b => t.includes(b))) return false;

  return (
    /\$\d+/.test(t) ||
    t.includes("scholarship") ||
    t.includes("award") ||
    t.includes("grant") ||
    t.includes("fellowship")
  );
}

/* =========================
   BUILD BASE OBJECT
========================= */
function buildScholarship(title, level, source, detailUrl) {
  return {
    scholarshipId: Buffer.from(title).toString("base64").slice(0, 12),
    title,
    type: "General",
    deadline: null,
    amount: null,
    level,
    source,
    detailUrl
  };
}

/* =========================
   SCRAPE LISTING PAGE
========================= */
async function scrapeSite(siteName, config) {
  const res = await safeFetch(config.url);
  if (!res) return [];

  const html = await res.text();
  const $ = cheerio.load(html);
  const results = [];

  $("a").each((_, el) => {
    const title = $(el).text().trim();
    const href = $(el).attr("href");

    if (!title || !href) return;
    if (title.length < 8 || title.length > 120) return;
    if (!isValidTitle(title)) return;

    const fullUrl = href.startsWith("http")
      ? href
      : new URL(href, config.url).href;

    results.push(buildScholarship(title, config.level, siteName, fullUrl));
  });

  return results.slice(0, 20);
}

/* =========================
   DETAIL PAGE ENRICHMENT
========================= */
async function enrichScholarship(s) {
  try {
    const res = await safeFetch(s.detailUrl, 15000);
    if (!res) return s;

    const html = await res.text();
    const clean = html.replace(/\s+/g, " ");

    const amountMatch = clean.match(/\$\s?\d{1,3}(,\d{3})*/);
    const deadlineMatch = clean.match(
      /(deadline|apply by|closing date)[^0-9]{0,10}(\w+\s\d{1,2},?\s?\d{4})/i
    );

    return {
      ...s,
      amount: amountMatch ? amountMatch[0] : null,
      deadline: deadlineMatch ? deadlineMatch[2] : null
    };
  } catch {
    return s;
  }
}

/* =========================
   MAIN SCRAPER
========================= */
export async function scrapeAllScholarships() {
  const allSites = { ...COLLEGE_SITES, ...UNIVERSITY_SITES };

  const tasks = Object.entries(allSites).map(([name, cfg]) =>
    scrapeSite(name, cfg)
  );

  const data = await Promise.allSettled(tasks);

  let scholarships = data
    .filter(r => r.status === "fulfilled")
    .flatMap(r => r.value);

  // Remove duplicates
  scholarships = [
    ...new Map(scholarships.map(s => [s.title.toLowerCase(), s])).values()
  ];

  // Enrich with detail page data
  const enriched = await Promise.allSettled(
    scholarships.slice(0, 15).map(enrichScholarship)
  );

  return enriched
    .filter(r => r.status === "fulfilled")
    .map(r => r.value);
}
