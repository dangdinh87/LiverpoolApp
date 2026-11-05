1. **Update `buildHtmlContent` in `src/lib/news/enrichers/article-extractor.ts`**
   - Add `.detail-tab, .box-author-detail, .detail-author-bot` to the first `container.find(...).remove()` call and preserve `.VCSortableInPreviewMode`.
   - Ensure `.readmore-body-box` is in the second `container.find(...).remove()` call and preserve `.VCSortableInPreviewMode`.
2. **Update `extractVietnameseGeneric`**
   - Implement the `sapo` extraction logic on `contentClone`, removing `.first()`.
   - Fall back to `description` with whitespace-normalized deduplication on `h2, p`.
   - `prepend` the sapo immediately after deduplication, outside the `opts?.htmlContent !== false` block.
3. **Replicate the `sapo` logic across standalone extractors**
   - `extractVnexpress`, `extractZnews`, `extract24h`, `extractBongda`, `extractBongdaplus`, `extractVietnamvn`, `extractWebthethao` all need the same fallback and `prepend` logic.
4. **Pre-commit checks**
   - Ensure proper testing, verification, review, and reflection are done using `pre_commit_instructions`.
5. **Submit**
