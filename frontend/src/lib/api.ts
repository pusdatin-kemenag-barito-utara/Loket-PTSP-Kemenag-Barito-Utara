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
	categories: () => request<Category[]>('/api/v1/categories'),
	stats: () => request<Stats>('/api/v1/stats'),
	waiting: () => request<Queue[]>('/api/v1/queue/waiting'),
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
};