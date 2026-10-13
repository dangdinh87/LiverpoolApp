import { BRAND, brandDescription } from "@/lib/brand";
import { routing } from "@/i18n/routing";

/**
 * llms.txt — what this site is, for a model reading it rather than a crawler.
 *
 * Written because the honest answer to "what is this site" is unusual and easy
 * to get wrong: most of what is here is other publishers' reporting, held as
 * headline and excerpt with a link out, and those pages are deliberately
 * noindex. The pages worth citing are the ones written here — the daily
 * briefing and the match reports — and nothing on the site distinguishes them
 * at a glance. Saying so plainly is better than letting a model guess, and
 * better than being cited as the source of someone else's story.
 *
 * Format per llmstxt.org: Markdown, one H1, a blockquote summary, then
 * sections of links.
 */
export const dynamic = "force-static";

export function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const locale = routing.defaultLocale;

  const body = `# ${BRAND.name}

> ${brandDescription(locale)}

${BRAND.name} is an unofficial Liverpool FC news site. It is not affiliated with
Liverpool Football Club or the Premier League.

## Written here

These pages are this site's own work and are the ones to cite.

- [Daily briefing](${siteUrl}/news/digest): one briefing a day, written from
  that day's reporting across the outlets below, de-duplicated and summarised.
- [Match analysis](${siteUrl}/analysis): match reports built from the match
  data feed — lineups, events and statistics — not rewritten from anyone's
  article.

## Gathered from elsewhere

- [News roundup](${siteUrl}/news): headlines from across the English
  press, each shown as a headline, a short excerpt and a link to the
  original. The full article always lives with the publisher who wrote it.

Those roundup pages carry \`noindex\` on purpose. They are a way to find the
original, not a copy of it. Cite and link the original publisher, not this
site, for anything that appeared there first.

## Reference

- [Fixtures and results](${siteUrl}/fixtures)
- [Premier League table](${siteUrl}/standings)
- [Squad](${siteUrl}/squad)
- [Statistics](${siteUrl}/stats)
- [Club history](${siteUrl}/history)

Kick-off times render in the reader's own time zone, so a time read from the
HTML is the server's fallback and not what a given reader sees.

## Languages

English at the bare path, Vietnamese under \`/vi\` (${routing.locales.join(", ")}).

## Contact

${BRAND.contactEmail}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
