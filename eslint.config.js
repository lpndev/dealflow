import js from "@eslint/js"
import reactHooks from "eslint-plugin-react-hooks"
import sonarjs from "eslint-plugin-sonarjs"
import globals from "globals"
import ts from "typescript-eslint"

export default [
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/components/ui/**",
      "apps/api/drizzle/**"
    ]
  },
  js.configs.recommended,
  ...ts.configs.recommendedTypeChecked,
  sonarjs.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  {
    files: ["apps/panel/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/only-throw-error": [
        "error",
        { allow: [{ from: "lib", name: "Response" }] }
      ]
    }
  },
  {
    files: [
      "apps/panel/**/*.{ts,tsx}",
      "apps/extension/**/*.{ts,tsx}",
      "packages/ui/**/*.{ts,tsx}"
    ],
    plugins: { "react-hooks": reactHooks },
    rules: { ...reactHooks.configs.recommended.rules }
  },
  {
    files: ["apps/extension/**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.webextensions } }
  },
  {
    files: ["packages/tests/**/*.ts"],
    rules: {
      "sonarjs/no-skipped-tests": "off",
      "sonarjs/assertions-in-tests": "off",
      "sonarjs/no-floating-point-equality": "off",
      "sonarjs/publicly-writable-directories": "off",
      "sonarjs/no-hardcoded-passwords": "off",
      "sonarjs/no-clear-text-protocols": "off",
      "sonarjs/no-hardcoded-ip": "off"
    }
  },
  {
    files: ["**/*.js", "**/*.config.ts", "packages/tests/**"],
    ...ts.configs.disableTypeChecked
  }
]
