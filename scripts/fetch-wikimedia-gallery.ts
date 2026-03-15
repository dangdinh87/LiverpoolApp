/**
 * Fetch real Liverpool FC images from Wikimedia Commons API.
 * Builds gallery.json with verified URLs.
 *
 * Usage: npx tsx scripts/fetch-wikimedia-gallery.ts
 */

interface WikiImage {
  title: string;
  thumburl: string;
  url: string;
  width: number;
  height: number;
  mime: string;
}

interface GalleryEntry {
  id: string;
  src: string;
  alt: string;
  category: string;
  is_homepage_eligible: boolean;
}

// Wikimedia categories to query, mapped to gallery categories
const WIKI_CATEGORIES: { wiki: string; gallery: string; limit: number }[] = [
  // --- Anfield stadium ---
  { wiki: "Category:Anfield (stadium)", gallery: "anfield", limit: 30 },
  { wiki: "Category:Interior of Anfield (stadium)", gallery: "anfield", limit: 15 },
  { wiki: "Category:Exterior of Anfield (stadium)", gallery: "anfield", limit: 15 },
  { wiki: "Category:Panoramics of Anfield (stadium)", gallery: "anfield", limit: 10 },
  { wiki: "Category:Main Stand at Anfield stadium", gallery: "anfield", limit: 8 },
  { wiki: "Category:Shankly Gates", gallery: "anfield", limit: 5 },
  { wiki: "Category:Bill Shankly statue at Anfield", gallery: "anfield", limit: 5 },
  { wiki: "Category:Bob Paisley statue at Anfield", gallery: "anfield", limit: 5 },
  { wiki: "Category:Paisley Gateway", gallery: "anfield", limit: 5 },
  { wiki: "Category:Anfield Road Stand", gallery: "anfield", limit: 8 },
  { wiki: "Category:The Kop at Anfield", gallery: "anfield", limit: 8 },
  { wiki: "Category:Anfield Road", gallery: "anfield", limit: 5 },

  // --- Current squad players ---
  { wiki: "Category:Mohamed Salah", gallery: "squad", limit: 10 },
  { wiki: "Category:Virgil van Dijk", gallery: "squad", limit: 8 },
  { wiki: "Category:Trent Alexander-Arnold", gallery: "squad", limit: 8 },
  { wiki: "Category:Alisson Becker", gallery: "squad", limit: 8 },
  { wiki: "Category:Luis Díaz", gallery: "squad", limit: 5 },
  { wiki: "Category:Cody Gakpo", gallery: "squad", limit: 5 },
  { wiki: "Category:Dominik Szoboszlai", gallery: "squad", limit: 5 },
  { wiki: "Category:Alexis Mac Allister", gallery: "squad", limit: 5 },
  { wiki: "Category:Ryan Gravenberch", gallery: "squad", limit: 5 },
  { wiki: "Category:Conor Bradley", gallery: "squad", limit: 5 },
  { wiki: "Category:Darwin Núñez", gallery: "squad", limit: 5 },
  { wiki: "Category:Diogo Jota", gallery: "squad", limit: 5 },
  { wiki: "Category:Andy Robertson", gallery: "squad", limit: 5 },
  { wiki: "Category:Ibrahima Konaté", gallery: "squad", limit: 5 },
  { wiki: "Category:Curtis Jones", gallery: "squad", limit: 4 },
  { wiki: "Category:Joe Gomez", gallery: "squad", limit: 4 },
  { wiki: "Category:Wataru Endō", gallery: "squad", limit: 4 },
  { wiki: "Category:Harvey Elliott", gallery: "squad", limit: 4 },
  { wiki: "Category:Jarell Quansah", gallery: "squad", limit: 3 },
  { wiki: "Category:Caoimhín Kelleher", gallery: "squad", limit: 3 },
  { wiki: "Category:Arne Slot", gallery: "squad", limit: 8 },

  // --- Legends ---
  { wiki: "Category:Steven Gerrard", gallery: "legends", limit: 12 },
  { wiki: "Category:Kenny Dalglish", gallery: "legends", limit: 8 },
  { wiki: "Category:Jürgen Klopp", gallery: "legends", limit: 12 },
  { wiki: "Category:Xabi Alonso", gallery: "legends", limit: 5 },
  { wiki: "Category:Fernando Torres", gallery: "legends", limit: 5 },
  { wiki: "Category:Luis Suárez", gallery: "legends", limit: 5 },
  { wiki: "Category:Sadio Mané", gallery: "legends", limit: 5 },
  { wiki: "Category:Roberto Firmino", gallery: "legends", limit: 5 },
  { wiki: "Category:Coaches of Liverpool FC", gallery: "legends", limit: 10 },
  { wiki: "Category:Michael Owen", gallery: "legends", limit: 5 },
  { wiki: "Category:Robbie Fowler", gallery: "legends", limit: 5 },
  { wiki: "Category:Jamie Carragher", gallery: "legends", limit: 5 },
  { wiki: "Category:Ian Rush", gallery: "legends", limit: 5 },
  { wiki: "Category:John Barnes (footballer)", gallery: "legends", limit: 5 },
  { wiki: "Category:Philippe Coutinho", gallery: "legends", limit: 5 },
  { wiki: "Category:Daniel Sturridge", gallery: "legends", limit: 4 },
  { wiki: "Category:Raheem Sterling", gallery: "legends", limit: 4 },
  { wiki: "Category:Pepe Reina", gallery: "legends", limit: 4 },
  { wiki: "Category:Dirk Kuyt", gallery: "legends", limit: 4 },
  { wiki: "Category:Rafael Benítez", gallery: "legends", limit: 5 },

  // --- Trophies & celebrations ---
  { wiki: "Category:2019 Liverpool F.C. Champions League victory parade", gallery: "trophies", limit: 15 },
  { wiki: "Category:2022 Liverpool F.C. trophy parade", gallery: "trophies", limit: 15 },
  { wiki: "Category:Celebrations of Liverpool F.C.", gallery: "trophies", limit: 10 },
  { wiki: "Category:2005 UEFA Champions League final", gallery: "trophies", limit: 15 },
  { wiki: "Category:2019 UEFA Champions League final", gallery: "trophies", limit: 10 },
  { wiki: "Category:2019 UEFA Super Cup", gallery: "trophies", limit: 8 },
  { wiki: "Category:2019 FIFA Club World Cup final", gallery: "trophies", limit: 8 },
  { wiki: "Category:2022 FA Cup final", gallery: "trophies", limit: 8 },
  { wiki: "Category:2022 EFL Cup final", gallery: "trophies", limit: 8 },
  { wiki: "Category:Premier League trophies", gallery: "trophies", limit: 5 },
  { wiki: "Category:UEFA Champions League trophies", gallery: "trophies", limit: 5 },

  // --- Fans ---
  { wiki: "Category:Supporters of Liverpool FC", gallery: "fans", limit: 20 },
  { wiki: "Category:The Kop sign, Anfield", gallery: "fans", limit: 5 },
  { wiki: "Category:Liverpool FC supporters", gallery: "fans", limit: 15 },
  { wiki: "Category:Flags of Liverpool FC", gallery: "fans", limit: 10 },
  { wiki: "Category:Scarves of Liverpool FC", gallery: "fans", limit: 5 },
  { wiki: "Category:You'll Never Walk Alone", gallery: "fans", limit: 10 },
  { wiki: "Category:Murals of Liverpool FC", gallery: "fans", limit: 8 },
  { wiki: "Category:Graffiti of Liverpool FC", gallery: "fans", limit: 5 },

  // --- Matches ---
  { wiki: "Category:Matches of Liverpool FC", gallery: "matches", limit: 15 },
  { wiki: "Category:Matches at Anfield stadium", gallery: "matches", limit: 15 },
  { wiki: "Category:Liverpool FC in European football", gallery: "matches", limit: 10 },
  { wiki: "Category:2023-24 Liverpool F.C. season", gallery: "matches", limit: 10 },
  { wiki: "Category:2022-23 Liverpool F.C. season", gallery: "matches", limit: 10 },
  { wiki: "Category:2021-22 Liverpool F.C. season", gallery: "matches", limit: 10 },
  { wiki: "Category:2019-20 Liverpool F.C. season", gallery: "matches", limit: 10 },
  { wiki: "Category:2018-19 Liverpool F.C. season", gallery: "matches", limit: 10 },
  { wiki: "Category:Liverpool FC pre-season", gallery: "matches", limit: 8 },
  { wiki: "Category:Liverpool FC in friendlies", gallery: "matches", limit: 8 },

  // --- History ---
  { wiki: "Category:History of Liverpool FC", gallery: "history", limit: 15 },
  { wiki: "Category:Hillsborough memorial, Anfield", gallery: "history", limit: 10 },
  { wiki: "Category:Heysel Stadium disaster", gallery: "history", limit: 5 },
  { wiki: "Category:Kits of Liverpool FC", gallery: "history", limit: 10 },
  { wiki: "Category:Liverpool FC museum", gallery: "history", limit: 5 },
  { wiki: "Category:Hillsborough disaster", gallery: "history", limit: 10 },
  { wiki: "Category:Melwood", gallery: "history", limit: 5 },
  { wiki: "Category:AXA Training Centre", gallery: "history", limit: 8 },
  { wiki: "Category:Liverpool FC in the 2000s", gallery: "history", limit: 8 },
  { wiki: "Category:Liverpool FC in the 2010s", gallery: "history", limit: 8 },
  { wiki: "Category:Liverpool FC badge", gallery: "history", limit: 5 },
  { wiki: "Category:Liverpool FC merchandise", gallery: "history", limit: 5 },
];

