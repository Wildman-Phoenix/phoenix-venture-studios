import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isBuildProof = process.env.PHOENIX_BUILD_PROOF === "1";

  return {
    base: env.VITE_BASE_PATH || "/",
    publicDir: isBuildProof ? false : undefined,
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: [
        {
          find: /^lucide-react$/,
          replacement: path.resolve(__dirname, "./src/lib/lucide-react-lite.ts"),
        },
        {
          find: "@",
          replacement: path.resolve(__dirname, "./src"),
        },
      ],
    },
    build: isBuildProof
      ? {
          outDir: "tmp/build-proof",
          emptyOutDir: true,
        }
      : undefined,
  };
});
