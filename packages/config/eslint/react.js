import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";
import base from "./base.js";

/** Lint rules for React packages and Next.js apps. */
export default tseslint.config(...base, {
  files: ["**/*.{ts,tsx}"],
  languageOptions: { globals: { ...globals.browser } },
  plugins: { "react-hooks": reactHooks },
  rules: {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
  },
});
