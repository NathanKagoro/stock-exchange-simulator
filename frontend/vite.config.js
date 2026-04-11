import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Enables the automatic JSX runtime so React symbols are not required in every JSX file.
  plugins: [react()],
});
