1.  **Refactor `extractVietnameseGeneric`**:
    *   Enhance the robust `sapo` (lead paragraph) extraction logic. If `opts.sapoSelector` yields no result or is not provided, fall back to checking `description` metadata (already passed in via `$('meta[property="og:description"]')`).
    *   If fallback is used, remove any `h2` or `p` tag inside the `contentClone` that exactly matches the fallback text (after trimming and collapsing spaces) to prevent duplication while preserving valid subheadings.
    *   Prepend the extracted sapo (wrapped in `<p class="sapo"><strong>...</strong></p>`) to the cloned container before calling `buildHtmlContent`.

2.  **Ensure all other VN Extractors conform**:
    *   Check `extract24h`, `extractBongda`, `extractBongdaplus`, `extractZnews`, `extractVnexpress` to make sure they are utilizing similar fallback logic or update them to use `extractVietnameseGeneric` / similar robust extraction for Sapo.
    *   Given the memory notes, "For Vietnamese sources, explicitly extract the 'sapo' (lead paragraph) using specific selectors (e.g., `opts.sapoSelector`) and remove the first match from the cloned container using `.first().remove()`. If selectors fail, fall back to `description` metadata and remove any `h2` or `p` inside the cloned container that exactly matches the fallback text to prevent duplication while preserving valid subheadings. Finally, prepend the extracted sapo (wrapped in `<p class="sapo"><strong>...</strong></p>`) to the cloned container."

3.  **Refactor `buildHtmlContent`**:
    *   As per memory: "The `buildHtmlContent` helper ... cleans HTML by removing related news, social, author, comment, read-more, and tab elements (e.g., `.social-top`, `.detail-author`, `.box-comment`, `[type='RelatedNewsBox']`, `.detail-tab`, `.box-author-detail`, `.detail-author-bot`, `.readmore-body-box`), while selectively preserving `.VCSortableInPreviewMode`."
    *   Add the missing selectors to `container.find(...).remove()` inside `buildHtmlContent`.

4.  **Complete pre-commit steps**:
    *   Run tests, verification, and linting.

5.  **Submit**.
