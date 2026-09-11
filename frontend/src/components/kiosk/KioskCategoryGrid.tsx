import React from 'react';
import type { Category } from '../../lib/types';

interface KioskCategoryGridProps {
	categories: Category[];
	creating: boolean;
	onSelectCategory: (cat: Category) => void;
}

export default function KioskCategoryGrid({
	categories,
	creating,
	onSelectCategory,
}: KioskCategoryGridProps) {
	return (
		<div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
			{categories.map((cat) => (
				<button
					key={cat.id}
					type="button"
					onClick={() => onSelectCategory(cat)}
					disabled={creating}
					className="glass group rounded-2xl p-6 text-left transition hover:border-kmenag-gold/60 hover:bg-kmenag-gold/5 cursor-pointer disabled:opacity-50"
				>
					<div className="flex items-center gap-4">
						<span className="glass-gold flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl font-extrabold text-kmenag-gold shadow">
							{cat.code}
						</span>
						<div>
							<p className="font-bold text-white text-lg">{cat.name}</p>
							<p className="mt-0.5 text-sm text-slate-400">{cat.description}</p>
						</div>
					</div>
					<p className="mt-4 text-sm font-semibold text-slate-500 transition group-hover:text-kmenag-gold">
						Ambil Antrian →
					</p>
				</button>
			))}
		</div>
	);
}
