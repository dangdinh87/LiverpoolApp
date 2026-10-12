import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Build output, not source. Linting it produced thousands of findings
    // in minified bundles that drowned out real issues in src/.
    ".vercel/**",
    // Per-agent build output (NEXT_DIST_DIR=.build-ui / .build-live). Gitignored,
    // but eslint does not read .gitignore: without this, `npm run lint` reports
    // 42k findings in minified bundles and hides the ~13 real ones in src/.
    ".build-*/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
  ]),
  {
    rules: {
      // An argument or binding prefixed with `_` is unused on purpose — most often
      // a parameter a provider must declare to satisfy its interface. Without this
      // the only way to silence it is to delete the parameter, which breaks the
      // contract (it did: three Provider stubs stopped type-checking).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
]);

export default eslintConfig;
