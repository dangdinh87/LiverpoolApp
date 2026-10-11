import type { Fixture } from "@/lib/types/football";
import type { SiteArticleKind } from "./types";

/** Lower-case, hyphenated, ASCII-ish. */
function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * The URL for a match article.
 *
 * Carries both teams, the kind and the date, so the slug reads as what it is in
 * a search result and stays unique across a season's repeat fixtures.
 */
export function matchArticleSlug(kind: SiteArticleKind, fixture: Fixture): string {
  const date = fixture.fixture.date.slice(0, 10);
  const home = slugify(fixture.teams.home.name);
  const away = slugify(fixture.teams.away.name);
  return `${home}-vs-${away}-${kind}-${date}`;
}

/** The URL for an article that belongs to a date rather than a match. */
export function datedArticleSlug(kind: SiteArticleKind, date: string): string {
  return `${kind}-${date.slice(0, 10)}`;
}
