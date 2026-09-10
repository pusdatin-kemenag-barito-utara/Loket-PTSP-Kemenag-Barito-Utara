import React from 'react';
import { api } from '../lib/api';

declare global {
	interface Window {
		turnstile?: {
			render: (el: HTMLElement, options: { sitekey: string; callback: (token: string) => void }) => string;
			remove?: (widgetId: string) => void;
		};
	}
}

export default function LoginForm({ siteKey }: { siteKey: string }) {
	const [username, setUsername] = React.useState('');
	const [password, setPassword] = React.useState('');
	const [token, setToken] = React.useState('');
	const [error, setError] = React.useState<string | null>(null);
	const [loading, setLoading] = React.useState(false);
	const captchaRef = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		if (!siteKey || !captchaRef.current) return;

		let widgetId: string | undefined;
		const onReady = () => {
			if (window.turnstile && captchaRef.current) {
				widgetId = window.turnstile.render(captchaRef.current, {
					sitekey: siteKey,
					callback: (t) => setToken(t),
				});
			}
		};

		if (window.turnstile) {
			onReady();
		} else {
			const s = document.createElement('script');
			s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
			s.async = true;
			s.onload = onReady;
			document.head.appendChild(s);
		}

		return () => {
			if (window.turnstile && widgetId) {
				window.turnstile.remove(widgetId);
			}
		};
	}, [siteKey]);

	const submit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!username || !password) {
			setError('Username dan password wajib diisi.');
			return;
		}
		setLoading(true);
		setError(null);
		try {
			await api.login(username, password, token);
			window.location.href = '/admin';
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Gagal masuk.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={submit} className="glass-strong w-full max-w-sm rounded-3xl p-8">
			<div className="mb-6 text-center">
				<p className="text-sm font-bold uppercase tracking-widest text-kmenag-gold">Area Petugas</p>
				<h1 className="mt-1 text-2xl font-extrabold text-white">Masuk Admin</h1>
			</div>

			<label className="block">
				<span className="text-sm text-slate-400">Username</span>
				<input
					type="text"
					value={username}
					onChange={(e) => setUsername(e.target.value)}
					autoComplete="username"
					className="mt-1 w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-3 text-white outline-none focus:border-kmenag-gold/60"
				/>
			</label>

			<label className="mt-4 block">
				<span className="text-sm text-slate-400">Password</span>
				<input
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					autoComplete="current-password"
					className="mt-1 w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-3 text-white outline-none focus:border-kmenag-gold/60"
				/>
			</label>

			{siteKey && (
				<div className="mt-5 flex justify-center">
					<div ref={captchaRef} className="scale-[0.9]" />
				</div>
			)}

			{error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

			<button type="submit" disabled={loading} className="btn btn-gold mt-5 w-full text-sm">
				{loading ? 'Memproses...' : 'Masuk'}
			</button>
		</form>
	);
}