// Exclusion patterns for non-relevant images
const EXCLUDE_PATTERNS = [
  /amazon/i, /locker/i, /logo\.svg/i, /icon/i,
  /flag.*\.svg/i, /map/i, /route/i, /diagram/i,
  /\.ogg$/i, /\.webm$/i, /\.pdf$/i, /\.svg$/i,
];

async function fetchCategoryImages(
  wikiCategory: string,
  limit: number,
): Promise<WikiImage[]> {
  const images: WikiImage[] = [];
  let continueToken = "";

  while (images.length < limit) {
    const batchLimit = Math.min(limit - images.length, 50);
    let url = `https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=${encodeURIComponent(wikiCategory)}&gcmtype=file&gcmlimit=${batchLimit}&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=1600&format=json`;

    if (continueToken) {
      url += `&gcmcontinue=${encodeURIComponent(continueToken)}`;
    }

    const resp = await fetch(url);
    const data = await resp.json();

    if (!data.query?.pages) break;

    for (const page of Object.values(data.query.pages) as Record<string, unknown>[]) {
      const info = (page.imageinfo as Record<string, unknown>[])?.[0];
      if (!info) continue;

      const mime = info.mime as string;
      if (!mime?.startsWith("image/")) continue;

      const title = page.title as string;
      if (EXCLUDE_PATTERNS.some((p) => p.test(title))) continue;

      const width = info.width as number;
      if (width < 600) continue; // Skip small images

      images.push({
        title,
        thumburl: (info.thumburl as string) || (info.url as string),
        url: info.url as string,
        width: info.width as number,
        height: info.height as number,
        mime,
      });

      if (images.length >= limit) break;
    }

    if (!data.continue?.gcmcontinue) break;
    continueToken = data.continue.gcmcontinue;
  }

  return images;
}

