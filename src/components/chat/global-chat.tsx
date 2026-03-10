"use client";

import { useMemo, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";
import { useAuthStore } from "@/stores/auth-store";

import { Button } from "@/components/ui/button";
import { X, Minus, Maximize2, MessageCircle } from "lucide-react";
import type { UIMessage } from "ai";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ConversationSelector } from "@/components/chat/conversation-selector";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_CHAT_AI_MODEL } from "@/config/constants";

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
	const transport = useMemo(
		() =>
			new AssistantChatTransport({
				api: "/api/chat-groq",
				body: {
					model: model,
					conversationId: conversationId,
				},
			}),
		[model, conversationId]
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

export function GlobalChat() {
	const pathname = usePathname();
	const { user } = useAuthStore();

	// Hide on dedicated chat page and when not logged in
	if (pathname === "/chat") return null;
	if (!user) return null;

	return <GlobalChatInner />;
}

function GlobalChatInner() {
	const { user } = useAuthStore();
	const [isOpen, setIsOpen] = useState(false);
	const queryClient = useQueryClient();

	// Chat state
	const [isNewThread, setIsNewThread] = useState(true);
	const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
	const [chatKey, setChatKey] = useState(() => `new-${Date.now()}`);
	const selectedModel = DEFAULT_CHAT_AI_MODEL;

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
		setIsNewThread(true);
		setCurrentConversationId(null);
		setChatKey(`new-${Date.now()}`);
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
			{/* FAB trigger button — bottom right */}
			<div className="fixed bottom-5 right-5 z-[70]">
				{/* Pulse ring when closed */}
				{!isOpen && (
					<span className="absolute inset-0 rounded-full animate-ping bg-lfc-red/20" />
				)}
				<button
					type="button"
					onClick={() => setIsOpen(!isOpen)}
					className={cn(
						"relative flex items-center justify-center rounded-full transition-all duration-300",
						"size-14 hover:scale-110 active:scale-95",
						isOpen
							? "bg-stadium-surface border border-stadium-border text-white shadow-lg"
							: "bg-lfc-red text-white shadow-[0_0_24px_rgba(200,16,46,0.4)]"
					)}
					aria-label="Toggle chat"
				>
					{isOpen ? (
						<Minus className="size-6" />
					) : (
						<MessageCircle className="size-7" />
					)}
				</button>
			</div>

			{/* Chat popup */}
			<div
				className={cn(
					"fixed bottom-24 right-5 z-[70] flex flex-col rounded-2xl border border-stadium-border bg-stadium-bg shadow-2xl shadow-black/40 transition-all duration-300 origin-bottom-right font-barlow",
					"w-[380px] h-[600px] max-h-[80vh]",
					// Mobile: full width
					"max-sm:bottom-0 max-sm:right-0 max-sm:left-0 max-sm:top-0 max-sm:w-full max-sm:h-full max-sm:max-h-full max-sm:rounded-none",
					isOpen
						? "translate-y-0 scale-100 opacity-100 pointer-events-auto"
						: "translate-y-4 scale-95 opacity-0 pointer-events-none"
				)}
			>
				{/* Header */}
				<div className="flex items-center gap-2 px-3 py-2.5 border-b border-stadium-border bg-stadium-surface/50 rounded-t-2xl max-sm:rounded-t-none shrink-0">
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
						<Link href="/chat" onClick={() => setIsOpen(false)}>
							<Button
								variant="ghost"
								size="icon"
								className="h-7 w-7 text-stadium-muted hover:text-white"
								title="Open full chat"
							>
								<Maximize2 className="h-3.5 w-3.5" />
							</Button>
						</Link>
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7 text-stadium-muted hover:text-white"
							onClick={() => setIsOpen(false)}
						>
							<X className="h-3.5 w-3.5" />
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
