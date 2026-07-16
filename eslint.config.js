import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import ts from "typescript-eslint";

export default [
  { ignores: ["**/dist/**", "**/node_modules/**"] },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: [
      "apps/web/**/*.{ts,tsx}",
      "apps/extension/**/*.{ts,tsx}",
      "packages/ui/**/*.{ts,tsx}",
    ],
    plugins: { "react-hooks": reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
  {
    files: ["apps/extension/**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.webextensions } },
  },
];