function makeId(title: string, category: string, index: number): string {
  // Extract filename from "File:Some Image Name.jpg"
  const name = title
    .replace(/^File:/, "")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 50);
  return `${category}-${name || index}`;
}

function makeAlt(title: string): string {
  return title
    .replace(/^File:/, "")
    .replace(/\.[^.]+$/, "")
    .replace(/_/g, " ")
    .replace(/\s*\(\d+\)\s*$/, "") // Remove trailing numbers like (1234)
    .trim();
}

async function main() {
  const allEntries: GalleryEntry[] = [];
  const seenUrls = new Set<string>();
  const seenIds = new Set<string>();

  console.log("Fetching images from Wikimedia Commons...\n");

  for (const cat of WIKI_CATEGORIES) {
    console.log(`  📂 ${cat.wiki} → ${cat.gallery} (max ${cat.limit})`);
    try {
      const images = await fetchCategoryImages(cat.wiki, cat.limit);
      let added = 0;

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (seenUrls.has(img.url)) continue;
        seenUrls.add(img.url);

        let id = makeId(img.title, cat.gallery, i);
        // Ensure unique id
        if (seenIds.has(id)) {
          id = `${id}-${i}`;
        }
        seenIds.add(id);

        const isLandscape = img.width / img.height >= 1.4;
        const isLargeEnough = img.width >= 1000;

        allEntries.push({
          id,
          src: img.thumburl,
          alt: makeAlt(img.title),
          category: cat.gallery,
          is_homepage_eligible: isLandscape && isLargeEnough && ["anfield", "fans", "matches"].includes(cat.gallery),
        });
        added++;
      }

      console.log(`     Found ${images.length}, added ${added} (total: ${allEntries.length})`);
    } catch (err) {
      console.log(`     ⚠️ Error: ${err}`);
    }

    // Rate limiting
    await new Promise((r) => setTimeout(r, 200));
  }

  // Category summary
  const byCat: Record<string, number> = {};
  for (const e of allEntries) {
    byCat[e.category] = (byCat[e.category] || 0) + 1;
  }

  console.log(`\n📊 Summary: ${allEntries.length} images`);
  for (const [cat, count] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${cat}: ${count}`);
  }

  const homepageCount = allEntries.filter((e) => e.is_homepage_eligible).length;
  console.log(`   homepage eligible: ${homepageCount}`);

  // Write to gallery.json
  const fs = await import("fs");
  const path = await import("path");
  const outPath = path.join(process.cwd(), "src/data/gallery.json");
  fs.writeFileSync(outPath, JSON.stringify(allEntries, null, 2) + "\n");
  console.log(`\n✅ Written to ${outPath}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
