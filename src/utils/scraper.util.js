import puppeteer from "puppeteer";
import * as cheerio from "cheerio";

/* ========================= */
const ALL_SITES = {
  "iefa.org": "https://www.iefa.org/scholarships",
  "daad.de": "https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/",
  "mastersportal.com": "https://www.mastersportal.com/search/scholarships/master",
  "scholarshipowl-nursing": "https://scholarshipowl.com/scholarship-list/by-major/nursing-scholarships",
  "scholarshipowl-merit": "https://scholarshipowl.com/scholarship-list/by-type/merit-based-scholarships",
  "fastweb.com": "https://www.fastweb.com/college-scholarships/scholarships"
};

/* ========================= */
async function getHTML(url) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 Chrome/120");
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    return await page.content();
  } catch {
    console.log("SCRAPE FAIL:", url);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

/* ========================= */
function detectSubject(text = "") {
  const t = text.toLowerCase();
  if (t.match(/nursing|medical|health|mbbs|pharmacy/)) return "Medical";
  if (t.match(/computer|software|ai|data|cyber|it|information/)) return "Information Technology (IT)";
  if (t.match(/biology|chemistry|physics|math|science|biotech/)) return "Science";
  return "General";
}

function extractAmount(text) {
  const m = text.match(/\$\s?\d{1,3}(,\d{3})*/);
  if (!m) return null;
  const val = parseInt(m[0].replace(/\D/g, ""));
  if (val < 200) return null;
  return m[0];
}

function extractDeadline(text) {
  const m = text.match(/\b\w+\s\d{1,2},\s\d{4}/);
  return m ? m[0] : null;
}

/* ========================= */
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

    if (!title || title.length < 15) return;
    if (/^scholarships?$|award name/i.test(title)) return;
    if (fullUrl === url) return;
    if (!/scholarship|award|grant|fellowship/i.test(title)) return;

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

  return list.slice(0, 60);
}

/* ========================= */
async function enrich(s) {
  try {
    const html = await getHTML(s.detailUrl);
    if (!html) return s;

    const $ = cheerio.load(html);
    $("script, style, nav, header, footer, noscript").remove();

    const bodyText = $("body").text().replace(/\s+/g, " ");
    let amount = null;
    let deadline = null;
    let description = "";

    /* ========== IEF A ========== */
    if (s.provider === "iefa.org") {
      $("li, div, span").each((_, el) => {
        const t = $(el).text();
        if (/award amount|value of award|scholarship value/i.test(t)) amount = extractAmount(t);
        if (/deadline|apply by/i.test(t)) deadline = extractDeadline(t);
      });

      description = $(".award-description, .scholarship-description, p")
        .map((_, el) => $(el).text().trim())
        .get()
        .filter(t => t.length > 120)
        .slice(0, 2)
        .join(" ");
    }

    /* ========== DAAD (CLEAN) ========== */
    if (s.provider === "daad.de") {
      const sections = [];

      $("h2, h3").each((_, el) => {
        const heading = $(el).text().trim().toLowerCase();

        if (heading.includes("objective") ||
            heading.includes("funded") ||
            heading.includes("duration") ||
            heading.includes("value") ||
            heading.includes("selection")) {

          const content = $(el).nextUntil("h2, h3")
            .text()
            .replace(/\s+/g, " ")
            .trim();

          if (content.length > 120) sections.push(content);
        }
      });

      description = sections.slice(0, 2).join(" ");

      const eur = bodyText.match(/\d{3,4}\s?EUR/i);
      if (eur) amount = eur[0];

      deadline = extractDeadline(bodyText);
    }

    /* ========== FASTWEB ========== */
    if (s.provider === "fastweb.com") {
      description = $("p")
        .map((_, el) => $(el).text().trim())
        .get()
        .filter(t => t.length > 100)
        .slice(0, 2)
        .join(" ");
    }

    /* ========== FALLBACK ========== */
    if (!amount) amount = extractAmount(bodyText);
    if (!deadline) deadline = extractDeadline(bodyText);

    return {
      ...s,
      subject: detectSubject(description || s.title),
      amount,
      deadline,
      description
    };

  } catch {
    return s;
  }
}

/* ========================= */
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
  for (let s of unique.slice(0, 40)) {
    enriched.push(await enrich(s));
  }

  return enriched;
}
