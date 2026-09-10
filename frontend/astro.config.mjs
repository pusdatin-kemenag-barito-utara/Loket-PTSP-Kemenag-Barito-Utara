import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
	integrations: [react()],
vite: {
			envDir: fileURLToPath(new URL('../', import.meta.url)),
			plugins: [tailwindcss()],
			server: {
				proxy: {
					'/api/v1': {
						target: 'http://localhost:8080',
						changeOrigin: true,
						ws: true,
					},
					'/ws': {
						target: 'ws://localhost:8080',
						ws: true,
					},
				},
			},
		},
	output: 'static',
	site: 'https://loket.kemenag-baritoutara.com',
	server: {
		host: true,
		port: 3000,
	},
});