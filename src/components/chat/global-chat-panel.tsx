"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";
import { useAuthStore } from "@/stores/auth-store";

import { Button } from "@/components/ui/button";
import { X, Maximize2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { UIMessage } from "ai";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ConversationSelector } from "@/components/chat/conversation-selector";
import { QueryProvider } from "@/components/providers/query-provider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_CHAT_AI_MODEL } from "@/config/constants";
import type { ChatMessage, Conversation } from "@/lib/chat/conversation-types";

const GlobalChatInterface = ({
	initialMessages,
	conversationId,
	model,
	onConversationCreated,
}: {
	initialMessages: UIMessage[];
	conversationId: string | null;
	model: string;
	onConversationCreated?: (id: string, title: string) => void;
}) => {
	// Keep conversationId in a ref so the transport body always reads the latest
	// value WITHOUT recreating the transport. Recreating it mid-stream (when a new
	// conversation's id arrives via onConversationCreated) makes the runtime
	// re-submit and duplicates the whole Q&A history — most visible on mobile.
	const conversationIdRef = useRef(conversationId);
	useEffect(() => {
		conversationIdRef.current = conversationId;
	}, [conversationId]);

	const transport = useMemo(
		() =>
			new AssistantChatTransport({
				api: "/api/chat-groq",
				body: {
					model: model,
					get conversationId() {
						return conversationIdRef.current;
					},
				},
			}),
		[model]
	);

	const runtime = useChatRuntime({
		transport,
		messages: initialMessages.length > 0 ? initialMessages : undefined,
		onError: (error) => {
			console.error("[GlobalChat] Stream error:", error.message);
		},
		onData: (dataPart) => {
			if (dataPart.type === "data-conversation") {
				const data = dataPart.data as { conversationId?: string; conversationTitle?: string };
				if (data.conversationId && data.conversationTitle && onConversationCreated) {
					onConversationCreated(data.conversationId, data.conversationTitle);
				}
			}
		},
	});

	return (
		<AssistantRuntimeProvider runtime={runtime}>
			<Thread compact />
		</AssistantRuntimeProvider>
	);
};

/**
 * The chat popup itself. Loaded on demand by GlobalChat (see global-chat.tsx):
 * it pulls in assistant-ui, the AI SDK and markdown rendering, which used to
 * ship on every route to every visitor.
 */
