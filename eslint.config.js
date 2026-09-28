import { fixupConfigRules } from "@eslint/compat";
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import testingLibrary from "eslint-plugin-testing-library";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["build/", "coverage/", ".wrangler/", ".claude/worktrees/**"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  // These three still call context methods ESLint 10 removed, and their peer
  // ranges stop at ESLint 9. The `overrides` in package.json lift that range.
  fixupConfigRules([
    importPlugin.flatConfigs.recommended,
    importPlugin.flatConfigs.typescript,
    react.configs.flat.recommended,
    react.configs.flat["jsx-runtime"],
    jsxA11y.flatConfigs.recommended,
  ]),
  reactHooks.configs.flat["recommended-latest"],
  {
    settings: { react: { version: "detect" } },
    rules: {
      // tsc resolves modules for both tsconfigs. The import plugin would need
      // its own resolver just to repeat that, and gets ESM exports maps wrong.
      "import/no-unresolved": "off",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      // "smart" keeps the `!= null` checks the scoring code relies on.
      eqeqeq: ["error", "smart"],
      // Traces go through `debugLog`, which is silent outside a dev server. A
      // raw `console.log` ships them to every reader's console instead.
      "no-console": ["error", { allow: ["debug", "warn", "error"] }],
    },
  },
  {
    // Standalone Node CLI tooling behind a skill, not part of the app bundle.
    files: [".claude/skills/**/scripts/**/*.js"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ["**/*.test.{ts,tsx}"],
    ...testingLibrary.configs["flat/react"],
    rules: {
      ...testingLibrary.configs["flat/react"].rules,
      // The picks file input is hidden and several elements are only
      // identifiable by class, so there is no query that reaches them.
      "testing-library/no-node-access": "off",
    },
  },
  prettier,
);
