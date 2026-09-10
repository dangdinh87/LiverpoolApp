import 'server-only';

// Cheapest VietAPI tier — classification is a one-token-ish decision.
const CLASSIFIER_MODEL = 'deepseek-v4-flash';
const VIETAPI_CHAT_URL = 'https://api.vietapi.tech/v1/chat/completions';

/**
 * Pull a JSON object out of a model reply.
 *
 * Reasoning models prepend their working and often fence the payload, so the
 * raw string is rarely parseable as-is.
 */
function extractJson(raw: string): Record<string, unknown> {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) return {};
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return {};
  }
}

export interface ClassifyResult {
  needsSearch: boolean;
  searchQuery: string;
}

/**
 * Use the cheapest model to classify whether web search is needed.
 * Replaces keyword-based needsWebSearch() with AI-powered intent detection.
 * Falls back to no-search on any error (graceful degradation).
 */
export async function classifyIntent(
  message: string,
  apiKey: string,
): Promise<ClassifyResult> {
  try {
    const response = await fetch(VIETAPI_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: CLASSIFIER_MODEL,
        messages: [
          {
            role: 'system',
            content: `You classify if a football fan's message needs real-time web search.
Reply JSON only: {"search":true/false,"query":"optimized search query or empty"}

NEEDS SEARCH (true):
- Current scores, live results, recent match results
- Transfer news, rumors, signings
- Injury updates, team news
- Time words: today, latest, now, current, this week, hôm nay, mới nhất, hiện tại
- Current season standings, fixtures, form
- Any time-sensitive football data

NO SEARCH (false):
- Historical facts (Istanbul 2005, treble, etc.)
- General football knowledge, rules
- Player career history (retired players)
- Club history, trophies, records
- Opinions, predictions from known data
- Greetings, casual chat, site questions`,
          },
          { role: 'user', content: message },
        ],
        // Room for a reasoning model to think before emitting the JSON.
        max_tokens: 800,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      console.warn(`[Intent Classifier] ${CLASSIFIER_MODEL} returned ${response.status}, skipping search`);
      return { needsSearch: false, searchQuery: '' };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const parsed = extractJson(content);

    const result: ClassifyResult = {
      needsSearch: parsed.search === true,
      searchQuery: (parsed.query as string) || message,
    };

    console.log('[Intent Classifier]', {
      input: message.substring(0, 60),
      ...result,
    });

    return result;
  } catch (error) {
    console.error('[Intent Classifier] Error, skipping search:', error);
    return { needsSearch: false, searchQuery: '' };
  }
}
