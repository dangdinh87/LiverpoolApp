"use client";

import { Fragment, memo, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";

function renderInline(text: string): ReactNode[] {
  const pattern =
    /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\((?:https?:\/\/|\/)[^)\s]+\)|\*[^*\s][^*]*\*)/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of text.matchAll(pattern)) {
    const idx = match.index ?? 0;
    if (idx > lastIndex) {
      nodes.push(text.slice(lastIndex, idx));
    }
    const token = match[0];

    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(
        <strong key={key++} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(
        <code
          key={key++}
          className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.85em] text-white"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("[")) {
      const linkMatch = /^\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)\s]+)\)$/.exec(
        token,
      );
      if (linkMatch) {
        const [, label, href] = linkMatch;
        if (href.startsWith("/")) {
          const normalized = href.replace(/^\/(vi|en)(?=\/|$)/, "") || "/";
          nodes.push(
            <Link
              key={key++}
              href={normalized}
              className="text-brand underline underline-offset-2 hover:text-white"
            >
              {label}
            </Link>,
          );
        } else {
          nodes.push(
            <a
              key={key++}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand underline underline-offset-2 hover:text-white"
            >
              {label}
            </a>,
          );
        }
      } else {
        nodes.push(token);
      }
    } else if (token.startsWith("*") && token.endsWith("*")) {
      nodes.push(
        <em key={key++} className="italic text-white/95">
          {token.slice(1, -1)}
        </em>,
      );
    } else {
      nodes.push(token);
    }

    lastIndex = idx + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

/**
 * Lightweight, XSS-safe markdown renderer for assistant prose (paragraphs,
 * bullet/numbered lists, bold, italic, inline code, and internal/external links).
 */
export const AssistantMarkdown = memo(function AssistantMarkdown({
  content,
}: {
  content: string;
}) {
  const blocks = content.trim().split(/\n{2,}/).filter(Boolean);

  return (
    <div className="space-y-2 text-[13.5px] leading-relaxed text-white/90">
      {blocks.map((block, blockIdx) => {
        const lines = block.split("\n").map((l) => l.trimEnd());
        const isUnordered = lines.every((l) => /^[-*•]\s+/.test(l.trim()));
        if (isUnordered) {
          return (
            <ul
              key={blockIdx}
              className="list-disc space-y-1 pl-4 marker:text-lfc-red-text"
            >
              {lines.map((line, i) => (
                <li key={i}>
                  {renderInline(line.trim().replace(/^[-*•]\s+/, ""))}
                </li>
              ))}
            </ul>
          );
        }

        const isOrdered = lines.every((l) => /^\d+[.)]\s+/.test(l.trim()));
        if (isOrdered) {
          return (
            <ol
              key={blockIdx}
              className="list-decimal space-y-1 pl-4 marker:text-stadium-muted"
            >
              {lines.map((line, i) => (
                <li key={i}>
                  {renderInline(line.trim().replace(/^\d+[.)]\s+/, ""))}
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={blockIdx}>
            {lines.map((line, lineIdx) => (
              <Fragment key={lineIdx}>
                {lineIdx > 0 && <br />}
                {renderInline(line)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
});
