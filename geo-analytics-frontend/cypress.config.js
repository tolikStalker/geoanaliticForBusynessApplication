import { defineConfig } from "cypress";

export default defineConfig({
	e2e: {
		setupNodeEvents(on, config) {},
		baseUrl: "http://localhost:5173",
		chromeWebSecurity: false,
	},

	component: {
		devServer: {
			framework: "react",
			bundler: "vite",
		},
	},
});
