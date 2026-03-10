import 'server-only';

const CLASSIFIER_MODEL = 'llama-3.1-8b-instant';

export interface ClassifyResult {
  needsSearch: boolean;
  searchQuery: string;
}

/**
 * Use fast, lightweight model (8b-instant) to classify if web search is needed.
 * Replaces keyword-based needsWebSearch() with AI-powered intent detection.
 * Falls back to no-search on any error (graceful degradation).
 */
export async function classifyIntent(
  message: string,
  apiKey: string,
): Promise<ClassifyResult> {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
        max_tokens: 100,
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      console.warn(`[Intent Classifier] ${CLASSIFIER_MODEL} returned ${response.status}, skipping search`);
      return { needsSearch: false, searchQuery: '' };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    const result: ClassifyResult = {
      needsSearch: parsed.search === true,
      searchQuery: parsed.query || message,
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
