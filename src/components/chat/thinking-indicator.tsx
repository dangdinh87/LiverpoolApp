"use client";

import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";

// Client-side check matching server-side needsWebSearch logic
// Kept in sync with src/lib/tools/web-search.ts
const STRONG_SIGNALS = [
	'hôm nay', 'hôm qua', 'tối nay', 'đêm qua', 'tuần này', 'tuần trước',
	'today', 'yesterday', 'tonight', 'last night', 'this week', 'last week',
	'trực tiếp', 'live score', 'live match',
	'chuyển nhượng', 'transfer news', 'transfer rumour', 'transfer rumor',
	'tin đồn', 'ký hợp đồng',
	'mới nhất', 'gần nhất', 'gần đây', 'latest news', 'recent news', 'breaking',
	'trận tới', 'trận tiếp', 'next match', 'next game', 'upcoming match',
	'lịch thi đấu',
	'bảng xếp hạng', 'current standing', 'league table', 'premier league table',
	'mùa giải hiện tại', 'this season', 'current season',
	'chấn thương', 'injury update', 'injury news', 'injury list',
	'2025', '2026',
	'search', 'tìm kiếm', 'look up', 'tra cứu',
];

const WEAK_SIGNALS = [
	'score', 'kết quả', 'tỷ số', 'tỉ số', 'result', 'fixture',
	'lineup', 'đội hình', 'standing', 'position',
	'news', 'tin tức', 'latest', 'recent',
	'hiện tại', 'currently', 'injured', 'signed',
	'transfer', 'rumour', 'rumor',
];

export function detectWebSearch(message: string): boolean {
	const lower = message.toLowerCase();
	if (STRONG_SIGNALS.some((kw) => lower.includes(kw))) return true;
	return WEAK_SIGNALS.filter((kw) => lower.includes(kw)).length >= 2;
}

// Animated thinking indicator shown while AI is processing (before first text arrives)
export function ThinkingIndicator({ isSearching = false }: { isSearching?: boolean }) {
	const t = useTranslations();
	return (
		<div className="flex items-start gap-3 px-2 py-3 max-w-3xl mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
			{/* Animated avatar */}
			<div className="relative shrink-0">
				{isSearching ? (
					<div className="size-8 rounded-full bg-gradient-to-br from-lfc-red to-lfc-red/60 flex items-center justify-center">
						<Globe className="size-4 text-white animate-spin" style={{ animationDuration: "2s" }} />
					</div>
				) : (
					<img
						src="/assets/lfc/crest.webp"
						alt="LFC"
						width={32}
						height={32}
						className="size-8 animate-pulse"
					/>
				)}
				{/* Pulse ring */}
				<div className="absolute inset-0 rounded-full bg-lfc-red/30 animate-ping" style={{ animationDuration: "1.5s" }} />
			</div>

			{/* Animated content */}
			<div className="flex-1 pt-1">
				<div className="flex items-center gap-2 mb-2">
					<span className="text-base font-medium text-muted-foreground" suppressHydrationWarning>
						{isSearching ? t("chat.searching") : t("chat.thinking")}
					</span>
				</div>

				{/* Shimmer bars */}
				<div className="space-y-2">
					<div className="h-3 rounded-full overflow-hidden bg-muted/30">
						<div
							className="h-full w-2/3 rounded-full bg-gradient-to-r from-muted/0 via-muted/60 to-muted/0 animate-shimmer"
						/>
					</div>
					<div className="h-3 rounded-full overflow-hidden bg-muted/30">
						<div
							className="h-full w-1/2 rounded-full bg-gradient-to-r from-muted/0 via-muted/60 to-muted/0 animate-shimmer"
							style={{ animationDelay: "150ms" }}
						/>
					</div>
					{isSearching && (
						<div className="h-3 rounded-full overflow-hidden bg-muted/30">
							<div
								className="h-full w-3/5 rounded-full bg-gradient-to-r from-muted/0 via-muted/60 to-muted/0 animate-shimmer"
								style={{ animationDelay: "300ms" }}
							/>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

// Better skeleton for conversation history loading
export function ChatHistorySkeleton() {
	return (
		<div className="flex-1 flex flex-col px-4 pt-4 pb-20 max-w-3xl mx-auto w-full animate-in fade-in duration-500">
			<div className="space-y-5">
				{/* Pair 1 */}
				<SkeletonAssistant widths={["w-3/4", "w-1/2", "w-2/3"]} delay={0} />
				<SkeletonUser width="w-36" delay={100} />

				{/* Pair 2 */}
				<SkeletonAssistant widths={["w-full", "w-4/5", "w-3/5", "w-2/3"]} delay={200} />
				<SkeletonUser width="w-52" delay={300} />

				{/* Pair 3 */}
				<SkeletonAssistant widths={["w-2/3", "w-1/2"]} delay={400} />
			</div>

			{/* Loading wave */}
			<div className="flex items-center justify-center gap-1.5 mt-10">
				{[0, 1, 2, 3, 4].map((i) => (
					<div
						key={i}
						className="w-1.5 rounded-full bg-primary/50 animate-wave"
						style={{
							animationDelay: `${i * 100}ms`,
							height: "12px",
						}}
					/>
				))}
			</div>
		</div>
	);
}

function SkeletonAssistant({ widths, delay }: { widths: string[]; delay: number }) {
	return (
		<div
			className="flex items-start gap-3 animate-in fade-in slide-in-from-left-2 duration-300"
			style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
		>
			<div className="size-8 rounded-full bg-gradient-to-br from-muted to-muted/50 shrink-0" />
			<div className="flex-1 space-y-2 pt-1">
				{widths.map((w, i) => (
					<div key={i} className={`h-3.5 rounded-full overflow-hidden bg-muted/40 ${w}`}>
						<div
							className="h-full w-full bg-gradient-to-r from-muted/0 via-muted/40 to-muted/0 animate-shimmer"
							style={{ animationDelay: `${i * 100}ms` }}
						/>
					</div>
				))}
			</div>
		</div>
	);
}

function SkeletonUser({ width, delay }: { width: string; delay: number }) {
	return (
		<div
			className="flex justify-end animate-in fade-in slide-in-from-right-2 duration-300"
			style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
		>
			<div className="bg-muted/40 rounded-2xl px-4 py-3">
				<div className={`h-3.5 rounded-full overflow-hidden bg-background/30 ${width}`}>
					<div className="h-full w-full bg-gradient-to-r from-background/0 via-background/30 to-background/0 animate-shimmer" />
				</div>
			</div>
		</div>
	);
}
