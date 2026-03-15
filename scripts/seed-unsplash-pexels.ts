/**
 * Seed high-quality images from Unsplash + Pexels to Cloudinary + Supabase.
 *
 * Usage: npx tsx scripts/seed-unsplash-pexels.ts
 *
 * Requires env vars: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET,
 *                    NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Idempotent: skips images already in Supabase by cloudinary_public_id.
 */
import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import { createClient } from "@supabase/supabase-js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const GALLERY_FOLDER = "lfc-gallery";
const DELAY_MS = 1500;

interface CuratedImage {
  id: string;
  src: string;
  alt: string;
  category: string;
  is_homepage_eligible: boolean;
  source: "unsplash" | "pexels";
}

// Curated high-quality images from Unsplash + Pexels
const CURATED_IMAGES: CuratedImage[] = [
  // === ANFIELD - Unsplash ===
  {
    id: "unsplash-anfield-stadium-field-seating",
    src: "https://images.unsplash.com/photo-1666607573912-90f535b0f011?w=1600&q=80",
    alt: "Anfield Stadium with field and seating",
    category: "anfield",
    is_homepage_eligible: true,
    source: "unsplash",
  },
  {
    id: "unsplash-anfield-green-field-red-seats",
    src: "https://images.unsplash.com/photo-1643796903573-68834ffadcb6?w=1600&q=80",
    alt: "Anfield Stadium with green field and red seats",
    category: "anfield",
    is_homepage_eligible: true,
    source: "unsplash",
  },
  {
    id: "unsplash-anfield-aerial-sunset",
    src: "https://images.unsplash.com/photo-1728473184021-db4b277d87c1?w=1600&q=80",
    alt: "Aerial view of Anfield Stadium at sunset",
    category: "anfield",
    is_homepage_eligible: true,
    source: "unsplash",
  },
  {
    id: "unsplash-anfield-cloudy-sky",
    src: "https://images.unsplash.com/photo-1598556253518-16614526b8dd?w=1600&q=80",
    alt: "Anfield Stadium with cloudy sky in the background",
    category: "anfield",
    is_homepage_eligible: true,
    source: "unsplash",
  },
  {
    id: "unsplash-anfield-red-seats-interior",
    src: "https://images.unsplash.com/photo-1636959961919-985cbee8d6d9?w=1600&q=80",
    alt: "Anfield Stadium interior filled with red seats",
    category: "anfield",
    is_homepage_eligible: true,
    source: "unsplash",
  },
  {
    id: "unsplash-anfield-aerial-surroundings",
    src: "https://images.unsplash.com/photo-1652804549883-520ef708d657?w=1600&q=80",
    alt: "Aerial view of Anfield and surrounding area",
    category: "anfield",
    is_homepage_eligible: true,
    source: "unsplash",
  },
  {
    id: "unsplash-anfield-empty-pitch",
    src: "https://images.unsplash.com/photo-1731931594172-2e96a6a9acbf?w=1600&q=80",
    alt: "Empty Anfield Stadium with soccer field",
    category: "anfield",
    is_homepage_eligible: true,
    source: "unsplash",
  },
  {
    id: "unsplash-anfield-exterior-brick-crest",
    src: "https://images.unsplash.com/photo-1767468017997-2c36b0db45cf?w=1600&q=80",
    alt: "Exterior of Anfield Stadium brick building with crest",
    category: "anfield",
    is_homepage_eligible: false,
    source: "unsplash",
  },
  {
    id: "unsplash-anfield-liverbird-logo-wall",
    src: "https://images.unsplash.com/photo-1769952529152-88b736e04daf?w=1600&q=80",
    alt: "Liverbird logo and LFC on red brick wall at Anfield",
    category: "anfield",
    is_homepage_eligible: false,
    source: "unsplash",
  },
  {
    id: "unsplash-anfield-matchday-atmosphere",
    src: "https://images.unsplash.com/photo-1677752793570-acb0b3c54542?w=1600&q=80",
    alt: "Anfield Stadium full of fans on matchday",
    category: "anfield",
    is_homepage_eligible: true,
    source: "unsplash",
  },
  {
    id: "unsplash-anfield-players-on-pitch",
    src: "https://images.unsplash.com/photo-1731931539748-40ff51b863c5?w=1600&q=80",
    alt: "Players warming up on the Anfield pitch",
    category: "anfield",
    is_homepage_eligible: true,
    source: "unsplash",
  },
  {
    id: "unsplash-paisley-gateway-mural",
    src: "https://images.unsplash.com/photo-1763751626859-3fbfb6735fc7?w=1600&q=80",
    alt: "Paisley Gateway entrance with football players mural",
    category: "anfield",
    is_homepage_eligible: false,
    source: "unsplash",
  },
  {
    id: "unsplash-anfield-exterior-fans-walking",
    src: "https://images.unsplash.com/photo-1770631071130-3bb15995963a?w=1600&q=80",
    alt: "Exterior view of Anfield with fans walking to match",
    category: "anfield",
    is_homepage_eligible: true,
    source: "unsplash",
  },
  {
    id: "unsplash-lfc-crest-red-brick",
    src: "https://images.unsplash.com/photo-1761315191206-a592f6bdb523?w=1600&q=80",
    alt: "Liverpool FC crest painted on red brick wall",
    category: "anfield",
    is_homepage_eligible: false,
    source: "unsplash",
  },
  {
    id: "unsplash-anfield-emblem-metal-gate",
    src: "https://images.unsplash.com/photo-1763751626848-47f2393830d2?w=1600&q=80",
    alt: "Liverpool FC emblem on metal gate outside Anfield",
    category: "anfield",
    is_homepage_eligible: false,
    source: "unsplash",
  },
  {
    id: "unsplash-anfield-modern-building",
    src: "https://images.unsplash.com/photo-1759951913066-4001d7e7373b?w=1600&q=80",
    alt: "Person walking towards Anfield modern stadium building",
    category: "anfield",
    is_homepage_eligible: false,
    source: "unsplash",
  },
  {
    id: "unsplash-anfield-stadium-greenery",
    src: "https://images.unsplash.com/photo-1760449780365-14968d248283?w=1600&q=80",
    alt: "Anfield Stadium surrounded by green trees and buildings",
    category: "anfield",
    is_homepage_eligible: true,
    source: "unsplash",
  },
  {
    id: "unsplash-anfield-red-seats-closeup",
    src: "https://images.unsplash.com/photo-1518188049456-7a3a9e263ab2?w=1600&q=80",
    alt: "Red seats at Anfield Stadium in daylight",
    category: "anfield",
    is_homepage_eligible: false,
    source: "unsplash",
  },

  // === ANFIELD - Pexels ===
  {
    id: "pexels-anfield-lfc-letters-seats",
    src: "https://images.pexels.com/photos/31741497/pexels-photo-31741497/free-photo-of-anfield-stadium-seats-with-lfc-letters.jpeg?auto=compress&cs=tinysrgb&w=1600",
    alt: "Anfield Stadium seats spelling out LFC",
    category: "anfield",
    is_homepage_eligible: true,
    source: "pexels",
  },
  {
    id: "pexels-anfield-empty-red-seats",
    src: "https://images.pexels.com/photos/31741508/pexels-photo-31741508/free-photo-of-empty-anfield-stadium-with-iconic-red-seats.jpeg?auto=compress&cs=tinysrgb&w=1600",
    alt: "Empty Anfield Stadium with iconic red seats and pitch",
    category: "anfield",
    is_homepage_eligible: true,
    source: "pexels",
  },
  {
    id: "pexels-anfield-tribune-aerial",
    src: "https://images.pexels.com/photos/16062018/pexels-photo-16062018/free-photo-of-tribune-at-anfield.jpeg?auto=compress&cs=tinysrgb&w=1600",
    alt: "Aerial view of the Anfield tribune",
    category: "anfield",
    is_homepage_eligible: true,
    source: "pexels",
  },
  {
    id: "pexels-anfield-gates-sunrays",
    src: "https://images.pexels.com/photos/10463654/pexels-photo-10463654.jpeg?auto=compress&cs=tinysrgb&w=1600",
    alt: "Iconic Shankly Gates at Anfield with sunrays",
    category: "anfield",
    is_homepage_eligible: false,
    source: "pexels",
  },
  {
    id: "pexels-anfield-red-seats-numbered",
    src: "https://images.pexels.com/photos/31741511/pexels-photo-31741511/free-photo-of-red-stadium-seats-close-up-in-empty-arena.jpeg?auto=compress&cs=tinysrgb&w=1600",
    alt: "Close-up of numbered red seats at Anfield",
    category: "anfield",
    is_homepage_eligible: false,
    source: "pexels",
  },

  // === FANS ===
  {
    id: "unsplash-fans-crowd-flags",
    src: "https://images.unsplash.com/photo-1559930198-26e8d7f0a4f7?w=1600&q=80",
    alt: "Large crowd of football fans holding flags and banners",
    category: "fans",
    is_homepage_eligible: true,
    source: "unsplash",
  },
  {
    id: "unsplash-fans-packed-stadium",
    src: "https://images.unsplash.com/photo-1735587804695-11f2e2615ffd?w=1600&q=80",
    alt: "Packed stadium of football fans watching a match",
    category: "fans",
    is_homepage_eligible: true,
    source: "unsplash",
  },
  {
    id: "unsplash-fans-watching-match",
    src: "https://images.unsplash.com/photo-1709994981222-71a403966361?w=1600&q=80",
    alt: "Crowd of fans watching a football match",
    category: "fans",
    is_homepage_eligible: true,
    source: "unsplash",
  },
  {
    id: "unsplash-fans-stadium-banners",
    src: "https://images.unsplash.com/photo-1759156207343-9dfefd8b7d33?w=1600&q=80",
    alt: "Crowded stadium with fans holding banners under blue sky",
    category: "fans",
    is_homepage_eligible: true,
    source: "unsplash",
  },
  {
    id: "unsplash-fans-packed-crowd",
    src: "https://images.unsplash.com/photo-1638642423879-21272e1f3c15?w=1600&q=80",
    alt: "Large crowd of passionate football fans in stadium",
    category: "fans",
    is_homepage_eligible: true,
    source: "unsplash",
  },
  {
    id: "pexels-fans-cheering-celebration",
    src: "https://images.pexels.com/photos/31160065/pexels-photo-31160065/free-photo-of-cheering-crowd-at-football-match-celebration.jpeg?auto=compress&cs=tinysrgb&w=1600",
    alt: "Excited fans cheering during a football match celebration",
    category: "fans",
    is_homepage_eligible: true,
    source: "pexels",
  },
  {
    id: "pexels-fans-smoke-flares",
    src: "https://images.pexels.com/photos/19191386/pexels-photo-19191386/free-photo-of-sports-fans-in-colorful-candle-smoke.jpeg?auto=compress&cs=tinysrgb&w=1600",
    alt: "Football fans celebrating with colorful smoke flares",
    category: "fans",
    is_homepage_eligible: true,
    source: "pexels",
  },
  {
    id: "pexels-lfc-pennant",
    src: "https://images.pexels.com/photos/17940816/pexels-photo-17940816/free-photo-of-liverpool-pennant-in-car.jpeg?auto=compress&cs=tinysrgb&w=1600",
    alt: "Liverpool FC pennant showing passion for the club",
    category: "fans",
    is_homepage_eligible: false,
    source: "pexels",
  },

  // === MATCHES ===
  {
    id: "unsplash-match-stadium-full",
    src: "https://images.unsplash.com/photo-1686484527934-6e49abf574be?w=1600&q=80",
    alt: "Packed football stadium during an exciting match",
    category: "matches",
    is_homepage_eligible: true,
    source: "unsplash",
  },
  {
    id: "unsplash-match-aerial-field",
    src: "https://images.unsplash.com/photo-1615417996592-615003487198?w=1600&q=80",
    alt: "Aerial view of football match in progress",
    category: "matches",
    is_homepage_eligible: true,
    source: "unsplash",
  },
  {
    id: "unsplash-match-players-action",
    src: "https://images.unsplash.com/photo-1752681304917-453df272eed7?w=1600&q=80",
    alt: "Football players in action during a match",
    category: "matches",
    is_homepage_eligible: true,
    source: "unsplash",
  },
  {
    id: "unsplash-match-aerial-night",
    src: "https://images.unsplash.com/photo-1735587310850-f89774730c3d?w=1600&q=80",
    alt: "Aerial view of illuminated football pitch during night match",
    category: "matches",
    is_homepage_eligible: true,
    source: "unsplash",
  },
  {
    id: "unsplash-match-packed-stadium",
    src: "https://images.unsplash.com/photo-1701363539457-875b9bc9bbc1?w=1600&q=80",
    alt: "Packed stadium during an intense football match",
    category: "matches",
    is_homepage_eligible: true,
    source: "unsplash",
  },
  {
    id: "unsplash-match-players-competing",
    src: "https://images.unsplash.com/photo-1771077508493-c79cd2634c3d?w=1600&q=80",
    alt: "Players competing in a football match on green field",
    category: "matches",
    is_homepage_eligible: true,
    source: "unsplash",
  },
  {
    id: "unsplash-match-soccer-field-atmosphere",
    src: "https://images.unsplash.com/photo-1551388749-6b3478890d58?w=1600&q=80",
    alt: "Football match atmosphere with players on the field",
    category: "matches",
    is_homepage_eligible: true,
    source: "unsplash",
  },
  {
    id: "unsplash-match-football-field-overview",
    src: "https://images.unsplash.com/photo-1570794682800-7b342f9dfd86?w=1600&q=80",
    alt: "Football field overview during a match",
    category: "matches",
    is_homepage_eligible: true,
    source: "unsplash",
  },
  {
    id: "pexels-match-aerial-exciting",
    src: "https://images.pexels.com/photos/31160097/pexels-photo-31160097/free-photo-of-aerial-view-of-exciting-football-match-in-stadium.jpeg?auto=compress&cs=tinysrgb&w=1600",
    alt: "Aerial view of an exciting football match in a packed stadium",
    category: "matches",
    is_homepage_eligible: true,
    source: "pexels",
  },
  {
    id: "pexels-match-night-stadium",
    src: "https://images.pexels.com/photos/31160095/pexels-photo-31160095/free-photo-of-exciting-night-football-match-in-a-packed-stadium.jpeg?auto=compress&cs=tinysrgb&w=1600",
    alt: "Exciting night football match in a packed stadium",
    category: "matches",
    is_homepage_eligible: true,
    source: "pexels",
  },
  {
    id: "pexels-match-players-competing",
    src: "https://images.pexels.com/photos/14242877/pexels-photo-14242877.jpeg?auto=compress&cs=tinysrgb&w=1600",
    alt: "Players competing for the ball in an intense football match",
    category: "matches",
    is_homepage_eligible: true,
    source: "pexels",
  },

  // === TROPHIES ===
  {
    id: "unsplash-champions-league-trophy",
    src: "https://images.unsplash.com/photo-1560003991-545650ee5f07?w=1600&q=80",
    alt: "UEFA Champions League trophy",
    category: "trophies",
    is_homepage_eligible: false,
    source: "unsplash",
  },
  {
    id: "pexels-lfc-victory-parade-bus",
    src: "https://images.pexels.com/photos/30398339/pexels-photo-30398339/free-photo-of-liverpool-fc-victory-parade-celebration.jpeg?auto=compress&cs=tinysrgb&w=1600",
    alt: "Liverpool FC victory parade on open-top bus",
    category: "trophies",
    is_homepage_eligible: true,
    source: "pexels",
  },
  {
    id: "pexels-lfc-victory-parade-fans",
    src: "https://images.pexels.com/photos/30398329/pexels-photo-30398329/free-photo-of-liverpool-fc-victory-parade-celebration.jpeg?auto=compress&cs=tinysrgb&w=1600",
    alt: "Fans celebrating with Liverpool FC players during victory parade",
    category: "trophies",
    is_homepage_eligible: true,
    source: "pexels",
  },
  {
    id: "pexels-lfc-player-celebrating",
    src: "https://images.pexels.com/photos/30398340/pexels-photo-30398340/free-photo-of-liverpool-fc-player-celebrating-victory-outdoors.jpeg?auto=compress&cs=tinysrgb&w=1600",
    alt: "Liverpool FC player celebrating victory",
    category: "trophies",
    is_homepage_eligible: false,
    source: "pexels",
  },

  // === HISTORY ===
  {
    id: "unsplash-paisley-square-97-avenue",
    src: "https://images.unsplash.com/photo-1763751626771-758f0d3ea3bc?w=1600&q=80",
    alt: "Paisley Square and 97 Avenue street signs at Anfield",
    category: "history",
    is_homepage_eligible: false,
    source: "unsplash",
  },
  {
    id: "unsplash-anfield-red-gates",
    src: "https://images.unsplash.com/photo-1604160701095-c45e92c644a7?w=1600&q=80",
    alt: "Red gates at Anfield — a piece of Liverpool FC history",
    category: "history",
    is_homepage_eligible: false,
    source: "unsplash",
  },
  {
    id: "pexels-hillsborough-memorial-tribute",
    src: "https://images.pexels.com/photos/32966717/pexels-photo-32966717/free-photo-of-liverpool-football-tribute-with-floral-arrangements.jpeg?auto=compress&cs=tinysrgb&w=1600",
    alt: "Hillsborough memorial tribute with floral arrangements and Liverpool memorabilia",
    category: "history",
    is_homepage_eligible: false,
    source: "pexels",
  },
];

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log(
    `\n🏟️  LFC Gallery — Unsplash + Pexels Seed — ${CURATED_IMAGES.length} curated images\n`,
  );

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < CURATED_IMAGES.length; i++) {
    const img = CURATED_IMAGES[i];
    const publicId = `${GALLERY_FOLDER}/${img.id}`;

    // Check if already exists in Supabase
    const { data: existing } = await supabase
      .from("gallery_images")
      .select("id")
      .eq("cloudinary_public_id", publicId)
      .single();

    if (existing) {
      skipped++;
      console.log(`  ⏭️  [${i + 1}/${CURATED_IMAGES.length}] ${img.id} (exists)`);
      continue;
    }

    // Upload to Cloudinary
    try {
      const result = await cloudinary.uploader.upload(img.src, {
        folder: GALLERY_FOLDER,
        public_id: img.id,
        tags: [img.category, "lfc-gallery", img.source],
        context: `alt=${img.alt}|category=${img.category}|source=${img.source}`,
        overwrite: false,
        unique_filename: false,
      });

      // Insert to Supabase
      const { error: dbError } = await supabase.from("gallery_images").upsert(
        {
          cloudinary_public_id: result.public_id,
          cloudinary_url: result.secure_url,
          alt: img.alt,
          category: img.category,
          width: result.width,
          height: result.height,
          is_homepage_eligible: img.is_homepage_eligible,
        },
        { onConflict: "cloudinary_public_id" },
      );

      if (dbError) {
        failed++;
        console.log(`  ❌ [${i + 1}/${CURATED_IMAGES.length}] ${img.id}: DB error: ${dbError.message}`);
      } else {
        uploaded++;
        console.log(`  ✅ [${i + 1}/${CURATED_IMAGES.length}] ${img.id} (${result.width}x${result.height})`);
      }
    } catch (err: unknown) {
      const error = err as { message?: string; error?: { message?: string } };
      const errMsg = error.message || error.error?.message || JSON.stringify(err);

      // If already exists in Cloudinary, retrieve and save to DB
      if (errMsg.includes("already exists")) {
        try {
          const resource = await cloudinary.api.resource(publicId);
          await supabase.from("gallery_images").upsert(
            {
              cloudinary_public_id: resource.public_id,
              cloudinary_url: resource.secure_url,
              alt: img.alt,
              category: img.category,
              width: resource.width,
              height: resource.height,
              is_homepage_eligible: img.is_homepage_eligible,
            },
            { onConflict: "cloudinary_public_id" },
          );
          uploaded++;
          console.log(`  ✅ [${i + 1}/${CURATED_IMAGES.length}] ${img.id} (from Cloudinary cache)`);
        } catch {
          failed++;
          console.log(`  ❌ [${i + 1}/${CURATED_IMAGES.length}] ${img.id}: Cloudinary conflict`);
        }
      } else {
        failed++;
        console.log(`  ❌ [${i + 1}/${CURATED_IMAGES.length}] ${img.id}: ${errMsg}`);
      }
    }

    // Delay between uploads
    if (i < CURATED_IMAGES.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Uploaded: ${uploaded}`);
  console.log(`   Skipped:  ${skipped}`);
  console.log(`   Failed:   ${failed}`);
  console.log(`   Total:    ${CURATED_IMAGES.length}`);

  // Show new DB totals
  const { data: allImages } = await supabase
    .from("gallery_images")
    .select("category");

  if (allImages) {
    const cats: Record<string, number> = {};
    for (const row of allImages) {
      cats[row.category] = (cats[row.category] || 0) + 1;
    }
    console.log(`\n📊 DB Totals by category:`);
    for (const [cat, count] of Object.entries(cats).sort((a, b) => b[1] - a[1])) {
      console.log(`   ${cat}: ${count}`);
    }
    console.log(`   TOTAL: ${allImages.length}`);
  }

  if (failed > 0) {
    console.log("\n⚠️  Some images failed. Re-run to retry.\n");
    process.exit(1);
  }

  console.log("\n✅ Done!\n");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
