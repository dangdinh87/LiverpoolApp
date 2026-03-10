import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { type NextRequest } from 'next/server';
import { createGroq } from '@ai-sdk/groq';
import { streamText } from 'ai';
import { DEFAULT_CHAT_AI_MODEL } from '@/config/constants';
import { webSearch, needsWebSearch, type WebSearchResult } from '@/lib/tools/web-search';
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

// Build system prompt with optional search context
function buildSystemPrompt(searchResult: WebSearchResult | null): string {
  if (!searchResult) return BRO_AI_SYSTEM_PROMPT;

  // Groq browser search returns a full answer with inline citations
  return `${BRO_AI_SYSTEM_PROMPT}

## Web Search Results for: "${searchResult.query}"

${searchResult.answer}

IMPORTANT: Use the search results above to provide accurate, up-to-date information. Preserve source citations/URLs from the search results in your response.`;
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();

  if (!process.env.GROQ_API_KEY) {
    console.error('[Chat API - Groq] GROQ_API_KEY is not set');
    return new Response(
      JSON.stringify({ error: 'Groq API key not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn(
        '[Chat API - Groq] Auth failed:',
        authError?.message ?? 'No user',
      );
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
      `[Chat API - Groq] User=${user.id} model=${selectedModel} messages=${messages.length} convId=${conversationId || 'new'}`,
    );

    const isNewConversation = !conversationId;
    let actualConversationId = conversationId;
    let conversationTitle = 'New Conversation';

    // Persistence: Create Conversation if it's new
    if (isNewConversation && messages.length > 0) {
      const firstMessage = messages[0].content;
      conversationTitle = firstMessage;

      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: conversationTitle,
          model: selectedModel,
        })
        .select()
        .single();

      if (convError) {
        console.error(
          '[Chat API - Groq] Error creating conversation:',
          convError,
        );
      } else if (convData) {
        actualConversationId = convData.id;
      }
    }

    // Persistence: Save User Message
    if (actualConversationId && messages.length > 0) {
      const lastUserMessage = [...messages]
        .reverse()
        .find((m) => m.role === 'user');
      if (lastUserMessage) {
        await supabase.from('messages').insert({
          conversation_id: actualConversationId,
          role: 'user',
          content: lastUserMessage.content,
        });
      }
    }

    // Web Search: Check if the latest user message needs real-time data
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    const shouldSearch = lastUserMsg ? needsWebSearch(lastUserMsg.content) : false;

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

            // Web search: emit as tool call so UI shows progress
            if (shouldSearch && lastUserMsg) {
              const searchQuery = lastUserMsg.content;

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
                  `[Chat API - Groq] Web search completed: ${searchResult.sources.length} sources`,
                );
              } catch (err) {
                console.error('[Chat API - Groq] Web search failed:', err);
              }

              // Emit tool result (sources for UI display)
              writer.write({
                type: 'tool-output-available',
                toolCallId,
                output: searchResult
                  ? { results: searchResult.sources }
                  : { results: [], error: 'Search failed' },
              });
            }

            writer.write({ type: 'text-start', id: messageId });

            // Stream from Groq with search context in system prompt
            const result = streamText({
              model: groq(selectedModel),
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

            writer.write({ type: 'text-end', id: messageId });
            writer.write({ type: 'finish-step' });
            writer.write({ type: 'finish' });

            // Persistence: Save Assistant Message
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
