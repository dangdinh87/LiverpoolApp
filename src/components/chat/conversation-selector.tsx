"use client";

import * as React from "react";
import { Check, ChevronsUpDown, MessageSquare, Plus, Trash2, MoreHorizontal, Search } from "lucide-react";
import { isToday, isYesterday, isWithinInterval, subDays, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslations } from "next-intl";
import type { Conversation } from "@/lib/chat/conversation-types";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ConversationSelectorProps {
	conversations: Conversation[];
	currentConversationId: string | null;
	onSelect: (id: string) => void;
	onNewChat: () => void;
	onDelete: (id: string) => void;
	compact?: boolean;
}

type TimeGroup = "today" | "yesterday" | "last7Days" | "older";

interface GroupedConversations {
	today: Conversation[];
	yesterday: Conversation[];
	last7Days: Conversation[];
	older: Conversation[];
}

function groupConversationsByTime(conversations: Conversation[]): GroupedConversations {
	const now = new Date();
	const sevenDaysAgo = startOfDay(subDays(now, 7));

	const groups: GroupedConversations = {
		today: [],
		yesterday: [],
		last7Days: [],
		older: [],
	};

	conversations.forEach((conversation) => {
		const updatedAt = new Date(conversation.updated_at);

		if (isToday(updatedAt)) {
			groups.today.push(conversation);
		} else if (isYesterday(updatedAt)) {
			groups.yesterday.push(conversation);
		} else if (isWithinInterval(updatedAt, { start: sevenDaysAgo, end: now })) {
			groups.last7Days.push(conversation);
		} else {
			groups.older.push(conversation);
		}
	});

	return groups;
}

export function ConversationSelector({
	conversations,
	currentConversationId,
	onSelect,
	onNewChat,
	onDelete,
	compact = false,
}: ConversationSelectorProps) {
	const [open, setOpen] = React.useState(false);
	const [searchQuery, setSearchQuery] = React.useState("");
	const t = useTranslations();

	const selectedConversation = conversations.find((c) => c.id === currentConversationId);

	const filteredConversations = conversations.filter((c) =>
		(c.title || t("chat.newChat")).toLowerCase().includes(searchQuery.toLowerCase())
	);

	const groupedConversations = React.useMemo(
		() => groupConversationsByTime(filteredConversations),
		[filteredConversations]
	);

	const timeGroupLabels: Record<TimeGroup, string> = {
		today: t("history.dateRange.today"),
		yesterday: t("history.dateRange.yesterday"),
		last7Days: t("history.dateRange.last7Days"),
		older: t("chat.conversationGroups.older"),
	};

	const renderConversationItem = (conversation: Conversation) => {
		const active = currentConversationId === conversation.id;
		const title = conversation.title || t("chat.newChat");
		return (
			<div
				key={conversation.id}
				className="group relative flex items-center rounded-sm text-sm hover:bg-accent focus-within:bg-accent"
			>
				<button
					type="button"
					className={cn("flex min-h-11 min-w-0 flex-1 items-center gap-2 py-2 pl-2 pr-12 text-left", active && "font-medium text-primary")}
					aria-current={active ? "true" : undefined}
					title={title}
					onClick={() => {
						onSelect(conversation.id);
						setOpen(false);
					}}
				>
					<span className="block truncate">{title}</span>
					{active && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />}
				</button>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							aria-label={t("chat.conversationOptions")}
							className="absolute right-0 top-1/2 size-11 -translate-y-1/2 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 sm:data-[state=open]:opacity-100"
						>
							<MoreHorizontal className="size-4" aria-hidden />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="z-80">
						<DropdownMenuItem
							className="min-h-11 text-destructive focus:text-destructive"
							onClick={(e: React.MouseEvent) => {
								e.stopPropagation();
								onDelete(conversation.id);
							}}
						>
							<Trash2 className="mr-2 h-4 w-4" aria-hidden />
							{t("common.delete")}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		);
	};

	const renderGroup = (group: TimeGroup, conversations: Conversation[]) => {
		if (conversations.length === 0) return null;
		return (
			<div key={group} className="py-1">
				<div className="px-2 py-1 text-xs font-medium text-muted-foreground">{timeGroupLabels[group]}</div>
				{conversations.map(renderConversationItem)}
			</div>
		);
	};

	const hasConversations = filteredConversations.length > 0;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className={cn(
						"justify-between bg-muted/50 hover:bg-muted border-0",
						compact ? "h-11 w-full gap-1 px-2 text-sm" : "w-[280px] h-9"
					)}
				>
					<div className="flex items-center gap-1.5 truncate min-w-0">
						{!compact && <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />}
						<span className="truncate text-left">{selectedConversation?.title || t("chat.newChat")}</span>
					</div>
					<ChevronsUpDown className={cn("shrink-0 opacity-50", compact ? "h-3 w-3" : "ml-2 h-4 w-4")} />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[280px] p-0 z-80 font-barlow" align="start">
				<div className="p-2">
					<div className="relative">
						<Search aria-hidden className="absolute left-2 top-3.5 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder={t("common.search")}
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="h-11 pl-8 text-base"
							aria-label={t("common.search")}
						/>
					</div>
				</div>
				<button
					type="button"
					className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-primary hover:bg-muted"
					onClick={() => {
						onNewChat();
						setOpen(false);
					}}
				>
					<Plus className="h-4 w-4" aria-hidden />
					<span className="font-medium text-sm">{t("chat.newChat")}</span>
				</button>
				<ScrollArea className="h-[300px]">
					{!hasConversations ? (
						<div className="p-4 text-center text-sm text-muted-foreground">{t("errors.notFound")}</div>
					) : (
						<div className="p-1">
							{renderGroup("today", groupedConversations.today)}
							{renderGroup("yesterday", groupedConversations.yesterday)}
							{renderGroup("last7Days", groupedConversations.last7Days)}
							{renderGroup("older", groupedConversations.older)}
						</div>
					)}
				</ScrollArea>
			</PopoverContent>
		</Popover>
	);
}
