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

const SQUAD_URL = "https://www.liverpoolfc.com/team/mens";
const SQUAD_JSON = path.join(process.cwd(), "src/data/squad.json");
const ASSET_DIR = path.join(process.cwd(), "public/assets/lfc/players");
const ASSET_URL_PREFIX = "/assets/lfc/players";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const DRY_RUN = process.argv.includes("--dry-run");

interface ImageSize {
  url?: string;
  webpUrl?: string;
  width?: number;
  height?: number;
}
interface LfcImage {
  sizes?: Record<string, ImageSize>;
}
interface LfcPlayer {
  id: number;
  name: string;
  slug: string;
  shirtNumber?: number | null;
  shirtName?: string;
  position?: { type?: string; displayName?: string } | string;
  nationality?: string;
  dateOfBirth?: string;
  height?: string;
  weight?: string;
  bio?: string;
  metaDescription?: string;
  honors?: unknown;
  onLoan?: boolean;
  forever?: boolean;
  profileImage?: LfcImage;
  bodyShot?: LfcImage;
  propositions?: { team?: string };
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

/** Read the Next.js payload the squad page embeds; it holds the full player list. */
async function fetchLfcPlayers(): Promise<LfcPlayer[]> {
  const res = await fetch(SQUAD_URL, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`LFC squad page returned ${res.status}`);

  const html = await res.text();
  // [\s\S] rather than the /s flag: tsconfig targets below es2018.
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  );
  if (!match) throw new Error("__NEXT_DATA__ not found — page structure changed");

  const data = JSON.parse(match[1]);
  const players = data?.props?.pageProps?.players;
  if (!Array.isArray(players)) throw new Error("players[] not found in page data");
  return players;
}

/** Largest available rendition, preferring webp. */
function pickImage(image: LfcImage | undefined): string | undefined {
  const sizes = image?.sizes;
  if (!sizes) return undefined;
  for (const key of ["xl", "lg", "md", "sm", "xs"]) {
    const size = sizes[key];
    if (size?.webpUrl) return size.webpUrl;
    if (size?.url) return size.url;
  }
  return undefined;
}

function positionOf(player: LfcPlayer): string {
  const position = player.position;
  if (typeof position === "string") return position;
  return position?.type ?? "unknown";
}

/** The squad page mixes casings ("first-team" / "First-Team") and academy entries. */
function isFirstTeam(player: LfcPlayer): boolean {
  return (player.propositions?.team ?? "").toLowerCase() === "first-team";
}

const PLAYER_POSITIONS = new Set(["goalkeeper", "defender", "midfielder", "forward"]);

/**
 * The first-team list also carries coaching and medical staff — head coach,
 * physios, doctors — all marked `position.type === "staff"`. Only the four
 * playing positions belong in the squad.
 */
function isPlayer(player: LfcPlayer): boolean {
  return PLAYER_POSITIONS.has(positionOf(player));
}

function isHeadCoach(player: LfcPlayer): boolean {
  const position = player.position;
  if (typeof position === "string") return false;
  return (position?.displayName ?? "").toLowerCase() === "head coach";
}

async function download(url: string, destination: string): Promise<boolean> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    console.warn(`  ! ${res.status} ${path.basename(destination)}`);
    return false;
  }
  const body = Buffer.from(await res.arrayBuffer());
  if (!DRY_RUN) await writeFile(destination, body);
  return true;
}

async function main() {
  console.log(DRY_RUN ? "Dry run — nothing will be written.\n" : "");

  const firstTeam = (await fetchLfcPlayers()).filter(isFirstTeam);
  const lfcPlayers = firstTeam.filter(isPlayer);
  const headCoach = firstTeam.find(isHeadCoach);
  console.log(
    `liverpoolfc.com first-team: ${lfcPlayers.length} players ` +
      `(+${firstTeam.length - lfcPlayers.length} staff ignored)`
  );
  if (headCoach) console.log(`Head coach: ${headCoach.name}`);

  const existing = JSON.parse(await readFile(SQUAD_JSON, "utf8"));
  const existingPlayers: SquadPlayer[] = existing.players ?? [];
  const existingById = new Map(existingPlayers.map((p) => [p.id, p]));
  const lfcIds = new Set(lfcPlayers.map((p) => p.id));

  const departed = existingPlayers.filter((p) => !lfcIds.has(p.id));
  const arrived = lfcPlayers.filter((p) => !existingById.has(p.id));
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

  for (const player of lfcPlayers) {
    const previous = existingById.get(player.id);
    const photo = pickImage(player.profileImage);
    const bodyShot = pickImage(player.bodyShot);

    // Keep the committed filename when we already have one, so asset paths in
    // git (and any external references) do not churn on every refresh.
    const headshotFile =
      previous?.localPhoto?.split("/").pop() ?? `${player.slug}.webp`;
    const bodyFile =
      previous?.localBodyShot?.split("/").pop() ?? `${player.slug}-body.webp`;

    if (photo) await download(photo, path.join(ASSET_DIR, headshotFile));
    if (bodyShot) await download(bodyShot, path.join(ASSET_DIR, bodyFile));

    const hasBody = Boolean(bodyShot) || existsSync(path.join(ASSET_DIR, bodyFile));

    players.push({
      id: player.id,
      name: player.name,
      shirtNumber: player.shirtNumber ?? null,
      shirtName: player.shirtName,
      slug: player.slug,
      position: positionOf(player),
      nationality: player.nationality,
      dateOfBirth: player.dateOfBirth,
      height: player.height,
      weight: player.weight,
      bio: player.bio,
      metaDescription: player.metaDescription,
      honors: player.honors,
      onLoan: Boolean(player.onLoan),
      forever: Boolean(player.forever),
      photo,
      photoLg: photo,
      bodyShot,
      localPhoto: `${ASSET_URL_PREFIX}/${headshotFile}`,
      ...(hasBody ? { localBodyShot: `${ASSET_URL_PREFIX}/${bodyFile}` } : {}),
    });
    console.log(`  ${player.name}`);
  }

  players.sort((a, b) => (a.shirtNumber ?? 999) - (b.shirtNumber ?? 999));

  const output = {
    ...existing,
    lastUpdated: new Date().toISOString().slice(0, 10),
    source: "liverpoolfc.com",
    ...(headCoach
      ? {
          coach: {
            id: headCoach.id,
            name: headCoach.name,
            slug: headCoach.slug,
            nationality: headCoach.nationality,
            photo: pickImage(headCoach.profileImage),
            metaDescription: headCoach.metaDescription,
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
