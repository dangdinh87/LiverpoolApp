"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";
import { useAuthStore } from "@/stores/auth-store";
import { ChatSidebar, SidebarToggleButton } from "@/components/chat/chat-history-panel";
import { ChatHistorySkeleton } from "@/components/chat/thinking-indicator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { DEFAULT_CHAT_AI_MODEL } from "@/config/constants";
import type { ChatMessage, Conversation } from "@/lib/chat/conversation-types";

const ChatInterface = ({
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
			console.error("[ChatInterface] Stream error:", error.message);
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
			<div className="flex h-full flex-col">
				<div className="min-h-0 flex-1">
					<Thread />
				</div>
			</div>
		</AssistantRuntimeProvider>
	);
};

/**
 * The signed-in chat app. Lives in its own module so page.tsx can load it on
 * demand: assistant-ui, the AI SDK, markdown and react-query are ~270 KB gzip,
 * and a signed-out visitor only needs the sign-in prompt.
 */
export default function ChatApp() {
	const { user } = useAuthStore();
	const queryClient = useQueryClient();

	const selectedModel = DEFAULT_CHAT_AI_MODEL;

	const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
	// Starts closed so the drawer never covers the thread on phones; opens on desktop.
	// (The sidebar only renders after auth resolves on the client, so no hydration mismatch.)
	const [sidebarCollapsed, setSidebarCollapsed] = useState(
		() => typeof window === "undefined" || !window.matchMedia("(min-width: 768px)").matches,
	);
	// Identifies the mounted chat thread; changing it starts a fresh one.
	// Seeded from a counter rather than the clock: this component is server
	// rendered, and a timestamp key differs between the server and hydration,
	// which silently remounts the thread on load.
	const [chatKey, setChatKey] = useState("new-0");
	// Monotonic so a reset always yields a key React has not seen, even when
	// the current key names a saved conversation.
	const newChatCount = useRef(0);
	const [isNewThread, setIsNewThread] = useState(true);

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
		enabled: !!user,
		staleTime: 10 * 1000,
		refetchInterval: 15 * 1000,
		refetchOnWindowFocus: false,
	});

	// Fetch conversation messages
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
		setCurrentConversationId(null);
		setChatKey(`new-${(newChatCount.current += 1)}`);
		setIsNewThread(true);
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

	const handleDeleteConversation = useCallback(
		async (id: string) => {
			try {
				const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
				if (res.ok) {
					if (currentConversationId === id) handleNewChat();
					queryClient.invalidateQueries({ queryKey: ["conversations"] });
				}
			} catch (error) {
				console.error("Failed to delete conversation:", error);
			}
		},
		[currentConversationId, queryClient, handleNewChat]
	);

	const handleSelectConversation = useCallback((id: string) => {
		if (id === currentConversationId) return;
		setCurrentConversationId(id);
		setChatKey(`conv-${id}`);
		setIsNewThread(false);
		// Auto-close sidebar on mobile
		if (window.innerWidth < 768) setSidebarCollapsed(true);
	}, [currentConversationId]);

	return (
		<div className="relative z-10 flex h-full overflow-hidden">
			{/* Left sidebar */}
			<ChatSidebar
				conversations={conversations}
				currentConversationId={currentConversationId}
				onSelect={handleSelectConversation}
				onNewChat={handleNewChat}
				onDelete={handleDeleteConversation}
				collapsed={sidebarCollapsed}
				onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
			/>

			{/* Right: chat area */}
			<div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
				{/* Floating toggle for sidebar open/close */}
				<div className="absolute top-2 left-2 z-20">
					<SidebarToggleButton collapsed={sidebarCollapsed} onClick={() => setSidebarCollapsed(prev => !prev)} />
				</div>

				{/* Chat thread */}
				<div className="flex-1 overflow-hidden relative">
					{isHistoryLoading && !isNewThread ? (
						<ScrollArea className="h-full">
							<ChatHistorySkeleton />
						</ScrollArea>
					) : (
						<ChatInterface
							key={chatKey}
							initialMessages={initialMessages}
							conversationId={currentConversationId}
							model={selectedModel}
							onConversationCreated={handleConversationCreated}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
