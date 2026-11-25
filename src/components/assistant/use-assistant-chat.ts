"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";

export interface NavCard {
  path: string;
  label: string;
  reason?: string;
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  cards: NavCard[];
}

export type ChatStatus = "ready" | "streaming" | "error";

export type AssistantErrorCode =
  | "too_many_requests"
  | "conversation_too_long"
  | "input_too_long"
  | "ai_unconfigured"
  | "upstream_failed"
  | "network";

const STORAGE_KEY = "anfield_daily_assistant_v1";
const MAX_STORED_MESSAGES = 30;

function makeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function loadStoredMessages(): AssistantMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (m): m is AssistantMessage =>
          Boolean(m) &&
          typeof m === "object" &&
          typeof (m as AssistantMessage).id === "string" &&
          ((m as AssistantMessage).role === "user" ||
            (m as AssistantMessage).role === "assistant") &&
          typeof (m as AssistantMessage).text === "string",
      )
      .map((m) => ({
        ...m,
        cards: Array.isArray(m.cards) ? m.cards : [],
      }))
      .slice(-MAX_STORED_MESSAGES);
  } catch {
    return [];
  }
}

function saveStoredMessages(messages: AssistantMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    const completed = messages
      .filter((m) => m.text.trim().length > 0 || m.cards.length > 0)
      .slice(-MAX_STORED_MESSAGES);
    if (completed.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
    }
  } catch {
    // Ignore storage quota / private-mode blocks.
  }
}

function toUiMessages(messages: AssistantMessage[]): UIMessage[] {
  return messages.map((m) => ({
    id: m.id,
    role: m.role,
    parts: [{ type: "text", text: m.text }],
  }));
}

interface UseAssistantChatOptions {
  locale: "en" | "vi";
  path: string;
  spoilerFree: boolean;
  onReplyFinished?: () => void;
}

