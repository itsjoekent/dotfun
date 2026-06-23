import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const repoRoot = path.resolve(__dirname);

export default defineConfig({
  root: path.resolve(repoRoot, "public"),
  publicDir: "static",
  server: {
    fs: {
      allow: [repoRoot],
    },
  },
  build: {
    outDir: "build",
    emptyOutDir: true,
  },
});
