import React from 'react';

interface TrackSearchFormProps {
	code: string;
	number: string;
	loading: boolean;
	error: string | null;
	onChangeCode: (code: string) => void;
	onChangeNumber: (num: string) => void;
	onSearch: (e: React.FormEvent) => void;
}

export default function TrackSearchForm({
	code,
	number,
	loading,
	error,
	onChangeCode,
	onChangeNumber,
	onSearch,
}: TrackSearchFormProps) {
	return (
		<form onSubmit={onSearch} className="glass-strong rounded-3xl p-6">
			<div className="flex gap-3">
				<input
					type="text"
					value={code}
					onChange={(e) => onChangeCode(e.target.value)}
					placeholder="Kode (A-D)"
					maxLength={1}
					className="w-24 rounded-xl border border-white/10 bg-night-900/60 px-3 py-3 text-center text-lg font-bold text-white uppercase outline-none focus:border-kmenag-gold/60"
				/>
				<input
					type="text"
					inputMode="numeric"
					value={number}
					onChange={(e) => onChangeNumber(e.target.value)}
					placeholder="Nomor antrian"
					className="flex-1 rounded-xl border border-white/10 bg-night-900/60 px-3 py-3 text-lg font-bold text-white outline-none focus:border-kmenag-gold/60"
				/>
			</div>

			{error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

			<button type="submit" disabled={loading} className="btn btn-gold mt-4 w-full text-sm">
				{loading ? 'Mencari Antrian...' : 'Cek Nomor Antrian'}
			</button>
		</form>
	);
}
