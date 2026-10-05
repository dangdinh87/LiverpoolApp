/**
 * Rebuild `src/data/squad.json` and the local headshot/body-shot assets from
 * liverpoolfc.com.
 *
 * The squad data was a one-off snapshot: photos pointed at the 2025-26 headshot
 * folder while the site already showed the 2026/27 season, and the roster still
 * listed players who have since left. This script re-reads the official squad
 * page so both go back in sync, and is safe to re-run whenever the squad changes.
 *
 * Usage:
 *   npx tsx scripts/refresh-squad-from-lfc.ts           # write changes
 *   npx tsx scripts/refresh-squad-from-lfc.ts --dry-run # report only
 *
 * Local filenames are preserved for players already in squad.json, so committed
 * asset paths stay stable; new players get a slug-derived filename.
 */
import { writeFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const SITE = "https://www.liverpoolfc.com";
const SQUAD_URL = `${SITE}/teams/mens-team`;
const SQUAD_JSON = path.join(process.cwd(), "src/data/squad.json");
const ASSET_DIR = path.join(process.cwd(), "public/assets/lfc/players");
const ASSET_URL_PREFIX = "/assets/lfc/players";
// Honest UA: the site blocks some spoofed browser user agents.
const USER_AGENT = "LiverpoolApp/1.0";
// Contentful Images API: ask for webp so files match their .webp names.
const PHOTO_PARAMS = "?fm=webp&w=800&q=80";
const BODY_PARAMS = "?fm=webp&w=1200&q=80";
// Listed on the squad page as a tribute, not an active player.
const EXCLUDED_SLUGS = new Set(["diogo-jota"]);

const DRY_RUN = process.argv.includes("--dry-run");

/** One player card on the squad page (RSC payload). */
interface LfcCard {
  name: string;
  slug: string;
  shirtNumber: number | null;
  position: string; // lower-cased: goalkeeper | defender | midfielder | forward | head coach
  onLoan: boolean;
  photo?: string; // profile image, no size params
  bodyShot?: string; // "action shot" hover image, no size params
}

/** Extra data from an individual profile page (only fetched for new players). */
interface LfcProfile {
  id?: number;
  nationality?: string;
  dateOfBirth?: string;
  bio?: string;
}

interface SquadPlayer {
  id: number;
  name: string;
  shirtNumber: number | null;
  shirtName?: string;
  slug: string;
  position: string;
  nationality?: string;
  dateOfBirth?: string;
  height?: string;
  weight?: string;
  bio?: string;
  metaDescription?: string;
  honors?: unknown;
  onLoan: boolean;
  forever: boolean;
  photo?: string;
  photoLg?: string;
  bodyShot?: string;
  localPhoto: string;
  localBodyShot?: string;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.text();
}

/**
 * The site is an RSC page: all data arrives as `self.__next_f.push([1, "..."])`
 * chunks. Joining the string chunks gives the flight payload.
 */
function flightPayload(html: string): string {
  const re = /self\.__next_f\.push\((\[[\s\S]*?\])\)<\/script>/g;
  let out = "";
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const chunk = JSON.parse(m[1]);
      if (typeof chunk[1] === "string") out += chunk[1];
    } catch {
      // not a data chunk
    }
  }
  if (!out) throw new Error("RSC payload not found — page structure changed");
  return out;
}

/** Strip Contentful size params so we can request our own. */
const baseUrl = (url: string) => url.split("?")[0];

