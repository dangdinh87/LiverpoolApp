import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { type NextRequest } from 'next/server';
import { vietapi } from '@/lib/ai/vietapi';
import { streamText } from 'ai';
import { ALLOWED_CHAT_MODELS, DEFAULT_CHAT_AI_MODEL } from '@/config/constants';
import { checkRateLimit } from '@/lib/rate-limit';
import { webSearch, type WebSearchResult } from '@/lib/tools/web-search';
import { classifyIntent } from '@/lib/chat/intent-classifier';
import { buildFallbackChain, isRateLimitError } from '@/lib/chat/model-fallback';
import { BRO_AI_SYSTEM_PROMPT } from '@/lib/prompts/bro-ai-system';
import { buildCurrentFactsBlock } from '@/lib/prompts/current-facts';

export const maxDuration = 60;

// Convert assistant-ui parts format to plain content string
function getMessageContent(msg: Record<string, unknown>): string {
  if (typeof msg.content === 'string') return msg.content;
  if (Array.isArray(msg.parts)) {
    return msg.parts
      .filter((p: Record<string, unknown>) => p.type === 'text')
      .map((p: Record<string, unknown>) => p.text)
      .join('');
  }
  return '';
}

// Cost guards: the request body is fully client-controlled.
const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 4000;
const MAX_OUTPUT_TOKENS = 2000;
const CHAT_REQUESTS_PER_HOUR = 40;

// Normalize messages from assistant-ui format to OpenAI format. Only user and
// assistant turns are accepted — a client-sent `system` message would override
// the BRO AI prompt — and history is trimmed to the most recent turns.
type ChatRole = 'user' | 'assistant';
function normalizeMessages(
  messages: unknown,
): { role: ChatRole; content: string }[] {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter(
      (msg): msg is Record<string, unknown> =>
        !!msg && typeof msg === 'object' &&
        ((msg as Record<string, unknown>).role === 'user' ||
          (msg as Record<string, unknown>).role === 'assistant'),
    )
    .map((msg) => ({
      role: msg.role as ChatRole,
      content: getMessageContent(msg).slice(0, MAX_MESSAGE_CHARS),
    }))
    .filter((msg) => msg.content.length > 0)
    .slice(-MAX_HISTORY_MESSAGES);
}

