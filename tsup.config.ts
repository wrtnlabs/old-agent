import { defineConfig } from "tsup";
import UnpluginTypia from "@ryoppippi/unplugin-typia/esbuild";

export default defineConfig({
  esbuildPlugins: [UnpluginTypia()],
});
