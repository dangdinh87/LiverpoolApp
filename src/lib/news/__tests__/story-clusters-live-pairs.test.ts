import { describe, expect, it } from "vitest";
import { clusterStories } from "../story-clusters";

/**
 * Real near-duplicates, taken from the live feed (12 Oct 2026) by looking for
 * same-day articles from different outlets sharing rare title words.
 *
 * They matter more than invented examples because four of the English sources
 * are siblings — Liverpool Echo, liverpool.com and the Mirror are all Reach plc
 * and syndicate within the group — so the feed receives several rewrites of one
 * story as a matter of course, not by accident.
 *
 * Headlines only, no excerpts: the harder case, and what a title-only payload
 * gives the clusterer.
 *
 * A known limit, measured rather than assumed: a third take on the police
 * incident that day — "Merseyside Police officer suffers serious facial injury
 * during arrest" — scores about 0.34 against the 0.34 threshold and stays a
 * separate card, with or without excerpts. Attempts to pull it in made things
 * worse: suffix stemming changed nothing, and removing function words from the
 * stopword list merged two stories that `story-clusters.test.ts` requires to
 * stay apart. It is arguably a different angle (the officer, not the match), so
 * it is left out rather than asserted either way.
 */
const take = (source: string, title: string, hour: number) => ({
  link: `https://example.test/${source}/${hour}`,
  title,
  language: "en",
  pubDate: `2026-10-12T${String(hour).padStart(2, "0")}:00:00Z`,
  source,
});

const IRAOLA_INJURY_UPDATE = [
  take("echo", "Andoni Iraola offers Cody Gakpo and Alexander Isak Liverpool injury update", 12),
  take("liverpoolcom", "Andoni Iraola gives Alexander Isak and Cody Gakpo injury update as Liverpool wait", 11),
  take("anfieldindex", "Andoni Iraola confirms Alexander Isak and Cody Gakpo injury status before Man City", 10),
  take("mirror", "Liverpool get worrying injury update on Alexander Isak and Cody Gakpo", 9),
];

const GERRARD_ON_WEBB = [
  take("echo", "Steven Gerrard reveals Howard Webb reaction to Ryan Gravenberch's Liverpool red card", 6),
  take("liverpoolcom", "Steven Gerrard saw Howard Webb reaction to Ryan Gravenberch red card", 5),
];

describe("clusterStories on live near-duplicates", () => {
  it("groups four outlets' takes on the Isak and Gakpo injury update into one card", () => {
    const clusters = clusterStories(IRAOLA_INJURY_UPDATE);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].related).toHaveLength(3);
  });

  it("groups two Reach siblings' rewrites of the Gerrard story", () => {
    const clusters = clusterStories(GERRARD_ON_WEBB);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].related).toHaveLength(1);
  });

  it("keeps the two unrelated stories apart", () => {
    const clusters = clusterStories([...IRAOLA_INJURY_UPDATE, ...GERRARD_ON_WEBB]);
    expect(clusters).toHaveLength(2);
  });
});
