# Phase 5: Testing & Quality

## Context
- [plan.md](./plan.md) | Depends on all prior phases
- No test framework currently installed (no vitest/jest in package.json)
- Pure utility functions (dedup, relevance, categories) are highly testable
- HTTP-dependent code (adapters, pipeline) needs mock fixtures

## Overview
Set up Vitest, write unit tests for pipeline utility functions, add mock HTTP fixtures for adapter integration tests, and add basic component snapshot tests.

## Key Insights
- Vitest is fastest for Next.js projects (native ESM, compatible with React.cache)
- Pure functions (dedup, relevance, categories, readingTime, validation) cover most critical logic
- Adapter tests use saved RSS XML / HTML fixtures (no live HTTP in CI)
- Component snapshot tests catch unintended UI regressions
- Keep test scope narrow — fan project, not enterprise. Focus on the functions most likely to regress.

## Requirements
1. Install Vitest + testing-library
2. Unit tests for `dedup.ts` — URL dedup + Jaccard similarity
3. Unit tests for `relevance.ts` — scoring function
4. Unit tests for `categories.ts` — categorization rules
5. Unit tests for `validation.ts` — Zod schema edge cases
6. Unit tests for `enrichers/readability.ts` — reading time estimation
7. Integration tests for `pipeline.ts` with mock adapters
8. Mock HTTP fixtures for adapter tests (saved RSS XML files)

## Architecture

### Test Structure
```
src/lib/news/__tests__/
  dedup.test.ts
  relevance.test.ts
  categories.test.ts
  validation.test.ts
  readability.test.ts
  pipeline.test.ts
__fixtures__/
  bbc-feed.xml
  guardian-feed.xml
  lfc-page.html
  bongdaplus-page.html
```

### Vitest Config
```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
```

### Example Tests

#### Dedup Tests
```typescript
// src/lib/news/__tests__/dedup.test.ts
import { describe, it, expect } from "vitest";
import { deduplicateArticles } from "../dedup";
import type { NewsArticle } from "../types";

const makeArticle = (title: string, link: string): NewsArticle => ({
  title, link, pubDate: new Date().toISOString(),
  contentSnippet: "", source: "bbc", language: "en",
});

describe("deduplicateArticles", () => {
  it("removes exact URL duplicates", () => {
    const articles = [
      makeArticle("Title A", "https://bbc.co.uk/sport/1"),
      makeArticle("Title B", "https://www.bbc.co.uk/sport/1/"),
    ];
    expect(deduplicateArticles(articles)).toHaveLength(1);
  });

  it("removes near-duplicate titles (Jaccard > 0.6)", () => {
    const articles = [
      makeArticle("Liverpool beat Arsenal 3-1 in Premier League", "https://bbc.co.uk/1"),
      makeArticle("Liverpool beat Arsenal 3-1 in the Premier League", "https://guardian.com/1"),
    ];
    expect(deduplicateArticles(articles)).toHaveLength(1);
  });

  it("keeps articles with different titles", () => {
    const articles = [
      makeArticle("Salah scores hat-trick", "https://bbc.co.uk/1"),
      makeArticle("Van Dijk signs new contract", "https://guardian.com/1"),
    ];
    expect(deduplicateArticles(articles)).toHaveLength(2);
  });
});
```

#### Relevance Tests
```typescript
// src/lib/news/__tests__/relevance.test.ts
describe("scoreArticle", () => {
  it("scores LFC-specific article higher than generic PL article", () => {
    const lfcArticle = makeArticle("Liverpool sign new striker from Anfield", ...);
    const genericArticle = makeArticle("Premier League roundup week 25", ...);
    expect(scoreArticle(lfcArticle)).toBeGreaterThan(scoreArticle(genericArticle));
  });

  it("scores fresh articles higher than old ones", () => {
    const fresh = { ...makeArticle("Test", ...), pubDate: new Date().toISOString() };
    const old = { ...makeArticle("Test", ...), pubDate: new Date(Date.now() - 7 * 86400000).toISOString() };
    expect(scoreArticle(fresh)).toBeGreaterThan(scoreArticle(old));
  });
});
```

#### Categories Tests
```typescript
// src/lib/news/__tests__/categories.test.ts
describe("categorizeArticle", () => {
  it("detects match reports", () => {
    expect(categorizeArticle(makeArticle("Liverpool 3-1 Arsenal: Match Report", ...))).toBe("match-report");
  });
  it("detects transfers", () => {
    expect(categorizeArticle(makeArticle("Liverpool close to signing midfielder in $50m deal", ...))).toBe("transfer");
  });
  it("defaults to general", () => {
    expect(categorizeArticle(makeArticle("Liverpool news roundup", ...))).toBe("general");
  });
});
```

