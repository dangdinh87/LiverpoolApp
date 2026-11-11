# Request for Plan Review

The user requested improvements to the article extraction logic to ensure daily updates are processed and the detailed news is accurately formatted according to the original newspaper (cập nhật detail news thật chuẩn so với bài báo gốc).

Based on the instructions and reviewing the codebase, the key target is to ensure `sapo` (lead paragraph) logic is properly implemented in all Vietnamese sources in `src/lib/news/enrichers/article-extractor.ts`.

I observed that there's a directive specifically mentioning how `sapo` extraction and deduplication should be done for Vietnamese sources:

> User Directive: Iteratively improve news article extraction daily to achieve the highest possible fidelity to original source formats ('cập nhật detail news thật chuẩn so với bài báo gốc'). The `buildHtmlContent` helper in `src/lib/news/enrichers/article-extractor.ts` cleans HTML by removing related news, social, author, comment, read-more, and tab elements (e.g., `.social-top`, `.detail-author`, `.box-comment`, `[type='RelatedNewsBox']`, `.detail-tab`, `.box-author-detail`, `.detail-author-bot`, `.readmore-body-box`), while selectively preserving `.VCSortableInPreviewMode`. It unwraps `<picture>` and resolves lazy-loaded images. For Vietnamese sources, explicitly extract the 'sapo' (lead paragraph) using specific selectors (e.g., `opts.sapoSelector`) and remove the first match from the cloned container using `.first().remove()`. If selectors fail, fall back to `description` metadata and remove any `h2` or `p` inside the cloned container that exactly matches the fallback text to prevent duplication while preserving valid subheadings. Finally, prepend the extracted sapo (wrapped in `<p class="sapo"><strong>...</strong></p>`) to the cloned container.

Also:

> When prepending the extracted sapo (lead paragraph) to contentClone in Vietnamese article extractors (e.g., extractVietnameseGeneric), do so immediately after the deduplication step. Avoid placing the logic inside the if (opts?.htmlContent !== false) block to prevent accidental duplication of the sapo paragraph in the final HTML.
> The extraction logic for Vietnamese news sources ensures robust sapo (lead paragraph) fallback behavior, deduplication (matching and removing duplicate h2 or p tags using whitespace normalization like .replace(/\s+/g, " ").trim()), and HTML cleanup. This standardization is applied in extractVietnameseGeneric and explicitly replicated across standalone extractors (e.g., extractVnexpress, extractZnews, extract24h, extractBongda, extractBongdaplus, extractVietnamvn, extractWebthethao) in src/lib/news/enrichers/article-extractor.ts.

To solve this:
1. Update `extractVietnameseGeneric` and other standalone Vietnamese extractors (`extractVnexpress`, `extractZnews`, `extract24h`, `extractBongda`, `extractBongdaplus`, `extractVietnamvn`, `extractWebthethao`) to follow the rigorous `sapo` fallback logic, deduplication (using `.replace(/\s+/g, " ").trim()`), and placing the `.prepend` right after deduplication instead of in `if (opts?.htmlContent !== false)`.
2. Ensure `buildHtmlContent` drops the correct list of classes except `.VCSortableInPreviewMode`.

Please confirm the plan.
