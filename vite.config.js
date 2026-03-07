import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "node:path";

export default defineConfig({
	publicDir: "static",
	plugins: [svelte()],
	build: {
		rollupOptions: {
			input: {
				main: resolve(__dirname, "index.html"),
				ddsConverter: resolve(__dirname, "dds-converter/index.html"),
				modinfoBuilder: resolve(__dirname, "modinfo-builder/index.html"),
				civ5modZiper: resolve(__dirname, "civ5mod-ziper/index.html"),
				workshopUploader: resolve(__dirname, "workshop-uploader/index.html"),
				links: resolve(__dirname, "links/index.html"),
			},
		},
	},
});