#### Pipeline Integration Test
```typescript
// src/lib/news/__tests__/pipeline.test.ts
import { fetchAllNews } from "../pipeline";
import type { FeedAdapter } from "../adapters/base";

class MockAdapter implements FeedAdapter {
  name = "mock";
  constructor(private articles: NewsArticle[]) {}
  async fetch() { return this.articles; }
}

describe("fetchAllNews", () => {
  it("merges, deduplicates, and sorts articles from multiple adapters", async () => {
    const adapter1 = new MockAdapter([makeArticle("A", "https://a.com/1")]);
    const adapter2 = new MockAdapter([makeArticle("B", "https://b.com/1")]);
    const result = await fetchAllNews([adapter1, adapter2], 10);
    expect(result).toHaveLength(2);
  });

  it("handles adapter failure gracefully", async () => {
    const good = new MockAdapter([makeArticle("A", "https://a.com/1")]);
    const bad: FeedAdapter = { name: "bad", fetch: () => Promise.reject(new Error("fail")) };
    const result = await fetchAllNews([good, bad], 10);
    expect(result).toHaveLength(1);
  });

  it("returns empty array when all adapters fail", async () => {
    const bad: FeedAdapter = { name: "bad", fetch: () => Promise.reject(new Error("fail")) };
    const result = await fetchAllNews([bad], 10);
    expect(result).toHaveLength(0);
  });
});
```

## Related Code Files
- `src/lib/news/dedup.ts` — unit under test
- `src/lib/news/relevance.ts` — unit under test
- `src/lib/news/categories.ts` — unit under test
- `src/lib/news/validation.ts` — unit under test
- `src/lib/news/enrichers/readability.ts` — unit under test (readingTime)
- `src/lib/news/pipeline.ts` — integration test
- `vitest.config.ts` — NEW
- `package.json` — add vitest scripts

## Implementation Steps

### Step 1: Install Vitest
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```
Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

### Step 2: Create `vitest.config.ts`
- Node environment (server-side code)
- Path aliases matching `tsconfig.json`
- Include `src/**/*.test.ts`

### Step 3: Handle `import "server-only"` in tests
- Create `src/lib/news/__tests__/setup.ts` that mocks `server-only` module
- Or configure vitest to alias `server-only` to empty module:
```typescript
// vitest.config.ts
resolve: {
  alias: {
    "server-only": path.resolve(__dirname, "src/lib/news/__tests__/server-only-mock.ts"),
  },
}
```

### Step 4: Write dedup tests
- URL normalization edge cases (trailing slash, www, http vs https)
- Jaccard threshold boundary (0.59 = keep, 0.61 = remove)
- Empty array handling

### Step 5: Write relevance tests
- Keyword match scoring
- Source priority weighting
- Freshness decay (fresh vs old)
- Edge case: invalid date string

### Step 6: Write categories tests
- Each category rule (match-report, transfer, injury, etc.)
- Default to "general" when no pattern matches
- Case insensitivity

### Step 7: Write validation tests
- Valid RSS item passes
- Missing title rejects
- Invalid URL rejects
- Missing optional fields default correctly

### Step 8: Write readability tests
- `estimateReadingTime()` for various word counts
- Edge case: empty string = 1 min

### Step 9: Write pipeline integration tests
- Multiple adapters merge correctly
- Single adapter failure doesn't break pipeline
- All adapters fail = empty array
- Dedup + scoring integrated correctly

### Step 10: Create HTTP fixtures (optional, lower priority)
- Save sample RSS XML from BBC, Guardian
- Save sample HTML from LFC, Bongdaplus
- Use in adapter unit tests to verify parsing without live HTTP

### Step 11: CI integration
- Add `npm test` to build script or GitHub Actions (if applicable)
- Tests must pass before deploy

## Todo List
- [ ] Install vitest + testing-library
- [ ] Create vitest.config.ts
- [ ] Mock `server-only` for test environment
- [ ] Write dedup.test.ts (URL + Jaccard)
- [ ] Write relevance.test.ts (scoring)
- [ ] Write categories.test.ts (rule matching)
- [ ] Write validation.test.ts (Zod schema)
- [ ] Write readability.test.ts (reading time)
- [ ] Write pipeline.test.ts (integration)
- [ ] Save HTTP fixtures (optional)
- [ ] Add test script to package.json
- [ ] Run all tests green

## Success Criteria
- All tests pass (`vitest run` exits 0)
- Dedup tests cover URL normalization + Jaccard threshold boundary
- Relevance tests verify scoring order (LFC article > generic article)
- Categories tests cover all 6 rules + default
- Pipeline integration test verifies adapter failure isolation
- Tests run in < 5 seconds (no HTTP, no browser)

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `server-only` import breaks vitest | High | Medium | Mock module in vitest config alias |
| Tests flaky due to Date.now() in freshness scoring | Medium | Low | Use `vi.useFakeTimers()` for deterministic dates |
| jsdom dependency in readability tests heavy | Low | Low | readingTime is pure function, no jsdom needed for that test |

## Security Considerations
- Test fixtures should not contain real user data
- No API keys or secrets in test files
- Mock adapters don't make real HTTP requests

## Unresolved Questions
- Should we add component snapshot tests for `NewsFeed`, `CategoryTabs`? Lower priority for a fan site but prevents UI regressions. Consider adding in a future pass if the project grows.
