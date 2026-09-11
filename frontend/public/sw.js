// Dummy Service Worker to unregister any stale ServiceWorker on this origin and silence 404 logs
self.addEventListener('install', () => {
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		self.registration
			.unregister()
			.then(() => self.clients.matchAll())
			.then((clients) => {
				// unregister completed
			})
	);
});
