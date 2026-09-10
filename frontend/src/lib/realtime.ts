import type { WSMessage } from './types';

function locationProtocol(): string {
	if (typeof window === 'undefined') return 'wss://';
	return window.location.protocol === 'https:' ? 'wss://' : 'ws://';
}

function locationHost(): string {
	if (typeof window === 'undefined') return '';
	return window.location.host;
}

// Empty/unset PUBLIC_WS_URL => same-origin via the Astro proxy (:3000 in dev).
// A non-empty value overrides the URL explicitly.
const wsRaw = import.meta.env.PUBLIC_WS_URL as string | undefined;
export const WS_URL: string =
	wsRaw && wsRaw.trim() ? wsRaw : `${locationProtocol()}${locationHost()}/api/v1/ws/queue`;

export interface RealtimeConnection {
	close: () => void;
	send: (data: unknown) => void;
}

/**
 * Opens a WebSocket to the queue realtime endpoint.
 * Reconnects automatically with exponential backoff.
 */
export function connectRealtime(
	onMessage: (msg: WSMessage) => void,
	onStatus?: (connected: boolean) => void,
): RealtimeConnection {
	let socket: WebSocket | null = null;
	let closedByUser = false;
	let retries = 0;
	let timer: ReturnType<typeof setTimeout> | null = null;

	const cleanup = () => {
		if (timer) clearTimeout(timer);
		if (socket) {
			socket.onopen = null;
			socket.onmessage = null;
			socket.onclose = null;
			socket.onerror = null;
			socket.close();
		}
		socket = null;
	};

	const connect = () => {
		if (closedByUser) return;
		try {
			socket = new WebSocket(WS_URL);
		} catch {
			scheduleReconnect();
			return;
		}

		socket.onopen = () => {
			retries = 0;
			onStatus?.(true);
		};

		socket.onmessage = (ev) => {
			try {
				onMessage(JSON.parse(ev.data) as WSMessage);
			} catch {
				/* malformed frame, ignore */
			}
		};

		socket.onclose = () => {
			onStatus?.(false);
			scheduleReconnect();
		};

		socket.onerror = () => {
			socket?.close();
		};
	};

	const scheduleReconnect = () => {
		if (closedByUser) return;
		const delay = Math.min(1000 * 2 ** retries, 15000);
		retries += 1;
		timer = setTimeout(connect, delay);
	};

	connect();

	return {
		close: () => {
			closedByUser = true;
			cleanup();
			onStatus?.(false);
		},
		send: (data: unknown) => {
			if (socket?.readyState === WebSocket.OPEN) {
				socket.send(JSON.stringify(data));
			}
		},
	};
}