import eslint from "@eslint/js";
import vue from "eslint-plugin-vue";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs["flat/recommended"],
  {
    files: ["src/**/*.{ts,vue}"],
    languageOptions: {
      globals: {
        fetch: "readonly",
        RequestInit: "readonly",
      },
      parserOptions: {
        parser: tseslint.parser,
      },
    },
    rules: {}
  }
);
