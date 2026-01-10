import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { tempDB } from "./tempDatabase.js";

const COLLEGE_SITES = [
  "https://www.scholarships.com/scholarships",
  "https://www.fastweb.com/college-scholarships"
];

const UNIVERSITY_SITES = [
  "https://www.daad.de/stipdb-redirect/",
  "https://www.mastersportal.com/search/scholarships/master",
  "https://www.iefa.org/"
];

function isValidTitle(title) {
  const t = title.toLowerCase();
  return t.includes("scholarship") && t.length > 20;
}

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

    list.push({
      scholarshipId: Buffer.from(title).toString("base64").slice(0, 12),
      title,
      type: "General",
      expiryDate: null,
      level
    });
  });

  return list;
}

export async function scrapeAllScholarships() {
  tempDB.college = [];
  tempDB.university = [];

  for (const s of COLLEGE_SITES) {
    tempDB.college.push(...await scrapeSite(s, "college"));
  }

  for (const s of UNIVERSITY_SITES) {
    tempDB.university.push(...await scrapeSite(s, "university"));
  }

  tempDB.college = [
    ...new Map(tempDB.college.map(s => [s.title.toLowerCase(), s])).values()
  ];

  tempDB.university = [
    ...new Map(tempDB.university.map(s => [s.title.toLowerCase(), s])).values()
  ];

  console.log("College scholarships:", tempDB.college.length);
  console.log("University scholarships:", tempDB.university.length);
}
