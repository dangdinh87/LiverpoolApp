import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { type NextRequest } from 'next/server';
import { createGroq } from '@ai-sdk/groq';
import { streamText } from 'ai';
import { DEFAULT_CHAT_AI_MODEL } from '@/config/constants';
import { webSearch, type WebSearchResult } from '@/lib/tools/web-search';
import { classifyIntent } from '@/lib/chat/intent-classifier';
import { buildFallbackChain, isRateLimitError } from '@/lib/chat/model-fallback';
import { BRO_AI_SYSTEM_PROMPT } from '@/lib/prompts/bro-ai-system';

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

// Normalize messages from assistant-ui format to OpenAI format
type ChatRole = 'system' | 'user' | 'assistant';
function normalizeMessages(
  messages: Record<string, unknown>[],
): { role: ChatRole; content: string }[] {
  return messages
    .map((msg) => ({
      role: msg.role as ChatRole,
      content: getMessageContent(msg),
    }))
    .filter((msg) => msg.content.length > 0);
}

// Build system prompt with numbered sources for citation references
function buildSystemPrompt(searchResult: WebSearchResult | null): string {
  if (!searchResult) return BRO_AI_SYSTEM_PROMPT;

  const numberedSources = searchResult.sources
    .map((s, i) => `[${i + 1}] ${s.title || new URL(s.url).hostname}`)
    .join('\n');

  return `${BRO_AI_SYSTEM_PROMPT}

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
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.error('[Chat API - Groq] GROQ_API_KEY is not set');
    return new Response(
      JSON.stringify({ error: 'Groq API key not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const groq = createGroq({ apiKey });

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { model, conversationId } = body;
    const rawMessages = body.messages || [];
    const messages = normalizeMessages(rawMessages);
    const selectedModel = model || DEFAULT_CHAT_AI_MODEL;

    console.log(
      `[Chat API - Groq] User=${user.id} model=${selectedModel} msgs=${messages.length} conv=${conversationId || 'new'}`,
    );

    const isNewConversation = !conversationId;
    let actualConversationId = conversationId;
    let conversationTitle = 'New Conversation';

    // Create conversation if new
    if (isNewConversation && messages.length > 0) {
      conversationTitle = messages[0].content;
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
        console.error('[Chat API - Groq] Error creating conversation:', convError);
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
                  `[Chat API - Groq] Web search done: ${searchResult.sources.length} sources`,
                );
              } catch (err) {
                console.error('[Chat API - Groq] Web search failed:', err);
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
            let usedModel = selectedModel;

            for (const tryModel of fallbackChain) {
              try {
                const result = streamText({
                  model: groq(tryModel),
                  system: buildSystemPrompt(searchResult),
                  messages,
                });

                for await (const textPart of result.textStream) {
                  fullAssistantContent += textPart;
                  writer.write({
                    type: 'text-delta',
                    id: messageId,
                    delta: textPart,
                  });
                }

                usedModel = tryModel;
                break; // Success — exit fallback loop
              } catch (error) {
                if (isRateLimitError(error)) {
                  console.warn(`[Chat API - Groq] Rate limited on ${tryModel}, trying next...`);
                  continue;
                }
                throw error; // Non-rate-limit error — bubble up
              }
            }

            if (usedModel !== selectedModel) {
              console.log(`[Chat API - Groq] Fell back from ${selectedModel} → ${usedModel}`);
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
            console.error('[Chat API - Groq] Stream error:', error);
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
    console.error('[Chat API - Groq] Error:', error);
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
