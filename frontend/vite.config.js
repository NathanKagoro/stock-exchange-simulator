import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
  // Build under /stock in production while keeping / in local development.
  base: command === "build" ? "/stock/" : "/",
  // Enables the automatic JSX runtime so React symbols are not required in every JSX file.
  plugins: [react()],
}));
