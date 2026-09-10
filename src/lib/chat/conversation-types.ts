/**
 * Shapes for persisted chat conversations and their messages.
 *
 * `Conversation` was declared twice with identical fields (conversation-selector
 * and chat-history-panel) while every call site that actually fetched them used
 * `any[]`, so the duplication was never checked against the API. These are the
 * single declaration both sides share.
 */

/** A conversation row as the list endpoints return it. */
export interface Conversation {
  id: string;
  title: string | null;
  updated_at: string;
}

/** A stored message row, straight from the `messages` table. */
export interface StoredMessageRow {
  id: string;
  role: string;
  content: string | null;
  created_at: string | null;
}

/** Roles the chat UI understands. The DB column is a free-text string. */
export type ChatRole = "system" | "user" | "assistant";

/**
 * A message in the shape assistant-ui expects: text lives in `parts`, and the
 * timestamp is a `Date` rather than the ISO string the database holds. `role`
 * is narrowed to the union the AI SDK's UIMessage requires.
 */
export interface ChatMessage {
  id: string;
  role: ChatRole;
  parts: { type: "text"; text: string }[];
  createdAt?: Date;
}
