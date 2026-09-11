/**
 * IndexedDB Multi-Video Storage for PTSP TV Monitor
 * Allows storing multiple large MP4/WebM video files (up to hundreds of MBs each)
 * locally in browser storage without server upload restrictions.
 */

const DB_NAME = 'PTSP_MediaDB';
const DB_VERSION = 1;
const STORE_NAME = 'videos';
const KEY_ACTIVE_VIDEO = 'active_video';
const REGISTRY_KEY = 'ptsp_tv_local_videos_registry';

function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		if (typeof window === 'undefined' || !window.indexedDB) {
			reject(new Error('IndexedDB not supported'));
			return;
		}

		const req = window.indexedDB.open(DB_NAME, DB_VERSION);

		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME);
			}
		};

		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

export interface StoredVideoItem {
	id: string;
	name: string;
	size: number;
	type: string;
	updatedAt: number;
}

export type StoredVideoMeta = StoredVideoItem;

/**
 * Save a new local video to IndexedDB and register its metadata
 */
export async function saveLocalVideo(file: File | Blob, name: string): Promise<StoredVideoItem> {
	const db = await openDB();
	const id = `local_vid_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
	const meta: StoredVideoItem = {
		id,
		name,
		size: file.size,
		type: file.type || 'video/mp4',
		updatedAt: Date.now(),
	};

	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readwrite');
		const store = tx.objectStore(STORE_NAME);

		// Store with unique ID
		store.put({ id, blob: file, meta }, id);
		// Also store as active_video for backwards compatibility
		store.put({ id, blob: file, meta }, KEY_ACTIVE_VIDEO);

		tx.oncomplete = () => {
			try {
				// Update registry list in localStorage
				const existing = listStoredVideos();
				const updated = [meta, ...existing.filter((v) => v.id !== id)];
				localStorage.setItem(REGISTRY_KEY, JSON.stringify(updated));
				localStorage.setItem('ptsp_tv_local_video_meta', JSON.stringify(meta));
				window.dispatchEvent(new Event('storage'));
			} catch {
				/* ignore */
			}
			resolve(meta);
		};
		tx.onerror = () => reject(tx.error);
	});
}

/**
 * Get a specific video blob by its ID, with fallback to KEY_ACTIVE_VIDEO
 */
export async function getLocalVideoBlob(
	id?: string,
): Promise<{ blob: Blob; meta: StoredVideoItem } | null> {
	try {
		const db = await openDB();
		const lookupKey = id || KEY_ACTIVE_VIDEO;

		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readonly');
			const store = tx.objectStore(STORE_NAME);
			const req = store.get(lookupKey);

			req.onsuccess = () => {
				if (req.result && req.result.blob && req.result.blob.size > 0) {
					resolve(req.result);
				} else {
					resolve(null);
				}
			};
			req.onerror = () => reject(req.error);
		});
	} catch {
		return null;
	}
}

const activeDownloads = new Map<string, Promise<{ blob: Blob; meta: StoredVideoItem } | null>>();

/**
 * Cache a remote video (e.g. from Cloudflare R2) to IndexedDB for offline playback.
 * If already cached, returns existing blob immediately.
 * Deduplicates in-flight downloads.
 */
export async function cacheRemoteVideo(
	url: string,
	id: string,
	name: string,
): Promise<{ blob: Blob; meta: StoredVideoItem } | null> {
	if (!url) return null;

	// Check if already in IndexedDB
	try {
		const cached = await getLocalVideoBlob(id);
		if (cached && cached.blob) {
			return cached;
		}
	} catch {}

	// If download already in progress for this URL, reuse promise
	if (activeDownloads.has(url)) {
		return activeDownloads.get(url)!;
	}

	const downloadPromise = (async () => {
		try {
			const resp = await fetch(url);
			if (!resp.ok) return null;
			const blob = await resp.blob();

			const meta: StoredVideoItem = {
				id,
				name: name || 'Video Layanan',
				size: blob.size,
				type: blob.type || 'video/mp4',
				updatedAt: Date.now(),
			};

			const db = await openDB();
			return new Promise<{ blob: Blob; meta: StoredVideoItem }>((resolve, reject) => {
				const tx = db.transaction(STORE_NAME, 'readwrite');
				const store = tx.objectStore(STORE_NAME);
				store.put({ id, blob, meta }, id);

				tx.oncomplete = () => {
					try {
						const existing = listStoredVideos();
						const updated = [meta, ...existing.filter((v) => v.id !== id)];
						localStorage.setItem(REGISTRY_KEY, JSON.stringify(updated));
					} catch {}
					resolve({ blob, meta });
				};
				tx.onerror = () => reject(tx.error);
			});
		} catch (err) {
			console.warn('Failed to cache remote video to IndexedDB:', err);
			return null;
		} finally {
			activeDownloads.delete(url);
		}
	})();

	activeDownloads.set(url, downloadPromise);
	return downloadPromise;
}

/**
 * Delete a specific video from IndexedDB and remove it from the registry
 */
export async function deleteLocalVideo(id: string): Promise<void> {
	try {
		const db = await openDB();
		return new Promise((resolve, reject) => {
			const tx = db.transaction(STORE_NAME, 'readwrite');
			const store = tx.objectStore(STORE_NAME);
			store.delete(id);

			tx.oncomplete = () => {
				try {
					const existing = listStoredVideos();
					const updated = existing.filter((v) => v.id !== id);
					localStorage.setItem(REGISTRY_KEY, JSON.stringify(updated));

					// If this was the active video, remove metadata
					const activeMeta = getStoredVideoMeta();
					if (activeMeta && activeMeta.id === id) {
						localStorage.removeItem('ptsp_tv_local_video_meta');
					}
					window.dispatchEvent(new Event('storage'));
				} catch {
					/* ignore */
				}
				resolve();
			};
			tx.onerror = () => reject(tx.error);
		});
	} catch {
		/* ignore */
	}
}

/**
 * List all stored local video metadata
 */
export function listStoredVideos(): StoredVideoItem[] {
	try {
		const raw = localStorage.getItem(REGISTRY_KEY);
		if (!raw) {
			const single = getStoredVideoMeta();
			return single ? [single] : [];
		}
		return JSON.parse(raw);
	} catch {
		return [];
	}
}

// Backwards-compatible aliases
export const saveVideoBlob = saveLocalVideo;
export const getVideoBlob = () => getLocalVideoBlob();
export const deleteVideoBlob = () => {
	const meta = getStoredVideoMeta();
	if (meta?.id) {
		return deleteLocalVideo(meta.id);
	}
	return Promise.resolve();
};

export function getStoredVideoMeta(): StoredVideoItem | null {
	try {
		const raw = localStorage.getItem('ptsp_tv_local_video_meta');
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}


/**
 * Extracts YouTube Video ID from any standard YouTube URL or raw ID
 * Supports:
 * - https://www.youtube.com/watch?v=kYJ4-n2V1qM
 * - https://youtu.be/kYJ4-n2V1qM
 * - https://www.youtube.com/shorts/kYJ4-n2V1qM
 * - https://m.youtube.com/watch?v=kYJ4-n2V1qM
 * - https://www.youtube.com/embed/kYJ4-n2V1qM
 * - Raw 11-character ID: kYJ4-n2V1qM
 */
export function extractYouTubeId(urlOrId: string): string {
	if (!urlOrId) return '';
	const trimmed = urlOrId.trim();

	// If already an 11-char ID
	if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
		return trimmed;
	}

	try {
		const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
		if (parsed.hostname.includes('youtu.be')) {
			const id = parsed.pathname.replace(/^\/+/, '').split('/')[0];
			if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
		}
		if (parsed.hostname.includes('youtube.com')) {
			const v = parsed.searchParams.get('v');
			if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

			const parts = parsed.pathname.split('/');
			const shortsIdx = parts.indexOf('shorts');
			if (shortsIdx !== -1 && parts[shortsIdx + 1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[shortsIdx + 1])) {
				return parts[shortsIdx + 1];
			}
			const embedIdx = parts.indexOf('embed');
			if (embedIdx !== -1 && parts[embedIdx + 1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[embedIdx + 1])) {
				return parts[embedIdx + 1];
			}
		}
	} catch {
		// Fallback regex
	}

	// Comprehensive Regex fallback
	const match = trimmed.match(
		/(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
	);

	return match ? match[1] : '';
}