export function useAssistantChat({
  locale,
  path,
  spoilerFree,
  onReplyFinished,
}: UseAssistantChatOptions) {
  const [messages, setMessages] = useState<AssistantMessage[]>(() =>
    loadStoredMessages(),
  );
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<AssistantErrorCode | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<AssistantMessage[]>(messages);
  const onReplyFinishedRef = useRef(onReplyFinished);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    onReplyFinishedRef.current = onReplyFinished;
  }, [onReplyFinished]);

  useEffect(() => {
    if (status === "ready") {
      saveStoredMessages(messages);
    }
  }, [messages, status]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setActiveTool(null);
    setStatus("ready");
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setActiveTool(null);
    setErrorCode(null);
    setStatus("ready");
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors.
    }
  }, []);

  const sendMessage = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || status === "streaming") return;

      const userMsg: AssistantMessage = {
        id: makeId(),
        role: "user",
        text,
        cards: [],
      };
      const assistantId = makeId();
      const nextHistory = [...messagesRef.current, userMsg];

      setErrorCode(null);
      setActiveTool(null);
      setStatus("streaming");
      setMessages([
        ...nextHistory,
        { id: assistantId, role: "assistant", text: "", cards: [] },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;

      const updateAssistant = (
        updater: (prev: AssistantMessage) => AssistantMessage,
      ) => {
        setMessages((curr) =>
          curr.map((m) => (m.id === assistantId ? updater(m) : m)),
        );
      };

      const dropEmptyAssistant = () => {
        setMessages((curr) =>
          curr.filter(
            (m) =>
              m.id !== assistantId ||
              m.text.trim().length > 0 ||
              m.cards.length > 0,
          ),
        );
      };

      try {
        const res = await fetch("/api/assistant/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            messages: toUiMessages(nextHistory),
            path,
            locale,
            spoilerFree,
          }),
        });

        if (!res.ok || !res.body) {
          const payload = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          const code = (payload?.error as AssistantErrorCode) || "network";
          dropEmptyAssistant();
          setErrorCode(code);
          setStatus("error");
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let receivedContent = false;
        let pendingText = "";
        let rafId: number | null = null;

        const flushPendingText = () => {
          if (rafId !== null) {
            window.cancelAnimationFrame(rafId);
            rafId = null;
          }
          if (!pendingText) return;
          const chunk = pendingText;
          pendingText = "";
          updateAssistant((m) => ({ ...m, text: m.text + chunk }));
        };

        const scheduleFlush = () => {
          if (rafId !== null) return;
          rafId = window.requestAnimationFrame(() => {
            rafId = null;
            if (!pendingText) return;
            const chunk = pendingText;
            pendingText = "";
            updateAssistant((m) => ({ ...m, text: m.text + chunk }));
          });
        };

        const handleEventPayload = (dataStr: string) => {
          if (!dataStr || dataStr === "[DONE]") return;
          let chunk: Record<string, unknown>;
          try {
            chunk = JSON.parse(dataStr) as Record<string, unknown>;
          } catch {
            return;
          }

          const type = chunk.type;
          if (type === "text-delta") {
            const delta =
              typeof chunk.delta === "string"
                ? chunk.delta
                : typeof chunk.text === "string"
                  ? chunk.text
                  : "";
            if (delta) {
              receivedContent = true;
              setActiveTool(null);
              pendingText += delta;
              scheduleFlush();
            }
          } else if (
            type === "tool-input-start" ||
            type === "tool-input-available"
          ) {
            if (typeof chunk.toolName === "string") {
              setActiveTool(chunk.toolName);
            }
          } else if (type === "tool-output-available") {
            flushPendingText();
            setActiveTool(null);
            const output = chunk.output as
              | {
                  ok?: boolean;
                  path?: unknown;
                  label?: unknown;
                  reason?: unknown;
                }
              | undefined;
            if (
              output?.ok === true &&
              typeof output.path === "string" &&
              typeof output.label === "string"
            ) {
              receivedContent = true;
              const navPath = output.path;
              const navLabel = output.label;
              const navReason =
                typeof output.reason === "string" ? output.reason : undefined;
              updateAssistant((m) => {
                if (m.cards.some((c) => c.path === navPath)) return m;
                return {
                  ...m,
                  cards: [
                    ...m.cards,
                    { path: navPath, label: navLabel, reason: navReason },
                  ],
                };
              });
            }
          } else if (type === "error") {
            flushPendingText();
            setActiveTool(null);
            if (!receivedContent) {
              dropEmptyAssistant();
              setErrorCode("upstream_failed");
              setStatus("error");
            }
          }
        };

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let sepIdx: number;
            while ((sepIdx = buffer.indexOf("\n\n")) !== -1) {
              const rawEvent = buffer.slice(0, sepIdx);
              buffer = buffer.slice(sepIdx + 2);
              const dataLines = rawEvent
                .split(/\r?\n/)
                .filter((line) => line.startsWith("data:"))
                .map((line) => line.slice(5).trimStart());
              if (dataLines.length > 0) {
                handleEventPayload(dataLines.join("\n"));
              }
            }
          }

          if (buffer.trim()) {
            const dataLines = buffer
              .split(/\r?\n/)
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.slice(5).trimStart());
            if (dataLines.length > 0) {
              handleEventPayload(dataLines.join("\n"));
            }
          }
        } finally {
          flushPendingText();
        }

        setActiveTool(null);
        if (!receivedContent) {
          dropEmptyAssistant();
          setErrorCode("upstream_failed");
          setStatus("error");
          return;
        }
        setStatus("ready");
        onReplyFinishedRef.current?.();
      } catch (err) {
        setActiveTool(null);
        if (err instanceof Error && err.name === "AbortError") {
          dropEmptyAssistant();
          setStatus("ready");
          return;
        }
        dropEmptyAssistant();
        setErrorCode("network");
        setStatus("error");
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [locale, path, spoilerFree, status],
  );

  return {
    messages,
    status,
    activeTool,
    errorCode,
    sendMessage,
    stop,
    reset,
  };
}
