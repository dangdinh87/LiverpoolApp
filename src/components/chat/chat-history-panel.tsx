"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Trash2, Search, MoreHorizontal, Plus, ChevronsLeft, ChevronsRight, ArrowLeft } from "lucide-react";
import { isToday, isYesterday, isWithinInterval, subDays, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslations } from "next-intl";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Conversation {
    id: string;
    title: string | null;
    updated_at: string;
}

export interface ChatSidebarProps {
    conversations: Conversation[];
    currentConversationId: string | null;
    onSelect: (id: string) => void;
    onNewChat: () => void;
    onDelete: (id: string) => void;
    collapsed: boolean;
    onToggleCollapse: () => void;
}

type TimeGroup = 'today' | 'yesterday' | 'last7Days' | 'older';

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

export function ChatSidebar({
    conversations,
    currentConversationId,
    onSelect,
    onNewChat,
    onDelete,
    collapsed,
    onToggleCollapse,
}: ChatSidebarProps) {
    const t = useTranslations();
    const router = useRouter();
    const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
    const [conversationToDelete, setConversationToDelete] = React.useState<Conversation | null>(null);
    const [searchQuery, setSearchQuery] = React.useState("");

    const filteredConversations = React.useMemo(() => {
        if (!searchQuery.trim()) return conversations;
        const query = searchQuery.toLowerCase();
        return conversations.filter(c =>
            c.title?.toLowerCase().includes(query)
        );
    }, [conversations, searchQuery]);

    const groupedConversations = React.useMemo(() =>
        groupConversationsByTime(filteredConversations),
        [filteredConversations]
    );

    const timeGroupLabels: Record<TimeGroup, string> = {
        today: t('history.dateRange.today'),
        yesterday: t('history.dateRange.yesterday'),
        last7Days: t('history.dateRange.last7Days'),
        older: t('chat.conversationGroups.older'),
    };

    const handleDeleteClick = (conversation: Conversation, e: React.MouseEvent) => {
        e.stopPropagation();
        setConversationToDelete(conversation);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        if (conversationToDelete) {
            onDelete(conversationToDelete.id);
        }
        setDeleteDialogOpen(false);
        setConversationToDelete(null);
    };

    const renderConversationItem = (conversation: Conversation) => (
        <div
            key={conversation.id}
            onClick={() => onSelect(conversation.id)}
            className={cn(
                "group relative flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg cursor-pointer overflow-hidden transition-colors",
                currentConversationId === conversation.id
                    ? "bg-white/10 text-white"
                    : "text-stadium-muted hover:bg-white/5 hover:text-white"
            )}
        >
            <span
                className={cn(
                    "flex-1 min-w-0 truncate",
                    currentConversationId === conversation.id && "font-medium"
                )}
                title={conversation.title || t('chat.newChat')}
            >
                {conversation.title || t('chat.newChat')}
            </span>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-stadium-muted hover:text-white hover:bg-white/10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-80 min-w-[140px] bg-stadium-surface border-stadium-border">
                    <DropdownMenuItem
                        className="cursor-pointer text-lfc-red/80 hover:text-lfc-red focus:text-lfc-red focus:bg-lfc-red/10"
                        onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleDeleteClick(conversation, e);
                        }}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('common.delete')}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );

    const renderGroup = (group: TimeGroup, items: Conversation[]) => {
        if (items.length === 0) return null;
        return (
            <div key={group} className="mb-1">
                <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-stadium-muted/50">
                    {timeGroupLabels[group]}
                </div>
                <div className="space-y-0.5">
                    {items.map((conv) => renderConversationItem(conv))}
                </div>
            </div>
        );
    };

    const hasConversations = filteredConversations.length > 0;

    return (
        <>
            {/* Mobile overlay */}
            {!collapsed && (
                <div
                    className="fixed inset-0 bg-black/50 z-65 md:hidden"
                    onClick={onToggleCollapse}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "flex flex-col bg-stadium-bg/80 transition-all duration-300 ease-in-out z-66 shrink-0",
                    // Mobile: overlay sidebar
                    "fixed inset-y-0 left-0 md:relative md:inset-auto",
                    collapsed
                        ? "-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden"
                        : "translate-x-0 w-72"
                )}
            >
                {/* Header: back + title + new chat */}
                <div className="shrink-0 p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => router.push("/")}
                                className="flex items-center gap-1 text-xs text-stadium-muted hover:text-white transition-colors rounded-md px-1.5 py-1 hover:bg-white/5"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                <span>Home</span>
                            </button>
                            <span className="text-stadium-muted/30">·</span>
                            <span className="font-bebas text-base tracking-wide text-gradient-red">
                                LiverBird AI
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onNewChat}
                        className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-white/80 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        {t('chat.newChat')}
                    </button>
                </div>

                {/* Search */}
                <div className="shrink-0 px-3 pb-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stadium-muted/50" />
                        <input
                            placeholder={t('common.search')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-8 pl-8 pr-3 text-sm rounded-lg bg-white/5 text-white placeholder:text-stadium-muted/40 outline-none focus:bg-white/8 transition-colors"
                        />
                    </div>
                </div>

                {/* Conversation list */}
                <ScrollArea className="flex-1 [&>div>div]:!block">
                    {!hasConversations ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                            <MessageSquare className="h-8 w-8 text-stadium-muted/20 mb-3" />
                            <p className="text-xs text-stadium-muted/50">
                                {searchQuery ? t('common.noResults') : t('chat.noConversations')}
                            </p>
                        </div>
                    ) : (
                        <div className="px-2 pb-2">
                            {renderGroup('today', groupedConversations.today)}
                            {renderGroup('yesterday', groupedConversations.yesterday)}
                            {renderGroup('last7Days', groupedConversations.last7Days)}
                            {renderGroup('older', groupedConversations.older)}
                        </div>
                    )}
                </ScrollArea>
            </aside>

            {/* Delete confirmation */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="z-80 max-w-sm bg-stadium-surface border-stadium-border">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-base text-white">{t('chat.deleteConfirmTitle')}</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-stadium-muted">
                            {t('chat.deleteConfirmDescription')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="border-stadium-border bg-stadium-bg hover:bg-white/5 text-white">
                            {t('common.cancel')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            className="bg-lfc-red/15 text-lfc-red hover:bg-lfc-red/25 border border-lfc-red/30"
                        >
                            {t('common.delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

/** Toggle button for sidebar open/close — always visible outside the sidebar */
export function SidebarToggleButton({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
    return (
        <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-stadium-muted hover:text-white"
            onClick={onClick}
        >
            {collapsed ? <ChevronsRight className="h-5 w-5" /> : <ChevronsLeft className="h-5 w-5" />}
        </Button>
    );
}
