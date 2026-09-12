import type { Category, LoginResponse, Queue, Stats, Ticket, User } from './types';

// Empty/unset PUBLIC_API_URL => same-origin (dev: proxied by Astro on :3000,
// prod: reverse proxy). A non-empty value overrides the base explicitly.
const apiRaw = import.meta.env.PUBLIC_API_URL as string | undefined;
export const API_BASE: string = apiRaw && apiRaw.trim() ? apiRaw : '';

export class ApiError extends Error {
	status: number;
	constructor(message: string, status: number) {
		super(message);
		this.status = status;
	}
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(`${API_BASE}${path}`, {
		credentials: 'include',
		headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
		...init,
	});

	if (!res.ok) {
		let message = `Request failed (${res.status})`;
		try {
			const body = await res.json();
			message = body?.message ?? body?.error ?? message;
		} catch {
			/* ignore */
		}
		throw new ApiError(message, res.status);
	}
	return res.json() as Promise<T>;
}

export const api = {
	categories: async () => (await request<Category[]>('/api/v1/categories')) || [],
	stats: () => request<Stats>('/api/v1/stats'),
	waiting: async () => (await request<Queue[]>('/api/v1/queue/waiting')) || [],
	track: (id: string) => request<Ticket>(`/api/v1/queue/track?id=${encodeURIComponent(id)}`),
	lookup: (code: string, number: number) =>
		request<Ticket>(`/api/v1/queue/lookup?code=${encodeURIComponent(code)}&number=${number}`),
	createTicket: (categoryId: string) =>
		request<Queue>('/api/v1/queue', {
			method: 'POST',
			body: JSON.stringify({ category_id: categoryId }),
		}),
	login: (username: string, password: string, token: string) =>
		request<LoginResponse>('/api/v1/auth/login', {
			method: 'POST',
			body: JSON.stringify({ username, password, token }),
		}),
	logout: () => request<{ ok: boolean }>('/api/v1/auth/logout', { method: 'POST' }),
	me: () => request<User>('/api/v1/auth/me'),
	callQueue: (queueId: string) =>
		request<Queue>('/api/v1/queue/call', {
			method: 'POST',
			body: JSON.stringify({ queue_id: queueId }),
		}),
	recallQueue: (queueId: string) =>
		request<Queue>('/api/v1/queue/recall', {
			method: 'POST',
			body: JSON.stringify({ queue_id: queueId }),
		}),
	adjustQueue: (queueId: string, status: string) =>
		request<Queue>('/api/v1/queue/adjust', {
			method: 'POST',
			body: JSON.stringify({ queue_id: queueId, status }),
		}),
	maintenance: () => request<{ maintenance: boolean }>('/api/v1/pusdatin/maintenance'),
	users: () => request<User[]>('/api/v1/users'),
	createUser: (data: { name: string; username: string; password: string; role?: string }) =>
		request<User>('/api/v1/users', {
			method: 'POST',
			body: JSON.stringify(data),
		}),
	updateUser: (id: string, data: { name: string; username: string; password?: string; role?: string }) =>
		request<User>(`/api/v1/users/${encodeURIComponent(id)}`, {
			method: 'PUT',
			body: JSON.stringify(data),
		}),
	deleteUser: (id: string) =>
		request<{ ok: boolean; message?: string }>(`/api/v1/users/${encodeURIComponent(id)}`, {
			method: 'DELETE',
		}),
	allCategories: () => request<Category[]>('/api/v1/categories?all=true'),
	createCategory: (data: { code: string; name: string; description?: string; display_order?: number; is_active?: boolean }) =>
		request<Category>('/api/v1/categories', {
			method: 'POST',
			body: JSON.stringify(data),
		}),
	updateCategory: (id: string, data: { code: string; name: string; description?: string; display_order?: number; is_active?: boolean }) =>
		request<Category>(`/api/v1/categories/${encodeURIComponent(id)}`, {
			method: 'PUT',
			body: JSON.stringify(data),
		}),
	deleteCategory: (id: string) =>
		request<{ ok: boolean; message?: string }>(`/api/v1/categories/${encodeURIComponent(id)}`, {
			method: 'DELETE',
		}),
	resetQueues: (categoryId?: string) =>
		request<{ ok: boolean; message?: string }>('/api/v1/categories/reset-queues', {
			method: 'POST',
			body: JSON.stringify({ category_id: categoryId }),
		}),
	tvSettings: async () => {
		const res = await request<any>('/api/v1/tv/settings');
		if (res && typeof res.playlist === 'string') {
			try {
				res.playlist = JSON.parse(res.playlist);
			} catch {
				res.playlist = [];
			}
		}
		return res;
	},
	updateTVSettings: (data: any) => {
		const payload = {
			...data,
			playlist: typeof data.playlist === 'object' ? JSON.stringify(data.playlist) : data.playlist,
		};
		return request<{ ok: boolean; message: string }>('/api/v1/tv/settings', {
			method: 'PUT',
			body: JSON.stringify(payload),
		});
	},
	uploadMedia: async (
		file: File,
		onProgress?: (progress: { percent: number; currentChunk: number; totalChunks: number; currentMB: number; totalMB: number }) => void
	) => {
		// Cloudflare Free/Pro has a strict 100MB body limit per request.
		// We slice uploads into 15MB chunks to bypass Cloudflare 413 Payload Too Large error
		// and support video uploads up to 300MB smoothly.
		const CHUNK_SIZE = 15 * 1024 * 1024; // 15 MB
		const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
		const uploadId = `upl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
		const totalMB = Number((file.size / (1024 * 1024)).toFixed(1));

		let finalResponse: { ok: boolean; url: string; public_url?: string; name: string; size: number; key: string } | null = null;

		for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
			const start = chunkIndex * CHUNK_SIZE;
			const end = Math.min(start + CHUNK_SIZE, file.size);
			const chunkBlob = file.slice(start, end);

			const formData = new FormData();
			formData.append('file', chunkBlob, file.name);
			formData.append('upload_id', uploadId);
			formData.append('chunk_index', chunkIndex.toString());
			formData.append('total_chunks', totalChunks.toString());
			formData.append('filename', file.name);
			formData.append('content_type', file.type || 'video/mp4');

			const res = await fetch(`${API_BASE}/api/v1/media/upload-chunk`, {
				method: 'POST',
				credentials: 'include',
				body: formData,
			});

			if (!res.ok) {
				let message = `Upload gagal pada bagian ${chunkIndex + 1}/${totalChunks} (${res.status})`;
				try {
					const body = await res.json();
					message = body?.message ?? body?.error ?? message;
				} catch {}
				throw new ApiError(message, res.status);
			}

			const data = await res.json();
			const percent = Math.min(99, Math.round(((chunkIndex + 1) / totalChunks) * 100));
			const currentMB = Number((end / (1024 * 1024)).toFixed(1));
			if (onProgress) {
				onProgress({
					percent,
					currentChunk: chunkIndex + 1,
					totalChunks,
					currentMB,
					totalMB,
				});
			}

			if (chunkIndex === totalChunks - 1) {
				finalResponse = data;
			}
		}

		if (!finalResponse || !finalResponse.url) {
			throw new ApiError('Gagal menyelesaikan penggabungan video di server', 500);
		}

		if (onProgress) {
			onProgress({
				percent: 100,
				currentChunk: totalChunks,
				totalChunks,
				currentMB: totalMB,
				totalMB,
			});
		}

		return finalResponse;
	},
};