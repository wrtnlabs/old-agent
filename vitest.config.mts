import UnpluginTypia from "@ryoppippi/unplugin-typia/vite";
import { defineConfig } from "vitest/config";
import { name } from "./package.json";

export default defineConfig({
  plugins: [
    UnpluginTypia({
      /* options */
    }),
  ],
  test: {
    name,
    coverage: {
      provider: "v8",
      include: ["src/**/*"],
      reporter: ["text", "lcov"],
    },
  },
});
