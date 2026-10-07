"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
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
import type { Conversation } from "@/lib/chat/conversation-types";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

    const renderConversationItem = (conversation: Conversation) => {
        const active = currentConversationId === conversation.id;
        const title = conversation.title || t('chat.newChat');
        return (
            <div
                key={conversation.id}
                className={cn(
                    "group relative flex items-center rounded-lg transition-colors",
                    active ? "bg-white/10 text-white" : "text-stadium-muted hover:bg-white/5 hover:text-white"
                )}
            >
                {/* The row is a real button (keyboard + screen readers); the options menu is its sibling. */}
                <button
                    type="button"
                    onClick={() => onSelect(conversation.id)}
                    aria-current={active ? "true" : undefined}
                    title={title}
                    className={cn(
                        "min-h-11 min-w-0 flex-1 truncate rounded-lg py-2.5 pl-3 pr-12 text-left text-base",
                        active && "font-medium"
                    )}
                >
                    {title}
                </button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t('chat.conversationOptions')}
                            className="absolute right-0 top-1/2 size-11 -translate-y-1/2 text-stadium-muted transition-opacity hover:bg-white/10 hover:text-white md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 md:data-[state=open]:opacity-100"
                        >
                            <MoreHorizontal className="size-4" aria-hidden />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-80 min-w-[140px] bg-stadium-surface border-stadium-border">
                        <DropdownMenuItem
                            className="min-h-11 cursor-pointer text-lfc-red-text hover:text-white focus:text-white focus:bg-lfc-red/20"
                            onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                handleDeleteClick(conversation, e);
                            }}
                        >
                            <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                            {t('common.delete')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        );
    };

    const renderGroup = (group: TimeGroup, items: Conversation[]) => {
        if (items.length === 0) return null;
        return (
            <div key={group} className="mb-1">
                <div className="px-3 py-2 text-xs font-semibold uppercase tracking-widest text-stadium-muted">
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
                inert={collapsed}
                className={cn(
                    "flex flex-col border-r border-[var(--line)] bg-stadium-bg transition-all duration-300 ease-in-out z-66 shrink-0 md:border-r-0 md:bg-stadium-bg/80",
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
                            <Link
                                href="/"
                                className="flex min-h-11 items-center gap-1 rounded-md px-2 text-sm text-stadium-muted transition-colors hover:bg-white/5 hover:text-white"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                                <span>{t('Common.nav.home')}</span>
                            </Link>
                            <span aria-hidden className="text-stadium-muted">·</span>
                            <span className="font-bebas text-lg tracking-wide text-gradient-red">
                                LiverBird AI
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onNewChat}
                        className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2.5 text-base text-white/80 transition-colors hover:bg-white/10 hover:text-white bg-white/5"
                    >
                        <Plus className="h-4 w-4" aria-hidden />
                        {t('chat.newChat')}
                    </button>
                </div>

                {/* Search */}
                <div className="shrink-0 px-3 pb-2">
                    <div className="relative">
                        <Search aria-hidden className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stadium-muted" />
                        <input
                            type="search"
                            placeholder={t('common.search')}
                            aria-label={t('common.search')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-11 w-full rounded-lg bg-white/5 pl-9 pr-3 text-base text-white outline-none transition-colors placeholder:text-stadium-muted focus:bg-white/10"
                        />
                    </div>
                </div>

                {/* Conversation list */}
                <ScrollArea className="flex-1 [&>div>div]:!block">
                    {!hasConversations ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                            <MessageSquare aria-hidden className="mb-3 h-8 w-8 text-stadium-muted" />
                            <p className="text-sm text-stadium-muted">
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
                            className="bg-lfc-red/15 text-lfc-red-text hover:bg-lfc-red/25 border border-lfc-red/30"
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
    const t = useTranslations('chat.sidebar');
    const label = collapsed ? t('open') : t('close');
    return (
        <Button
            variant="ghost"
            size="icon"
            className="size-11 text-stadium-muted hover:text-white"
            onClick={onClick}
            aria-label={label}
            aria-expanded={!collapsed}
            title={label}
        >
            {collapsed ? <ChevronsRight className="h-5 w-5" aria-hidden /> : <ChevronsLeft className="h-5 w-5" aria-hidden />}
        </Button>
    );
}