/** Pull every player card (name, number, slug, position, images) from the payload. */
function parseCards(payload: string): LfcCard[] {
  const cardEnd =
    /"onLoan":(true|false),"isHomegrown":\w+,"nationality":"[^"]*","squadNumber":"?([^",]*)"?,"firstName":"?([^",]*)"?,"surname":"([^"]*)","knownAs":("[^"]*"|\$undefined),"url":"(\/teams\/mens-team\/([^"]+))","position":"([^"]*)"/g;
  const cards = new Map<string, LfcCard>();
  let prevEnd = 0;
  let m: RegExpExecArray | null;
  while ((m = cardEnd.exec(payload))) {
    // Images sit just before the card's scalar fields.
    const segment = payload.slice(prevEnd, m.index);
    prevEnd = cardEnd.lastIndex;
    let photo: string | undefined;
    let bodyShot: string | undefined;
    const img = /"url":"(https:\/\/images\.ctfassets\.net[^"]+)"[\s\S]*?"alt":"([^"]*)"/g;
    let im: RegExpExecArray | null;
    while ((im = img.exec(segment))) {
      const alt = im[2].toLowerCase();
      if (alt.includes("action shot")) bodyShot = baseUrl(im[1]);
      // Most cards say "<name> profile"; some are named "<name> 2026-27 v2".
      else if (alt.endsWith("profile") || !photo) photo = baseUrl(im[1]);
    }
    const slug = m[7];
    const number = Number.parseInt(m[2], 10);
    cards.set(slug, {
      name: `${m[3].trim()} ${m[4].trim()}`.trim(),
      slug,
      shirtNumber: Number.isFinite(number) ? number : null,
      position: m[8].trim().toLowerCase(),
      onLoan: m[1] === "true",
      photo,
      bodyShot,
    });
  }
  if (cards.size === 0) throw new Error("no player cards found — page structure changed");
  return [...cards.values()];
}

/** DOB / nationality / id / bio from a profile page; every field is best-effort. */
async function fetchProfile(slug: string): Promise<LfcProfile> {
  const html = await fetchText(`${SITE}/teams/mens-team/${slug}`);
  const profile: LfcProfile = {};

  const ld = html.match(
    /<script type="application\/ld\+json" id="profile-schema"[^>]*>([\s\S]*?)<\/script>/
  );
  if (ld) {
    try {
      const data = JSON.parse(ld[1]);
      profile.dateOfBirth = data.birthDate;
      profile.nationality = data.nationality?.name;
    } catch {
      // keep going without JSON-LD
    }
  }

  const payload = flightPayload(html);
  const pid = payload.match(/"playerId":"(\d+)"/);
  if (pid) profile.id = Number(pid[1]);

  // Bio ships as a text chunk `<id>:T<hex byte length>,<text>` ahead of the profile body.
  const textChunk = /(?:^|\n)[0-9a-f]+:T([0-9a-f]+),/g;
  let t: RegExpExecArray | null;
  while ((t = textChunk.exec(payload))) {
    const bytes = Buffer.from(payload.slice(textChunk.lastIndex), "utf8");
    const text = bytes.subarray(0, Number.parseInt(t[1], 16)).toString("utf8").trim();
    if (text.includes("\n\n") && !text.startsWith("{")) {
      profile.bio = text
        .split(/\n\s*\n/)
        .map((para) => `<p>${para.trim()}</p>`)
        .join("");
      break;
    }
  }
  return profile;
}

/** Deterministic fallback id when a profile exposes no numeric id. */
function fallbackId(slug: string): number {
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) % 1_000_000;
  return 9_000_000 + h;
}

const PLAYER_POSITIONS = new Set(["goalkeeper", "defender", "midfielder", "forward"]);

async function download(url: string, destination: string): Promise<boolean> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    console.warn(`  ! ${res.status} ${path.basename(destination)}`);
    return false;
  }
  if (!(res.headers.get("content-type") ?? "").startsWith("image/")) {
    console.warn(`  ! not an image: ${path.basename(destination)}`);
    return false;
  }
  const body = Buffer.from(await res.arrayBuffer());
  if (!DRY_RUN) await writeFile(destination, body);
  return true;
}

