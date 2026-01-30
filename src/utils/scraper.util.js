import puppeteer from "puppeteer";
import * as cheerio from "cheerio";

/* =========================
   SITES
========================= */
const ALL_SITES = {
  "fastweb.com": "https://www.fastweb.com/college-scholarships",
  "iefa.org": "https://www.iefa.org/scholarships",
  "daad.de": "https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/",
  "mastersportal.com": "https://www.mastersportal.com/search/scholarships/master",
  "scholarshipowl-nursing": "https://scholarshipowl.com/scholarship-list/by-major/nursing-scholarships",
  "scholarshipowl-merit": "https://scholarshipowl.com/scholarship-list/by-type/merit-based-scholarships"
};

/* =========================
   BROWSER FETCH
========================= */
async function getHTML(url) {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await new Promise(r => setTimeout(r, 3000));

    const html = await page.content();
    await browser.close();
    return html;
  } catch {
    return null;
  }
}

/* =========================
   VALID LINK FILTER
========================= */
function isValidScholarshipLink(title, url) {
  if (!title || title.length < 10) return false;

  const badTitles = [
    "find scholarships",
    "featured scholarships",
    "scholarships",
    "directory",
    "login",
    "register"
  ];

  if (badTitles.some(t => title.toLowerCase().includes(t))) return false;

  const badDomains = [
    "doubleclick",
    "adnxs",
    "gampad",
    "clktrb",
    "pubads"
  ];

  if (badDomains.some(d => url.includes(d))) return false;

  return /scholarship|award|grant|fellowship/i.test(title);
}

/* =========================
   SUBJECT DETECTION
========================= */
function detectSubject(text = "") {
  const t = text.toLowerCase();

  if (t.match(/nursing|medical|health|mbbs|pharmacy/)) return "Medical";
  if (t.match(/computer|software|ai|data|cyber|it|information/)) return "Information Technology (IT)";
  if (t.match(/biology|chemistry|physics|math|science|biotech/)) return "Science";

  return "General";
}

/* =========================
   SCRAPE LIST PAGE
========================= */
async function scrapeSite(name, url) {
  const html = await getHTML(url);
  if (!html) return [];

  const $ = cheerio.load(html);
  const list = [];

  $("a").each((_, el) => {
    const title = $(el).text().trim();
    const href = $(el).attr("href");
    if (!href) return;

    const fullUrl = href.startsWith("http") ? href : new URL(href, url).href;

    if (!isValidScholarshipLink(title, fullUrl)) return;

    list.push({
      title,
      subject: "General",
      provider: name,
      amount: null,
      description: null,
      deadline: null,
      detailUrl: fullUrl
    });
  });

  return list.slice(0, 30);
}

/* =========================
   DETAIL ENRICH
========================= */
async function enrich(s) {
  try {
    const html = await getHTML(s.detailUrl);
    if (!html) return s;

    const $ = cheerio.load(html);
    $("script, style, noscript, header, footer, nav").remove();

    const description = $("p")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(t => t.length > 100)
      .slice(0, 2)
      .join(" ");

    const clean = $.text().replace(/\s+/g, " ");
    const amount = clean.match(/\$\s?\d{1,3}(,\d{3})*/)?.[0] || null;
    const deadline = clean.match(/(deadline|apply by)[^0-9]{0,10}(\w+\s\d{1,2},?\s?\d{4})/i)?.[2] || null;

    return {
      ...s,
      subject: detectSubject(description || s.title),
      amount,
      deadline,
      description: description || null
    };
  } catch {
    return s;
  }
}

/* =========================
   MAIN SCRAPER
========================= */
export async function scrapeAllScholarships() {
  const tasks = Object.entries(ALL_SITES).map(([name, url]) =>
    scrapeSite(name, url)
  );

  const data = (await Promise.all(tasks)).flat();

  const unique = data.filter(
    (s, i, arr) =>
      s.title &&
      arr.findIndex(x => x.title === s.title && x.provider === s.provider) === i
  );

  const enriched = [];
  for (let s of unique.slice(0, 20)) {
    enriched.push(await enrich(s));
  }

  return enriched;
}
