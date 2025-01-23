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
      provider: "istanbul",
      include: ["src/**/*"],
    },
  },
});
