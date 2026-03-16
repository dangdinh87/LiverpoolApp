"use client";

import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { Globe, ExternalLink, Loader2, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface SearchSource {
	title: string;
	url: string;
	snippet: string;
}

export const WebSearchTool: ToolCallMessagePartComponent = ({
	argsText,
	result,
	status,
}) => {
	const [isExpanded, setIsExpanded] = useState(true); // Auto-expand to show citation targets
	const t = useTranslations("chat");

	// Parse args to get the query
	let query = "";
	try {
		const args = JSON.parse(argsText);
		query = args.query || "";
	} catch {
		query = argsText;
	}

	// Parse result
	let sources: SearchSource[] = [];
	if (result != null) {
		try {
			const parsed = typeof result === "string" ? JSON.parse(result) : result;
			if (Array.isArray(parsed?.results)) {
				sources = parsed.results;
			} else if (Array.isArray(parsed)) {
				sources = parsed;
			}
		} catch {
			// ignore
		}
	}

	const isRunning = status?.type === "running";
	const hasCompleted = !isRunning && result != null;

	// Simple loading state
	if (isRunning) {
		return (
			<div className="my-2 flex items-center gap-2 text-base text-stadium-muted">
				<Loader2 className="size-4 animate-spin text-lfc-red" />
				<span>{t("searching")}</span>
			</div>
		);
	}

	// Completed: show collapsible source list
	if (!hasCompleted || sources.length === 0) return null;

	return (
		<div className="my-2">
			<button
				type="button"
				onClick={() => setIsExpanded(!isExpanded)}
				className="flex items-center gap-1.5 text-sm text-stadium-muted hover:text-white transition-colors"
			>
				<Globe className="size-3.5" />
				<span>{sources.length} {t("sources")}</span>
				<ChevronDown className={cn(
					"size-3 transition-transform",
					isExpanded && "rotate-180",
				)} />
			</button>

			{isExpanded && (
				<div className="mt-2 space-y-1 rounded-lg border border-stadium-border bg-stadium-surface/40 p-2">
					{sources.map((s, i) => (
						<a
							key={i}
							id={`citation-${i + 1}`}
							href={s.url}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-start gap-2 rounded-md p-1.5 hover:bg-white/5 transition-colors group"
						>
							<span className="inline-flex items-center justify-center size-4 rounded-full bg-lfc-red/20 text-lfc-red text-[10px] font-bold shrink-0 mt-0.5">
								{i + 1}
							</span>
							<div className="min-w-0">
								<p className="text-sm font-medium truncate group-hover:text-lfc-red transition-colors">
									{s.title || new URL(s.url).hostname}
								</p>
								{s.snippet && (
									<p className="text-xs text-stadium-muted line-clamp-2 mt-0.5">
										{s.snippet}
									</p>
								)}
							</div>
						</a>
					))}
				</div>
			)}
		</div>
	);
};
