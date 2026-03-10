"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";
import { useAuthStore } from "@/stores/auth-store";
import { Loader2, LogIn } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ChatSidebar, SidebarToggleButton } from "@/components/chat/chat-history-panel";
import { ChatHistorySkeleton } from "@/components/chat/thinking-indicator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type { UIMessage } from "ai";
import { DEFAULT_CHAT_AI_MODEL } from "@/config/constants";

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
			<Thread />
		</AssistantRuntimeProvider>
	);
};

export default function ChatPage() {
	const router = useRouter();
	const { user, isLoading: authLoading } = useAuthStore();
	const t = useTranslations();
	const queryClient = useQueryClient();

	const selectedModel = DEFAULT_CHAT_AI_MODEL;

	const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [chatKey, setChatKey] = useState(() => `new-${Date.now()}`);
	const [isNewThread, setIsNewThread] = useState(true);

	// Fetch conversations
	const { data: conversations = [] } = useQuery<any[]>({
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
			return (data.messages || []).map((msg: any) => ({
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
		setChatKey(`new-${Date.now()}`);
		setIsNewThread(true);
	}, []);

	const handleConversationCreated = useCallback(
		(id: string, title: string) => {
			setCurrentConversationId(id);
			queryClient.setQueryData(["conversations", user?.id], (old: any[] = []) => {
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

	// Auth loading
	if (authLoading) {
		return (
			<div className="flex h-full items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	// Not logged in
	if (!user) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-4 p-8 relative overflow-hidden">
				<div className="relative z-10 flex flex-col items-center gap-4">
					<div className="hover:scale-105 transition-transform duration-300">
						<Image
							src="/assets/lfc/crest.webp"
							alt="LFC"
							width={72}
							height={72}
							className="drop-shadow-[0_0_20px_rgba(200,16,46,0.4)]"
						/>
					</div>
					<div className="text-center">
						<h1 className="font-bebas text-3xl tracking-wide text-gradient-red">
							LiverBird AI
						</h1>
						<p className="text-sm text-muted-foreground mt-1 max-w-md" suppressHydrationWarning>
							{t("chat.subtitle")}
						</p>
					</div>
					<Button onClick={() => router.push("/auth/login")} size="lg" className="glow-red">
						<LogIn className="mr-2 h-4 w-4" />
						<span suppressHydrationWarning>{t("auth.pleaseLogin")}</span>
					</Button>
				</div>
			</div>
		);
	}

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
