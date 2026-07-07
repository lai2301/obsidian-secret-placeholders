import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";

export default tseslint.config(
  {
    ignores: ["main.js", "node_modules/**", "dev/**", "scripts/**", "docs/**"],
  },
  ...obsidianmd.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // catch(e)/JSON.parse in a plugin are unavoidably `any`/`unknown`; these
      // fire ~50x on error handling with no runtime benefit. Off by choice.
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      // async methods that satisfy a Promise-returning interface don't always await.
      "@typescript-eslint/require-await": "off",
      // These nudge toward APIs above our declared minAppVersion (1.7.2):
      // getLanguage() is 1.8.7, declarative settings (getSettingDefinitions) is
      // 1.13.0. Adopting them would raise the support floor / require a rewrite.
      "obsidianmd/prefer-get-language": "off",
      "obsidianmd/settings-tab/prefer-setting-definitions": "off",
    },
  },
);
