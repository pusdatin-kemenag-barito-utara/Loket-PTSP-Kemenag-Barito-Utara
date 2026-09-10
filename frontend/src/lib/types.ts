export interface User {
	id: string;
	username: string;
	name: string;
	role: string;
}

export interface Category {
	id: string;
	code: string;
	name: string;
	description: string;
	display_order: number;
	is_active: boolean;
}

export interface Queue {
	id: string;
	category_id: string;
	ticket_number: number;
	status: 'waiting' | 'called' | 'completed' | 'skipped';
	source: 'kiosk' | 'admin';
	called_at: string | null;
	completed_at: string | null;
	created_at: string;
	category_code: string;
	category_name: string;
}

export interface Ticket {
	id: string;
	category_code: string;
	category_name: string;
	ticket_number: number;
	status: string;
	queue_ahead: number;
	created_at: string;
}

export interface Stats {
	total_today: number;
	waiting: number;
	called: number;
	completed: number;
	avg_wait_min: number;
	next_number: number;
	open: boolean;
	is_operational: boolean;
}

export interface LoginResponse {
	token: string;
	user: User;
}

export interface WSMessage<T = unknown> {
	type:
		| 'queue_created'
		| 'queue_called'
		| 'queue_recalled'
		| 'queue_completed'
		| 'queue_skipped'
		| 'stats';
	data: T;
}