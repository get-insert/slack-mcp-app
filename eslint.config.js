import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default [
  js.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    ignores: ["examples/**", "node_modules/**", "dist/**"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      ecmaVersion: 2022
    }
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    ignores: ["examples/**", "node_modules/**", "dist/**"],
    plugins: { "@typescript-eslint": tseslint.plugin },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true
      }
    },
    rules: {}
  },
  prettier
];