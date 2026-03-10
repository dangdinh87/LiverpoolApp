"use client";

import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { Globe, ExternalLink, Loader2, ChevronDown } from "lucide-react";
import { useState } from "react";
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
	const [isExpanded, setIsExpanded] = useState(false);

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
			<div className="my-2 flex items-center gap-2 text-sm text-stadium-muted">
				<Loader2 className="size-4 animate-spin text-lfc-red" />
				<span>Searching the web...</span>
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
				className="flex items-center gap-1.5 text-xs text-stadium-muted hover:text-white transition-colors"
			>
				<Globe className="size-3.5" />
				<span>{sources.length} source{sources.length !== 1 ? "s" : ""}</span>
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
							href={s.url}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-start gap-2 rounded-md p-1.5 hover:bg-white/5 transition-colors group"
						>
							<ExternalLink className="size-3 mt-0.5 text-stadium-muted shrink-0 group-hover:text-lfc-red" />
							<div className="min-w-0">
								<p className="text-xs font-medium truncate group-hover:text-lfc-red transition-colors">
									{s.title || new URL(s.url).hostname}
								</p>
								{s.snippet && (
									<p className="text-[11px] text-stadium-muted line-clamp-1 mt-0.5">
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
