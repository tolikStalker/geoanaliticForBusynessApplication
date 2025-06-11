import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
	root: __dirname, // Set root to geo-analytics-frontend directory	plugins: [react(), tailwindcss()],
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
	test: {
		globals: true,
		include: ["tests/**/*.test.{js,jsx,ts,tsx}"],
		environment: "jsdom",
		setupFiles: "./vitest.setup.js",
	},
});
