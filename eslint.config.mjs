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
  ]),
  {
    rules: {
      // Fabric.js v5 ships typings that lag behind its runtime API
      // (RemoveColor, HueRotation, Gradient coords, upperCanvasEl, …).
      // Escaped interop is the documented workaround until the v6 types land,
      // so both rules are relaxed project-wide.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      // Thumbnails in the layers panel & dashboard are local blob/data URLs
      // from IndexedDB — next/image adds nothing there.
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
