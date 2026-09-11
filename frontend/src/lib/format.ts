/**
 * Utility functions for formatting queue numbers and dates.
 */

export function formatTicketNumber(n: number | string): string {
	const num = typeof n === 'string' ? parseInt(n, 10) : n;
	if (isNaN(num)) return '000';
	return String(num).padStart(3, '0');
}

export function formatDateID(date: Date): string {
	return date.toLocaleDateString('id-ID', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	});
}

export function formatTimeWIB(date: Date): string {
	return date.toLocaleTimeString('id-ID', {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
	});
}
