import React from 'react';
import { api } from '../lib/api';
import { EyeIcon, EyeOffIcon } from './common/Icons';

declare global {
	interface Window {
		turnstile?: {
			render: (
				el: HTMLElement,
				options: {
					sitekey: string;
					callback: (token: string) => void;
					theme?: 'dark' | 'light' | 'auto';
					size?: 'normal' | 'compact' | 'flexible';
				},
			) => string;
			remove?: (widgetId: string) => void;
		};
	}
}

export default function LoginForm({ siteKey }: { siteKey: string }) {
	const [username, setUsername] = React.useState('');
	const [password, setPassword] = React.useState('');
	const [showPassword, setShowPassword] = React.useState(false);
	const [token, setToken] = React.useState('');
	const [error, setError] = React.useState<string | null>(null);
	const [loading, setLoading] = React.useState(false);
	const [failedAttempts, setFailedAttempts] = React.useState(0);
	const [lockoutSeconds, setLockoutSeconds] = React.useState(0);
	const captchaRef = React.useRef<HTMLDivElement>(null);

	// If already authenticated, redirect immediately to /admin without creating history entry
	React.useEffect(() => {
		let isMounted = true;
		api.me()
			.then((user) => {
				if (isMounted && user) {
					window.location.replace('/admin');
				}
			})
			.catch(() => {
				/* user is not authenticated, stay on login page */
			});
		return () => {
			isMounted = false;
		};
	}, []);

	// Client-side lockout countdown timer
	React.useEffect(() => {
		if (lockoutSeconds <= 0) return;
		const timer = setInterval(() => {
			setLockoutSeconds((prev) => {
				if (prev <= 1) {
					clearInterval(timer);
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
		return () => clearInterval(timer);
	}, [lockoutSeconds]);

	React.useEffect(() => {
		if (!siteKey || !captchaRef.current) return;

		let widgetId: string | undefined;
		const onReady = () => {
			if (window.turnstile && captchaRef.current) {
				widgetId = window.turnstile.render(captchaRef.current, {
					sitekey: siteKey,
					callback: (t) => setToken(t),
					theme: 'dark',
					size: 'flexible',
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
			if (widgetId && window.turnstile?.remove) {
				window.turnstile.remove(widgetId);
			}
		};
	}, [siteKey]);

	const submit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (lockoutSeconds > 0) return;

		const cleanUser = username.trim();
		if (!cleanUser || !password) {
			setError('Username dan password wajib diisi.');
			return;
		}

		setLoading(true);
		setError(null);

		try {
			await api.login(cleanUser, password, token);
			// Successful login: replace history so user cannot click Back into login
			window.location.replace('/admin');
		} catch (err) {
			const nextAttempts = failedAttempts + 1;
			setFailedAttempts(nextAttempts);

			// If client reaches 5 consecutive failures, enforce a 60-second cooldown
			if (nextAttempts >= 5) {
				setLockoutSeconds(60);
				setError('Terlalu banyak percobaan gagal. Silakan tunggu 60 detik sebelum mencoba kembali.');
			} else if (err instanceof Error && 'status' in err && (err as { status: number }).status === 429) {
				setLockoutSeconds(900); // 15 minutes server lockout
				setError('Akses login dibatasi sementara oleh sistem keamanan server (15 menit).');
			} else {
				setError(err instanceof Error ? err.message : 'Username atau password salah.');
			}

			// Clear password field for safety
			setPassword('');
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={submit} className="glass-strong w-full max-w-sm rounded-3xl p-8 shadow-2xl">
			<div className="mb-6 text-center">
				<p className="text-xs font-bold uppercase tracking-widest text-kmenag-gold">Portal Petugas</p>
				<h1 className="mt-1 text-2xl font-black text-white">Masuk Admin</h1>
			</div>

			<label className="block">
				<span className="text-xs font-bold uppercase tracking-wider text-slate-400">Username</span>
				<input
					type="text"
					value={username}
					onChange={(e) => setUsername(e.target.value)}
					autoComplete="username"
					placeholder="Masukkan username"
					className="mt-1.5 w-full rounded-xl border border-white/10 bg-night-900/60 px-3.5 py-3 text-white outline-none focus:border-kmenag-gold/60 text-sm placeholder:text-slate-500"
				/>
			</label>

			<label className="mt-4 block">
				<span className="text-xs font-bold uppercase tracking-wider text-slate-400">Password</span>
				<div className="relative mt-1.5">
					<input
						type={showPassword ? 'text' : 'password'}
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						autoComplete="current-password"
						placeholder="Masukkan password"
						className="w-full rounded-xl border border-white/10 bg-night-900/60 pl-3.5 pr-11 py-3 text-white outline-none focus:border-kmenag-gold/60 text-sm placeholder:text-slate-500"
					/>
					<button
						type="button"
						onClick={() => setShowPassword(!showPassword)}
						className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
						title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
					>
						{showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
					</button>
				</div>
			</label>

			{/* Cloudflare Turnstile Full-Width matching the button */}
			{siteKey && (
				<div className="mt-5 w-full overflow-hidden rounded-xl">
					<div
						ref={captchaRef}
						className="w-full flex justify-center [&>iframe]:!w-full [&>iframe]:!max-w-full"
					/>
				</div>
			)}

			{error && <p className="mt-3 text-sm text-rose-400 font-medium">{error}</p>}

			<button
				type="submit"
				disabled={loading || lockoutSeconds > 0}
				className="btn btn-gold mt-5 w-full text-sm font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{lockoutSeconds > 0
					? `Terkunci Sementara (${lockoutSeconds}s)`
					: loading
					? 'Memproses Autentikasi...'
					: 'Masuk Portal Admin'}
			</button>
		</form>
	);
}