// Build system prompt with numbered sources for citation references
function buildSystemPrompt(searchResult: WebSearchResult | null): string {
  const base = `${BRO_AI_SYSTEM_PROMPT}\n\n${buildCurrentFactsBlock()}`;
  if (!searchResult) return base;

  const numberedSources = searchResult.sources
    .map((s, i) => `[${i + 1}] ${s.title || new URL(s.url).hostname}`)
    .join('\n');

  return `${base}

## Web Search Results for: "${searchResult.query}"

${searchResult.answer}

### Available Sources
${numberedSources}

CITATION RULES (MUST follow):
- Cite sources using numbered brackets: [1], [2], etc.
- NEVER paste raw URLs or full links in your text.
- Sources with clickable links are displayed separately to the user.
- Example: "Liverpool đang dẫn đầu BXH [1] với phong độ ấn tượng [2]."`;
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const apiKey = process.env.VIETAPI_KEY;

  if (!apiKey) {
    console.error('[Chat API] VIETAPI_KEY is not set');
    return new Response(
      JSON.stringify({ error: 'AI provider key not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      // A transport failure means the auth backend is unreachable, not that the
      // visitor is signed out. Reporting both as 401 made every outage look like
      // "please log in", which sent users to a login form that could not work.
      const backendDown =
        authError?.status === undefined ||
        authError.status === 0 ||
        authError.status >= 500;

      if (authError && backendDown) {
        console.error('[Chat API] Auth backend unavailable:', authError.message);
        return new Response(
          JSON.stringify({
            error: 'Auth service unavailable',
            code: 'auth_backend_unavailable',
          }),
          { status: 503, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Per-user, per-instance limit. Not a hard global quota on serverless, but it
    // stops a single client from looping requests against one warm instance.
    if (!checkRateLimit(`chat:${user.id}`, CHAT_REQUESTS_PER_HOUR, 3_600_000).allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { model, conversationId } = body;
    const messages = normalizeMessages(body.messages);
    // Never pass a client-chosen model id straight to the paid provider.
    const selectedModel =
      typeof model === 'string' && ALLOWED_CHAT_MODELS.includes(model)
        ? model
        : DEFAULT_CHAT_AI_MODEL;

    console.log(
      `[Chat API] User=${user.id} model=${selectedModel} msgs=${messages.length} conv=${conversationId || 'new'}`,
    );

    const isNewConversation = !conversationId;
    let actualConversationId = conversationId;
    let conversationTitle = 'New Conversation';

    // Create conversation if new
    if (isNewConversation && messages.length > 0) {
      conversationTitle = messages[0].content.slice(0, 100);
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: conversationTitle,
          model: selectedModel,
        })
        .select()
        .single();

      if (!convError && convData) {
        actualConversationId = convData.id;
      } else {
        console.error('[Chat API] Error creating conversation:', convError);
      }
    }

    // Save user message
    if (actualConversationId && messages.length > 0) {
      const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
      if (lastUserMessage) {
        await supabase.from('messages').insert({
          conversation_id: actualConversationId,
          role: 'user',
          content: lastUserMessage.content,
        });
      }
    }

    // AI-powered intent classification (replaces keyword matching)
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    const { needsSearch, searchQuery } = lastUserMsg
      ? await classifyIntent(lastUserMsg.content, apiKey)
      : { needsSearch: false, searchQuery: '' };

    const messageId = `msg-${Date.now()}`;
    const toolCallId = `search-${Date.now()}`;

    return createUIMessageStreamResponse({
      stream: createUIMessageStream({
        async execute({ writer }) {
          let fullAssistantContent = '';
          let searchResult: WebSearchResult | null = null;

          try {
            writer.write({ type: 'start', messageId });

            // Emit conversation metadata for new conversations
            if (isNewConversation && actualConversationId) {
              writer.write({
                type: 'data-conversation',
                data: {
                  conversationId: actualConversationId,
                  conversationTitle: conversationTitle,
                },
              });
            }

            writer.write({ type: 'start-step' });

            // Web search if AI classifier determined it's needed
            if (needsSearch) {
              writer.write({
                type: 'tool-input-start',
                toolCallId,
                toolName: 'web_search',
              });
              writer.write({
                type: 'tool-input-delta',
                toolCallId,
                inputTextDelta: JSON.stringify({ query: searchQuery }),
              });
              writer.write({
                type: 'tool-input-available',
                toolCallId,
                toolName: 'web_search',
                input: { query: searchQuery },
              });

              try {
                searchResult = await webSearch(searchQuery);
                console.log(
                  `[Chat API] Web search done: ${searchResult.sources.length} sources`,
                );
              } catch (err) {
                console.error('[Chat API] Web search failed:', err);
              }

              writer.write({
                type: 'tool-output-available',
                toolCallId,
                output: searchResult
                  ? { results: searchResult.sources }
                  : { results: [], error: 'Search failed' },
              });
            }

            writer.write({ type: 'text-start', id: messageId });

            // Stream with model fallback on rate limit
            const fallbackChain = buildFallbackChain(selectedModel);
            let usedModel: string | null = null;

            // Provider failures (rate limit, model_not_found, 5xx) arrive as
            // `error` parts of fullStream — textStream does not throw them — so
            // reading textStream ended with an empty reply and never reached
            // the next model. Fall back on any error that occurs before the
            // first token; after that, keep what the user already saw.
            for (const tryModel of fallbackChain) {
              let streamError: unknown = null;
              let emitted = false;
              const result = streamText({
                model: vietapi(tryModel),
                system: buildSystemPrompt(searchResult),
                messages,
                maxOutputTokens: MAX_OUTPUT_TOKENS,
                // One retry per model: the fallback chain is the real retry, and
                // the default (2 retries with backoff) per model could run three
                // failing models past the 60s function limit.
                maxRetries: 1,
                // Errors are handled below via fullStream; skip the SDK's default dump.
                onError: () => {},
              });

              try {
                for await (const part of result.fullStream) {
                  if (part.type === 'text-delta') {
                    emitted = true;
                    fullAssistantContent += part.text;
                    writer.write({ type: 'text-delta', id: messageId, delta: part.text });
                  } else if (part.type === 'error') {
                    streamError = part.error;
                    break;
                  }
                }
              } catch (error) {
                streamError = error;
              }

              if (!streamError) {
                usedModel = tryModel;
                break;
              }
              const reason = streamError instanceof Error ? streamError.message : String(streamError);
              if (emitted) {
                console.error(`[Chat API] ${tryModel} failed mid-answer: ${reason.slice(0, 200)}`);
                usedModel = tryModel;
                break;
              }
              console.warn(
                `[Chat API] ${tryModel} failed${isRateLimitError(streamError) ? ' (rate limit)' : ''}, trying next: ${reason.slice(0, 200)}`,
              );
            }

            if (!usedModel) {
              // Every model failed before answering: say so instead of a blank bubble.
              const apology =
                'Xin lỗi, LiverBird AI đang quá tải — bạn thử lại sau ít phút nhé. / Sorry, LiverBird AI is overloaded right now — please try again in a few minutes.';
              writer.write({ type: 'text-delta', id: messageId, delta: apology });
            } else if (usedModel !== selectedModel) {
              console.log(`[Chat API] Fell back from ${selectedModel} → ${usedModel}`);
            }

            writer.write({ type: 'text-end', id: messageId });
            writer.write({ type: 'finish-step' });
            writer.write({ type: 'finish' });

            // Save assistant message
            if (actualConversationId && fullAssistantContent) {
              await supabase.from('messages').insert({
                conversation_id: actualConversationId,
                role: 'assistant',
                content: fullAssistantContent,
              });

              await supabase
                .from('conversations')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', actualConversationId);
            }
          } catch (error) {
            console.error('[Chat API] Stream error:', error);
            writer.write({
              type: 'error',
              errorText:
                error instanceof Error ? error.message : 'Unknown error',
            });
          }
        },
      }),
    });
  } catch (error) {
    console.error('[Chat API] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal Error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
