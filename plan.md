1. **Update `buildHtmlContent` in `article-extractor.ts`:**
   - Add `.detail-tab`, `.box-author-detail`, `.detail-author-bot`, `.readmore-body-box` to the list of elements removed unconditionally.

2. **Standardize Sapo Extraction and Deduplication in Vietnamese Extractors:**
   - Modify `extractVietnameseGeneric` to extract sapo from `contentClone`, fallback to `description` metadata, deduplicate exact matches (using whitespace normalization), and unconditionally prepend the sapo paragraph to `contentClone` right after deduplication.
   - Replicate this exact standard sapo extraction logic across the standalone extractors: `extractVnexpress`, `extractZnews`, `extract24h`, `extractBongda`, `extractBongdaplus`, `extractVietnamvn`, `extractWebthethao`.

3. **Verify and Pre-commit:**
   - Run linter and tests to make sure no errors were introduced.
   - Follow pre-commit instructions for quality checks.

4. **Submit changes:**
   - Submit with descriptive git message.
