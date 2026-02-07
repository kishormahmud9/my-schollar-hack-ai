import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as cheerio from "cheerio";

puppeteer.use(StealthPlugin());

/* ================= SITES ================= */
const ALL_SITES = {
  "iefa.org": "https://www.iefa.org/scholarships",
  "daad.de": "https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/",
  "mastersportal.com": "https://www.mastersportal.com/search/scholarships/master",
  "scholarshipowl-nursing": "https://scholarshipowl.com/scholarship-list/by-major/nursing-scholarships",
  "scholarshipowl-merit": "https://scholarshipowl.com/scholarship-list/by-type/merit-based-scholarships",
  "fastweb.com": "https://www.fastweb.com/college-scholarships/scholarships"
};

let browser;

/* ================= BROWSER ================= */
async function getBrowser() {
  if (browser) return browser;
  browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  return browser;
}

/* ================= FETCH HTML ================= */
async function getHTML(url) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
  );

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await new Promise(r => setTimeout(r, 2000));
    const html = await page.content();
    await page.close();
    return html;
  } catch {
    await page.close();
    return null;
  }
}

/* ================= SUBJECT DETECTION ================= */
function detectSubject(text = "") {
  const t = text.toLowerCase();

  if (t.match(/computer|software|ai|data|cyber|it|machine learning|programming/))
    return "Information Technology (IT)";

  if (t.match(/medical|health|nursing|mbbs|pharmacy|biomedical/))
    return "Medical";

  if (t.match(/engineering|mechanical|electrical|civil|robotics/))
    return "Engineering";

  if (t.match(/biology|chemistry|physics|math|science|biotech/))
    return "Science";

  if (t.match(/law|legal|policy|governance/))
    return "Law";

  if (t.match(/business|mba|management|finance|economics/))
    return "Business";

  if (t.match(/art|design|fashion|music|media|film/))
    return "Arts";

  return "General";
}

/* ================= HELPERS ================= */
function cleanText(text = "") {
  return text
    .replace(/Sponsor:.*/gi, "")
    .replace(/featured/gi, "")
    .replace(/Apply Now/gi, "")
    .replace(/Cookie.*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractAmount(text) {
  const m = text.match(/\$\s?\d{1,3}(,\d{3})*/);
  return m ? m[0] : null;
}

function extractDeadline(text) {
  const m = text.match(/\b\w+\s\d{1,2},\s\d{4}/);
  return m ? m[0] : null;
}

/* ================= LIST PAGE SCRAPER ================= */
async function scrapeSite(name, url) {
  const html = await getHTML(url);
  if (!html) return [];

  const $ = cheerio.load(html);
  const list = [];

  $("a").each((_, el) => {
    const title = $(el).text().trim();
    const href = $(el).attr("href");

    if (!title || !href) return;
    if (title.length < 15) return;
    if (/login|register|sign up|apply|business/i.test(title)) return;
    if (!/scholarship|grant|award|fellowship/i.test(title)) return;

    const fullUrl = href.startsWith("http") ? href : new URL(href, url).href;

    list.push({
      title,
      provider: name,
      subject: detectSubject(title),
      amount: null,
      deadline: null,
      description: null,
      detailUrl: fullUrl
    });
  });

  return list.slice(0, 25);
}

/* ================= DETAIL PAGE ENRICH ================= */
async function enrich(s) {
  const html = await getHTML(s.detailUrl);
  if (!html) return s;

  const $ = cheerio.load(html);
  $("script, style, nav, header, footer, noscript").remove();
  const body = $("body").text().replace(/\s+/g, " ");

  let description = "";

  if (s.provider === "iefa.org") {
    description = cleanText(
      $(".award-description, .scholarship-description, p")
        .map((_, el) => $(el).text())
        .get()
        .filter(t => t.length > 120)
        .slice(0, 2)
        .join(" ")
    );
  }

  if (s.provider === "daad.de") {
    description = cleanText(
      $(".detail-content, .content, p")
        .map((_, el) => $(el).text())
        .get()
        .filter(t => t.length > 120)
        .slice(0, 3)
        .join(" ")
    );
  }

  if (!description) {
    description = cleanText(
      $("p")
        .map((_, el) => $(el).text())
        .get()
        .filter(t => t.length > 120)
        .slice(0, 2)
        .join(" ")
    );
  }

  const fullText = s.title + " " + description;

  return {
    ...s,
    description,
    amount: extractAmount(body),
    deadline: extractDeadline(body),
    subject: detectSubject(fullText)
  };
}

/* ================= MAIN ================= */
export async function scrapeAllScholarships() {
  const tasks = Object.entries(ALL_SITES).map(([name, url]) =>
    scrapeSite(name, url)
  );

  const data = (await Promise.all(tasks)).flat();

  const unique = data.filter(
    (s, i, arr) =>
      arr.findIndex(x => x.title === s.title && x.provider === s.provider) === i
  );

  const enriched = [];
  for (const s of unique.slice(0, 40)) {
    enriched.push(await enrich(s));
  }

  return enriched;
}
