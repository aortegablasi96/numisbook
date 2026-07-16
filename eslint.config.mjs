import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

// Flat config, run through the ESLint CLI (`npm run lint`) rather than `next lint`,
// which Next 16 removes. `eslint-config-next` ships only an eslintrc-style config,
// so FlatCompat is what lets the flat CLI consume it — that, and nothing else, is
// why @eslint/eslintrc is a dependency here.
const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const config = [
  {
    // `next lint` skipped these implicitly; the CLI does not, so they are named.
    // Flat config has no .eslintignore — ignores live in an `ignores`-only block.
    ignores: [".next/**", "node_modules/**", "drizzle/**", "next-env.d.ts"],
  },

  ...compat.extends("next/core-web-vitals"),

  {
    // The architecture guard (CLAUDE.md, docs/architecture.md): only repositories
    // may touch the database. This is the mechanism that enforces the layer
    // boundary, so it must keep biting after the migration — see the test below it.
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/db", "@/db/**"],
              message:
                "Only repositories may access the database. Import @/db / @/db/schema solely from src/repositories (see CLAUDE.md and docs/architecture.md). Services and UI must go through a repository.",
            },
          ],
        },
      ],
    },
  },

  {
    // The layer that *is* the database, plus the Auth.js adapter.
    files: ["src/repositories/**", "src/db/**", "src/auth.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
];

export default config;