function GlobalChatPanelContent({
	isOpen,
	onClose,
}: {
	isOpen: boolean;
	onClose: () => void;
}) {
	const { user } = useAuthStore();
	const queryClient = useQueryClient();
	const t = useTranslations("chat.widget");
	const closeRef = useRef<HTMLButtonElement>(null);

	// Move focus into the panel when it opens (the trigger restores it on close).
	useEffect(() => {
		if (isOpen) closeRef.current?.focus();
	}, [isOpen]);

	// Chat state
	const [isNewThread, setIsNewThread] = useState(true);
	const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
	// Identifies the mounted chat thread; changing it starts a fresh one.
	// Seeded from a counter rather than the clock: this component is server
	// rendered, and a timestamp key differs between the server and hydration,
	// which silently remounts the thread on load.
	const [chatKey, setChatKey] = useState("new-0");
	// Monotonic so a reset always yields a key React has not seen, even when
	// the current key names a saved conversation.
	const newChatCount = useRef(0);
	const selectedModel = DEFAULT_CHAT_AI_MODEL;

	// Fetch conversations
	const { data: conversations = [] } = useQuery<Conversation[]>({
		queryKey: ["conversations", user?.id],
		queryFn: async () => {
			if (!user) return [];
			const res = await fetch("/api/conversations");
			if (!res.ok) throw new Error("Failed to fetch conversations");
			const data = await res.json();
			return data.conversations || [];
		},
		enabled: !!user && isOpen,
		staleTime: 10 * 1000,
		refetchInterval: 15 * 1000,
		refetchOnWindowFocus: false,
	});

	// Fetch conversation history
	const { data: historyData, isLoading: isHistoryLoading } = useQuery<UIMessage[]>({
		queryKey: ["conversationHistory", currentConversationId],
		queryFn: async () => {
			if (!currentConversationId || !user) return [];
			const res = await fetch(`/api/conversations/${currentConversationId}/messages`);
			if (!res.ok) return [];
			const data = await res.json();
			return ((data.messages || []) as ChatMessage[]).map((msg) => ({
				...msg,
				createdAt: msg.createdAt ? new Date(msg.createdAt) : undefined,
			}));
		},
		enabled: !!currentConversationId && !!user && !isNewThread,
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
	});

	const initialMessages = historyData || [];

	const handleNewChat = useCallback(() => {
		setIsNewThread(true);
		setCurrentConversationId(null);
		setChatKey(`new-${(newChatCount.current += 1)}`);
	}, []);

	const handleConversationCreated = useCallback(
		(id: string, title: string) => {
			setCurrentConversationId(id);
			queryClient.setQueryData(["conversations", user?.id], (old: Conversation[] = []) => {
				if (old.some((c) => c.id === id)) return old;
				return [{ id, title, updated_at: new Date().toISOString() }, ...old];
			});
			queryClient.invalidateQueries({ queryKey: ["conversations", user?.id] });
		},
		[queryClient, user?.id]
	);

	const handleDeleteConversation = async (id: string) => {
		try {
			const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
			if (res.ok) {
				if (currentConversationId === id) handleNewChat();
				queryClient.invalidateQueries({ queryKey: ["conversations"] });
			}
		} catch (error) {
			console.error("Failed to delete conversation:", error);
		}
	};

	return (
		<>
			{/* Chat popup: full-screen on phones, floating card from sm. `inert` + visibility
			    keep the closed panel out of the tab order and the accessibility tree. */}
			<div
				role="dialog"
				aria-label={t("dialog")}
				inert={!isOpen}
				onKeyDown={(e) => {
					if (e.key === "Escape") {
						e.stopPropagation();
						onClose();
					}
				}}
				className={cn(
					"fixed z-[70] flex flex-col border border-[var(--line-strong)] bg-stadium-bg shadow-2xl shadow-black/40 font-barlow origin-bottom-right",
					"transition-[transform,opacity,visibility] duration-200 ease-[var(--ease-out)]",
					"right-5 bottom-[max(6rem,calc(env(safe-area-inset-bottom)+5.5rem))] w-[380px] h-[600px] max-h-[calc(100dvh-8rem)] rounded-2xl",
					// Phones: cover the screen (dvh = correct height with the mobile URL bar)
					"max-sm:inset-0 max-sm:h-dvh max-sm:max-h-none max-sm:w-full max-sm:rounded-none",
					isOpen
						? "visible translate-y-0 opacity-100"
						: "invisible translate-y-3 opacity-0 pointer-events-none"
				)}
			>
				{/* Header */}
				<div className="flex items-center gap-2 px-3 py-2.5 border-b border-stadium-border bg-stadium-surface/50 rounded-t-2xl max-sm:rounded-t-none pt-[max(0.625rem,env(safe-area-inset-top))] shrink-0">
					<span className="font-barlow font-semibold text-sm uppercase tracking-[0.12em] text-gradient-red shrink-0">LiverBird AI</span>

					<div className="flex-1 min-w-0">
						<ConversationSelector
							conversations={conversations}
							currentConversationId={currentConversationId}
							onSelect={(id: string) => {
								if (id === currentConversationId) return;
								setCurrentConversationId(id);
								setChatKey(`conv-${id}`);
								setIsNewThread(false);
							}}
							onNewChat={handleNewChat}
							onDelete={handleDeleteConversation}
							compact
						/>
					</div>

					<div className="flex items-center gap-0.5 shrink-0">
						<Button
							asChild
							variant="ghost"
							size="icon"
							className="size-10 text-stadium-muted hover:text-white"
						>
							<Link href="/chat" onClick={onClose} aria-label={t("openFull")} title={t("openFull")}>
								<Maximize2 className="size-4" aria-hidden />
							</Link>
						</Button>
						<Button
							ref={closeRef}
							variant="ghost"
							size="icon"
							className="size-10 text-stadium-muted hover:text-white"
							onClick={onClose}
							aria-label={t("close")}
						>
							<X className="size-5" aria-hidden />
						</Button>
					</div>
				</div>

				{/* Chat content */}
				<div className="flex-1 overflow-hidden">
					{isHistoryLoading && !isNewThread ? (
						<div className="flex flex-col px-4 pt-4 pb-20 w-full animate-pulse">
							<div className="space-y-4">
								<div className="flex gap-3">
									<div className="w-7 h-7 rounded-full bg-muted shrink-0" />
									<div className="flex-1 space-y-2">
										<div className="h-3 bg-muted rounded w-3/4" />
										<div className="h-3 bg-muted rounded w-1/2" />
									</div>
								</div>
								<div className="flex justify-end">
									<div className="bg-muted rounded-2xl px-4 py-3">
										<div className="h-3 bg-background/50 rounded w-24" />
									</div>
								</div>
							</div>
						</div>
					) : (
						<GlobalChatInterface
							key={chatKey}
							initialMessages={initialMessages}
							conversationId={currentConversationId}
							model={selectedModel}
							onConversationCreated={handleConversationCreated}
						/>
					)}
				</div>
			</div>
		</>
	);
}

/**
 * react-query and the radix tooltip provider only serve the chat, so they are
 * mounted here (this module is lazy) instead of in the root layout, where they
 * shipped in the first-load JS of every route.
 */
export default function GlobalChatPanel(props: { isOpen: boolean; onClose: () => void }) {
	return (
		<QueryProvider>
			<GlobalChatPanelContent {...props} />
		</QueryProvider>
	);
}
