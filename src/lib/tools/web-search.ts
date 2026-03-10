import 'server-only';

export interface WebSearchResult {
  query: string;
  answer: string;
  sources: { title: string; url: string; snippet: string }[];
}

// Perform web search via Groq's built-in browser_search tool
export async function webSearch(query: string): Promise<WebSearchResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  console.log('[Web Search] Groq compound-mini search:', query);

  // Use groq/compound-mini — designed for single tool calls (web search),
  // returns structured executed_tools with search_results (title, url, content, score).
  // No tools/tool_choice needed — compound models auto-decide when to search.
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'groq/compound-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a football research assistant. Always search the web for the latest information. Provide factual, up-to-date data with source references. Respond concisely.',
        },
        { role: 'user', content: query },
      ],
      max_completion_tokens: 1024,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Web Search] Groq search error:', response.status, errorText);
    throw new Error(`Groq search failed: ${response.status}`);
  }

  const data = await response.json();
  const message = data.choices?.[0]?.message;
  const answer = message?.content || '';

  // Debug: log the executed_tools structure from compound model
  if (message?.executed_tools) {
    console.log('[Web Search] executed_tools:', JSON.stringify(message.executed_tools, null, 2));
  } else {
    console.log('[Web Search] No executed_tools in response. Keys:', Object.keys(message || {}));
  }

  // Extract structured sources from executed_tools (Groq returns search_results)
  let sources: { title: string; url: string; snippet: string }[] = [];
  const executedTools = message?.executed_tools;

  if (Array.isArray(executedTools)) {
    for (const tool of executedTools) {
      const results = tool?.search_results?.results;
      if (Array.isArray(results)) {
        for (const r of results) {
          if (r.url) {
            sources.push({
              title: r.title || new URL(r.url).hostname.replace('www.', ''),
              url: r.url,
              snippet: r.content || '',
            });
          }
        }
      }
    }
  }

  // Fallback: extract URLs from answer text if no executed_tools data
  if (sources.length === 0) {
    const urlRegex = /https?:\/\/[^\s)\]"']+/g;
    const urls = [...new Set(answer.match(urlRegex) || [])] as string[];
    sources = urls.slice(0, 5).map((url) => ({
      title: new URL(url).hostname.replace('www.', ''),
      url,
      snippet: '',
    }));
  }

  // Deduplicate by URL and limit to 8 sources
  const seen = new Set<string>();
  sources = sources.filter((s) => {
    if (seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  }).slice(0, 8);

  console.log(`[Web Search] Got answer (${answer.length} chars), ${sources.length} sources, hasExecutedTools=${!!executedTools}`);

  return { query, answer, sources };
}

// Check if a user message likely needs real-time web data
// Uses multi-word phrases to reduce false positives
export function needsWebSearch(message: string): boolean {
  const lowerMsg = message.toLowerCase();

  // Strong signals — any single match triggers search
  const strongSignals = [
    // Explicit time references
    'hôm nay', 'hôm qua', 'tối nay', 'đêm qua', 'tuần này', 'tuần trước',
    'today', 'yesterday', 'tonight', 'last night', 'this week', 'last week',
    // Live/realtime
    'trực tiếp', 'live score', 'live match',
    // Transfer
    'chuyển nhượng', 'transfer news', 'transfer rumour', 'transfer rumor',
    'tin đồn', 'ký hợp đồng',
    // Latest/recent
    'mới nhất', 'gần nhất', 'gần đây', 'latest news', 'recent news', 'breaking',
    // Upcoming
    'trận tới', 'trận tiếp', 'next match', 'next game', 'upcoming match',
    'lịch thi đấu',
    // Current season/standings
    'bảng xếp hạng', 'current standing', 'league table', 'premier league table',
    'mùa giải hiện tại', 'this season', 'current season',
    // Injury
    'chấn thương', 'injury update', 'injury news', 'injury list',
    // Explicit year references (likely asking about current/recent events)
    '2025', '2026',
    // Explicit search request
    'search', 'tìm kiếm', 'look up', 'tra cứu',
  ];

  if (strongSignals.some((kw) => lowerMsg.includes(kw))) {
    return true;
  }

  // Weak signals — need at least 2 matches to trigger search
  const weakSignals = [
    'score', 'kết quả', 'tỷ số', 'tỉ số',
    'result', 'fixture',
    'lineup', 'đội hình',
    'standing', 'position',
    'news', 'tin tức',
    'latest', 'recent',
    'hiện tại', 'currently',
    'injured', 'signed',
    'transfer', 'rumour', 'rumor',
  ];

  const weakMatches = weakSignals.filter((kw) => lowerMsg.includes(kw));
  return weakMatches.length >= 2;
}
