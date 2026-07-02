import * as cheerio from "cheerio";

export interface ScrapedCoffee {
  name?: string;
  roaster?: string;
  origin?: string;
  region?: string;
  process?: string;
  variety?: string;
  roast_level?: string;
  tasting_notes?: string;
  image_url?: string;
}

function clean(s: string | undefined | null): string | undefined {
  const t = s?.replace(/\s+/g, " ").trim();
  return t || undefined;
}

function isProse(val: string) {
  return /^(this |the |a |an )/i.test(val) || val.length > 80;
}

// ── Strategy 1: JSON-LD schema.org Product ────────────────────────────────────
function fromJsonLd($: cheerio.CheerioAPI, labels: string[]): string | undefined {
  let found: string | undefined;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (found) return;
    try {
      const data = JSON.parse($(el).text());
      const products: unknown[] = Array.isArray(data) ? data : [data];
      for (const item of products) {
        if (!item || typeof item !== "object") continue;
        const obj = item as Record<string, unknown>;
        if (obj["@type"] !== "Product") continue;
        // additionalProperty array
        const props = obj["additionalProperty"];
        if (Array.isArray(props)) {
          for (const prop of props) {
            if (!prop || typeof prop !== "object") continue;
            const p = prop as Record<string, unknown>;
            const pName = String(p.name ?? "").toLowerCase();
            if (labels.some((l) => pName.includes(l.toLowerCase()))) {
              const val = clean(String(p.value ?? ""));
              if (val && !isProse(val)) { found = val; return false; }
            }
          }
        }
      }
    } catch { /* ignore parse errors */ }
  });
  return found;
}

// ── Strategy 2: dt → dd ───────────────────────────────────────────────────────
function findDtDd($: cheerio.CheerioAPI, labels: string[]): string | undefined {
  for (const label of labels) {
    const re = new RegExp(label, "i");
    const dt = $("dt").filter((_, el) => re.test($(el).text()));
    if (dt.length) {
      const val = clean(dt.first().next("dd").text());
      if (val && !isProse(val)) return val;
    }
  }
}

// ── Strategy 3: table rows (th/td or td/td) ──────────────────────────────────
function findTableRow($: cheerio.CheerioAPI, labels: string[]): string | undefined {
  for (const label of labels) {
    const re = new RegExp(label, "i");
    let found: string | undefined;
    $("tr").each((_, tr) => {
      const cells = $(tr).find("th, td");
      if (cells.length >= 2 && re.test(cells.first().text())) {
        const val = clean(cells.eq(1).text());
        if (val && !isProse(val)) { found = val; return false; }
      }
    });
    if (found) return found;
  }
}

// ── Strategy 4: [data-label] and [aria-label] attributes ─────────────────────
function findDataLabel($: cheerio.CheerioAPI, labels: string[]): string | undefined {
  for (const label of labels) {
    const re = new RegExp(label, "i");
    let found: string | undefined;
    $("[data-label], [aria-label]").each((_, el) => {
      const attr = $(el).attr("data-label") ?? $(el).attr("aria-label") ?? "";
      if (re.test(attr)) {
        const val = clean($(el).text());
        if (val && !isProse(val)) { found = val; return false; }
      }
    });
    if (found) return found;
  }
}

// ── Strategy 5: adjacent sibling elements ────────────────────────────────────
function findAdjacent($: cheerio.CheerioAPI, labels: string[]): string | undefined {
  for (const label of labels) {
    const re = new RegExp(`^\\s*${label}\\s*:?\\s*$`, "i");
    let found: string | undefined;
    $("td, li, div, span, p, h4, h5, strong, b").each((_, el) => {
      if (re.test($(el).text().trim())) {
        // Try next sibling first, then parent's next sibling
        let val = clean($(el).next().text());
        if (!val || isProse(val)) val = clean($(el).parent().next().text());
        if (val && !isProse(val)) { found = val; return false; }
      }
    });
    if (found) return found;
  }
}

// ── Strategy 6: label: value on same line in body text ───────────────────────
function extractFromText(text: string, labels: string[]): string | undefined {
  for (const label of labels) {
    const re = new RegExp(`(?:^|\\n)\\s*${label}\\s*[:\\n]\\s*([^\\n]{2,60})`, "im");
    const m = text.match(re);
    if (m) {
      const val = m[1].trim().replace(/^[:–-]\s*/, "");
      if (val && !isProse(val) && !val.toLowerCase().startsWith(label.toLowerCase())) {
        return val;
      }
    }
  }
}

function findField($: cheerio.CheerioAPI, bodyText: string, labels: string[]): string | undefined {
  return (
    fromJsonLd($, labels) ||
    findDtDd($, labels) ||
    findTableRow($, labels) ||
    findDataLabel($, labels) ||
    findAdjacent($, labels) ||
    extractFromText(bodyText, labels)
  );
}

export async function scrapeCoffeePage(url: string): Promise<ScrapedCoffee> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!res.ok) throw new Error(`Failed to fetch page: ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  // ── Name & Roaster ─────────────────────────────────────────────────────────
  const ogTitle = $('meta[property="og:title"]').attr("content") ||
    $('meta[name="og:title"]').attr("content");
  const ogSiteName = $('meta[property="og:site_name"]').attr("content");

  let name: string | undefined;
  let roaster: string | undefined;

  if (ogTitle) {
    const parts = ogTitle.split(/\s*[-|–]\s*/);
    name = clean(parts[0]);
    if (parts.length > 1 && !ogSiteName) roaster = clean(parts[parts.length - 1]);
  }
  if (ogSiteName) roaster = clean(ogSiteName);

  // ── Image ──────────────────────────────────────────────────────────────────
  let imageUrl =
    $('meta[property="og:image"]').attr("content") ||
    $('meta[property="og:image:url"]').attr("content") ||
    $('meta[name="twitter:image"]').attr("content");

  if (!imageUrl) {
    imageUrl = $("img[class*='product'], img[class*='coffee'], .product img, .woocommerce-product-gallery img")
      .first().attr("src");
  }
  if (imageUrl) {
    try { imageUrl = new URL(imageUrl, url).toString(); }
    catch { imageUrl = undefined; }
  }

  // Strip nav/footer/header for name fallback and body text
  $("nav, footer, script, style, header").remove();
  if (!name) name = clean($("h1").first().text());

  const bodyText = $("body").text().replace(/\t/g, " ");

  // ── Structured fields ──────────────────────────────────────────────────────
  const PROCESS_LABELS = ["process", "post.harvest process", "processing method", "processing"];
  const ORIGIN_LABELS  = ["origin", "country", "farm", "estate", "growing region", "producer"];
  const REGION_LABELS  = ["region", "area", "district", "zone"];
  const VARIETY_LABELS = ["variety", "varietal", "cultivar", "species"];
  const ROAST_LABELS   = ["roast level", "roast profile", "roast"];
  const TASTING_LABELS = ["tasting notes", "flavour notes", "flavor notes", "cup profile", "cupping notes", "notes"];

  return {
    name,
    roaster,
    origin:        findField($, bodyText, ORIGIN_LABELS),
    region:        findField($, bodyText, REGION_LABELS),
    process:       findField($, bodyText, PROCESS_LABELS),
    variety:       findField($, bodyText, VARIETY_LABELS),
    roast_level:   findField($, bodyText, ROAST_LABELS),
    tasting_notes: findField($, bodyText, TASTING_LABELS),
    image_url:     imageUrl,
  };
}