async function main() {
  console.log(DRY_RUN ? "Dry run — nothing will be written.\n" : "");

  const cards = parseCards(flightPayload(await fetchText(SQUAD_URL)));
  const headCoach = cards.find((c) => c.position === "head coach");
  const lfcPlayers = cards.filter(
    (c) => PLAYER_POSITIONS.has(c.position) && !EXCLUDED_SLUGS.has(c.slug)
  );
  console.log(
    `liverpoolfc.com first-team: ${lfcPlayers.length} players ` +
      `(+${cards.length - lfcPlayers.length} staff/excluded ignored)`
  );
  if (headCoach) console.log(`Head coach: ${headCoach.name}`);

  const existing = JSON.parse(await readFile(SQUAD_JSON, "utf8"));
  const existingPlayers: SquadPlayer[] = existing.players ?? [];
  const existingBySlug = new Map(existingPlayers.map((p) => [p.slug, p]));
  const lfcSlugs = new Set(lfcPlayers.map((p) => p.slug));

  const departed = existingPlayers.filter((p) => !lfcSlugs.has(p.slug));
  const arrived = lfcPlayers.filter((p) => !existingBySlug.has(p.slug));
  if (departed.length) {
    console.log(`\nNo longer in the squad (${departed.length}):`);
    for (const p of departed) console.log(`  - ${p.name}`);
  }
  if (arrived.length) {
    console.log(`\nNew to the squad (${arrived.length}):`);
    for (const p of arrived) console.log(`  + ${p.name} (#${p.shirtNumber ?? "-"})`);
  }

  if (!DRY_RUN) await mkdir(ASSET_DIR, { recursive: true });

  console.log("\nDownloading images…");
  const players: SquadPlayer[] = [];
  const usedIds = new Set(existingPlayers.map((p) => p.id));

  for (const card of lfcPlayers) {
    const previous = existingBySlug.get(card.slug);
    const profile: LfcProfile = previous ? {} : await fetchProfile(card.slug);

    // Keep the committed filename when we already have one, so asset paths in
    // git (and any external references) do not churn on every refresh.
    // `||`, not `??`: a stored folder path ("/assets/lfc/players/") pops to "".
    const headshotFile =
      previous?.localPhoto?.split("/").pop() || `${card.slug}.webp`;
    const bodyFile =
      previous?.localBodyShot?.split("/").pop() || `${card.slug}-body.webp`;

    const photo = card.photo ? card.photo + PHOTO_PARAMS : undefined;
    const bodyShot = card.bodyShot ? card.bodyShot + BODY_PARAMS : undefined;
    const gotPhoto = photo
      ? await download(photo, path.join(ASSET_DIR, headshotFile))
      : false;
    const gotBody = bodyShot
      ? await download(bodyShot, path.join(ASSET_DIR, bodyFile))
      : false;

    const hasHeadshot = gotPhoto || existsSync(path.join(ASSET_DIR, headshotFile));
    const hasBody = gotBody || existsSync(path.join(ASSET_DIR, bodyFile));

    let id = previous?.id ?? profile.id ?? fallbackId(card.slug);
    if (!previous && usedIds.has(id)) id = fallbackId(card.slug);
    usedIds.add(id);

    // Existing values win unless the page has newer data (shirt, position, loan,
    // images); never blank a field the page does not carry.
    const base: SquadPlayer = previous ?? {
      id,
      name: card.name,
      shirtNumber: card.shirtNumber,
      shirtName: "",
      slug: card.slug,
      position: card.position,
      nationality: profile.nationality ?? "",
      dateOfBirth: profile.dateOfBirth ?? "",
      height: "",
      weight: "",
      bio: profile.bio ?? "",
      metaDescription: "",
      honors: [],
      onLoan: false,
      forever: false,
      localPhoto: "",
    };
    players.push({
      ...base,
      id: base.id,
      shirtNumber: card.shirtNumber ?? base.shirtNumber,
      position: card.position,
      onLoan: card.onLoan,
      photo: photo ?? base.photo,
      photoLg: photo ?? base.photoLg,
      bodyShot: bodyShot ?? base.bodyShot,
      localPhoto: hasHeadshot ? `${ASSET_URL_PREFIX}/${headshotFile}` : base.localPhoto,
      localBodyShot: hasBody ? `${ASSET_URL_PREFIX}/${bodyFile}` : undefined,
    });
    console.log(`  ${card.name}${previous ? "" : " (new)"}`);
  }

  players.sort((a, b) => (a.shirtNumber ?? 999) - (b.shirtNumber ?? 999));

  const keepCoach = existing.coach && headCoach && existing.coach.slug === headCoach.slug;
  const output = {
    ...existing,
    lastUpdated: new Date().toISOString().slice(0, 10),
    source: "liverpoolfc.com",
    // Coach: keep the stored entry while the head coach is unchanged; a new coach
    // gets the basics from the card (nationality/description not on the list page).
    ...(headCoach && !keepCoach
      ? {
          coach: {
            id: fallbackId(headCoach.slug),
            name: headCoach.name,
            slug: headCoach.slug,
            nationality: "",
            photo: headCoach.photo ? headCoach.photo + PHOTO_PARAMS : "",
            metaDescription: "",
          },
        }
      : {}),
    players,
  };

  if (DRY_RUN) {
    console.log(`\nWould write ${players.length} players to squad.json.`);
    return;
  }

  await writeFile(SQUAD_JSON, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`\nWrote ${players.length} players to src/data/squad.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
