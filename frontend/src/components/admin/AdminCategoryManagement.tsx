import React from 'react';
import { api } from '../../lib/api';
import type { Category } from '../../lib/types';
import {
	PlusIcon,
	PencilIcon,
	TrashIcon,
	CheckCircleIcon,
	XMarkIcon,
	ArrowPathIcon,
	QueueIcon,
} from '../common/Icons';
import ModernSelect from '../common/ModernSelect';

interface AdminCategoryManagementProps {
	onCategoriesChanged: () => void;
	onNavigateToConsole?: () => void;
}

export default function AdminCategoryManagement({
	onCategoriesChanged,
	onNavigateToConsole,
}: AdminCategoryManagementProps) {
	const [categories, setCategories] = React.useState<Category[]>([]);
	const [loading, setLoading] = React.useState(true);
	const [error, setError] = React.useState<string | null>(null);
	const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

	// Modals
	const [showCreateModal, setShowCreateModal] = React.useState(false);
	const [editingCategory, setEditingCategory] = React.useState<Category | null>(null);
	const [deletingCategory, setDeletingCategory] = React.useState<Category | null>(null);
	const [showResetModal, setShowResetModal] = React.useState(false);
	const [resetTarget, setResetTarget] = React.useState<string>('all');

	// Form
	const [formData, setFormData] = React.useState({
		code: '',
		name: '',
		description: '',
		display_order: 1,
		is_active: true,
	});
	const [submitting, setSubmitting] = React.useState(false);

	const loadCategories = React.useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const list = await api.allCategories();
			setCategories(list);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Gagal memuat data seksi layanan.');
		} finally {
			setLoading(false);
		}
	}, []);

	React.useEffect(() => {
		loadCategories();
	}, [loadCategories]);

	const flashSuccess = (msg: string) => {
		setSuccessMsg(msg);
		setTimeout(() => setSuccessMsg(null), 4000);
	};

	const handleOpenCreate = () => {
		const nextOrder = categories.length > 0 ? Math.max(...categories.map((c) => c.display_order)) + 1 : 1;
		setFormData({
			code: '',
			name: '',
			description: '',
			display_order: nextOrder,
			is_active: true,
		});
		setError(null);
		setShowCreateModal(true);
	};

	const handleOpenEdit = (c: Category) => {
		setEditingCategory(c);
		setFormData({
			code: c.code,
			name: c.name,
			description: c.description,
			display_order: c.display_order,
			is_active: c.is_active,
		});
		setError(null);
	};

	const handleCreateSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.code.trim() || !formData.name.trim()) {
			setError('Kode seksi dan nama seksi wajib diisi.');
			return;
		}

		setSubmitting(true);
		setError(null);
		try {
			await api.createCategory({
				code: formData.code.trim().toUpperCase(),
				name: formData.name.trim(),
				description: formData.description.trim(),
				display_order: Number(formData.display_order) || 1,
				is_active: formData.is_active,
			});
			setShowCreateModal(false);
			flashSuccess(`Seksi layanan [${formData.code.toUpperCase()}] berhasil ditambahkan!`);
			loadCategories();
			onCategoriesChanged();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Gagal menambahkan seksi.');
		} finally {
			setSubmitting(false);
		}
	};

	const handleEditSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingCategory) return;
		if (!formData.code.trim() || !formData.name.trim()) {
			setError('Kode seksi dan nama seksi wajib diisi.');
			return;
		}

		setSubmitting(true);
		setError(null);
		try {
			await api.updateCategory(editingCategory.id, {
				code: formData.code.trim().toUpperCase(),
				name: formData.name.trim(),
				description: formData.description.trim(),
				display_order: Number(formData.display_order) || 1,
				is_active: formData.is_active,
			});
			setEditingCategory(null);
			flashSuccess(`Seksi layanan [${formData.code.toUpperCase()}] berhasil diperbarui!`);
			loadCategories();
			onCategoriesChanged();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Gagal memperbarui seksi.');
		} finally {
			setSubmitting(false);
		}
	};

	const handleDeleteConfirm = async () => {
		if (!deletingCategory) return;
		setSubmitting(true);
		setError(null);
		try {
			await api.deleteCategory(deletingCategory.id);
			flashSuccess(`Seksi [${deletingCategory.code}] berhasil dihapus.`);
			setDeletingCategory(null);
			loadCategories();
			onCategoriesChanged();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Gagal menghapus seksi.');
		} finally {
			setSubmitting(false);
		}
	};

	const handleResetQueuesConfirm = async () => {
		setSubmitting(true);
		setError(null);
		try {
			await api.resetQueues(resetTarget === 'all' ? undefined : resetTarget);
			flashSuccess('Nomor antrian hari ini berhasil direset ke awal (nomor 1)!');
			setShowResetModal(false);
			onCategoriesChanged();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Gagal mereset nomor antrian.');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="space-y-6">
			{/* Notifications */}
			{successMsg && (
				<div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 shadow-xs">
					<CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-600" />
					<span>{successMsg}</span>
				</div>
			)}
			{error && (
				<div className="flex items-center justify-between gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 shadow-xs">
					<span>{error}</span>
					<button type="button" onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
						<XMarkIcon className="h-4 w-4" />
					</button>
				</div>
			)}

			{/* Header Action Bar */}
			<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
				<div>
					<h2 className="text-base font-extrabold text-slate-900">Manajemen Seksi Layanan & Antrian</h2>
					<p className="text-xs text-slate-500 mt-0.5">
						Kelola daftar loket pelayanan, kode tiket, urutan tampilan, dan reset penomoran antrian
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-2.5">
					{onNavigateToConsole && (
						<button
							type="button"
							onClick={onNavigateToConsole}
							className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
						>
							<QueueIcon className="h-4 w-4 text-slate-500" />
							<span>Konsol Panggilan</span>
						</button>
					)}

					<button
						type="button"
						onClick={() => setShowResetModal(true)}
						className="flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors shadow-xs"
					>
						<ArrowPathIcon className="h-4 w-4" />
						<span>Reset Antrian Hari Ini</span>
					</button>

					<button
						type="button"
						onClick={handleOpenCreate}
						className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white transition-colors shadow-xs"
					>
						<PlusIcon className="h-4 w-4 stroke-[2.5]" />
						<span>Tambah Seksi Baru</span>
					</button>
				</div>
			</div>

			{/* Categories Table */}
			<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm text-slate-700">
						<thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
							<tr>
								<th className="px-6 py-4">Kode Tiket</th>
								<th className="px-6 py-4">Nama Seksi Layanan</th>
								<th className="px-6 py-4">Deskripsi</th>
								<th className="px-6 py-4 text-center">Urutan</th>
								<th className="px-6 py-4">Status</th>
								<th className="px-6 py-4 text-right">Aksi</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100 font-medium">
							{loading ? (
								<tr>
									<td colSpan={6} className="px-6 py-12 text-center text-slate-400">
										Memuat data seksi...
									</td>
								</tr>
							) : categories.length === 0 ? (
								<tr>
									<td colSpan={6} className="px-6 py-12 text-center text-slate-400">
										Belum ada data seksi layanan.
									</td>
								</tr>
							) : (
								categories.map((c) => (
									<tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
										<td className="px-6 py-4">
											<span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 font-black text-base border border-emerald-200">
												{c.code}
											</span>
										</td>
										<td className="px-6 py-4">
											<div className="font-bold text-slate-900">{c.name}</div>
										</td>
										<td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
											{c.description || '—'}
										</td>
										<td className="px-6 py-4 text-center font-bold text-slate-700">
											{c.display_order}
										</td>
										<td className="px-6 py-4">
											<span
												className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
													c.is_active
														? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
														: 'bg-slate-100 text-slate-500 border border-slate-200'
												}`}
											>
												<span className={`h-1.5 w-1.5 rounded-full ${c.is_active ? 'bg-emerald-600' : 'bg-slate-400'}`} />
												{c.is_active ? 'Aktif' : 'Nonaktif'}
											</span>
										</td>
										<td className="px-6 py-4 text-right">
											<div className="flex items-center justify-end gap-2">
												<button
													type="button"
													onClick={() => handleOpenEdit(c)}
													title="Edit Seksi"
													className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-colors"
												>
													<PencilIcon className="h-4 w-4" />
												</button>
												<button
													type="button"
													onClick={() => setDeletingCategory(c)}
													title="Hapus Seksi"
													className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 transition-colors"
												>
													<TrashIcon className="h-4 w-4" />
												</button>
											</div>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Create Modal */}
			{showCreateModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
					<div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
						<div className="flex items-center justify-between border-b border-slate-100 pb-4">
							<h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
								<PlusIcon className="h-5 w-5 text-emerald-600" />
								Tambah Seksi Layanan Baru
							</h3>
							<button type="button" onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
								<XMarkIcon className="h-5 w-5" />
							</button>
						</div>

						<form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
							<div className="grid grid-cols-3 gap-3">
								<div>
									<label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
										Kode (A-Z)
									</label>
									<input
										type="text"
										required
										maxLength={3}
										value={formData.code}
										onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
										placeholder="E"
										className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-center font-black text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none uppercase"
									/>
								</div>
								<div className="col-span-2">
									<label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
										Urutan Tampilan
									</label>
									<input
										type="number"
										min={1}
										required
										value={formData.display_order}
										onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) })}
										className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
									/>
								</div>
							</div>

							<div>
								<label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
									Nama Seksi Layanan
								</label>
								<input
									type="text"
									required
									value={formData.name}
									onChange={(e) => setFormData({ ...formData, name: e.target.value })}
									placeholder="Contoh: Seksi Bimas Kristen"
									className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
								/>
							</div>

							<div>
								<label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
									Deskripsi Singkat (Opsional)
								</label>
								<textarea
									rows={2}
									value={formData.description}
									onChange={(e) => setFormData({ ...formData, description: e.target.value })}
									placeholder="Layanan administrasi dan pembinaan..."
									className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
								/>
							</div>

							<div className="flex items-center gap-2 pt-1">
								<input
									type="checkbox"
									id="createActive"
									checked={formData.is_active}
									onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
									className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
								/>
								<label htmlFor="createActive" className="text-sm font-semibold text-slate-700 cursor-pointer">
									Status Seksi Aktif (Tampil di Kiosk & Panggilan)
								</label>
							</div>

							<div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
								<button
									type="button"
									onClick={() => setShowCreateModal(false)}
									className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
								>
									Batal
								</button>
								<button
									type="submit"
									disabled={submitting}
									className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50"
								>
									{submitting ? 'Menyimpan...' : 'Simpan Seksi'}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Edit Modal */}
			{editingCategory && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
					<div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
						<div className="flex items-center justify-between border-b border-slate-100 pb-4">
							<h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
								<PencilIcon className="h-5 w-5 text-emerald-600" />
								Edit Seksi: [{editingCategory.code}] {editingCategory.name}
							</h3>
							<button type="button" onClick={() => setEditingCategory(null)} className="text-slate-400 hover:text-slate-600">
								<XMarkIcon className="h-5 w-5" />
							</button>
						</div>

						<form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
							<div className="grid grid-cols-3 gap-3">
								<div>
									<label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
										Kode (A-Z)
									</label>
									<input
										type="text"
										required
										maxLength={3}
										value={formData.code}
										onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
										className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-center font-black text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none uppercase"
									/>
								</div>
								<div className="col-span-2">
									<label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
										Urutan Tampilan
									</label>
									<input
										type="number"
										min={1}
										required
										value={formData.display_order}
										onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) })}
										className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
									/>
								</div>
							</div>

							<div>
								<label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
									Nama Seksi Layanan
								</label>
								<input
									type="text"
									required
									value={formData.name}
									onChange={(e) => setFormData({ ...formData, name: e.target.value })}
									className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
								/>
							</div>

							<div>
								<label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
									Deskripsi Singkat
								</label>
								<textarea
									rows={2}
									value={formData.description}
									onChange={(e) => setFormData({ ...formData, description: e.target.value })}
									className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
								/>
							</div>

							<div className="flex items-center gap-2 pt-1">
								<input
									type="checkbox"
									id="editActive"
									checked={formData.is_active}
									onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
									className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
								/>
								<label htmlFor="editActive" className="text-sm font-semibold text-slate-700 cursor-pointer">
									Status Seksi Aktif (Tampil di Kiosk & Panggilan)
								</label>
							</div>

							<div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
								<button
									type="button"
									onClick={() => setEditingCategory(null)}
									className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
								>
									Batal
								</button>
								<button
									type="submit"
									disabled={submitting}
									className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50"
								>
									{submitting ? 'Menyimpan...' : 'Perbarui Seksi'}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Delete Modal */}
			{deletingCategory && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
					<div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl">
						<div className="flex items-center gap-3 text-rose-600">
							<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 border border-rose-200">
								<TrashIcon className="h-5 w-5 text-rose-600" />
							</div>
							<div>
								<h3 className="text-base font-bold text-slate-900">Hapus Seksi Layanan</h3>
								<p className="text-xs text-slate-500">Tindakan ini juga menghapus riwayat antriannya</p>
							</div>
						</div>

						<p className="mt-4 text-sm text-slate-700">
							Apakah Anda yakin ingin menghapus seksi <strong className="text-slate-900">[{deletingCategory.code}] {deletingCategory.name}</strong>?
						</p>

						<div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
							<button
								type="button"
								onClick={() => setDeletingCategory(null)}
								className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
							>
								Batal
							</button>
							<button
								type="button"
								onClick={handleDeleteConfirm}
								disabled={submitting}
								className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors shadow-xs disabled:opacity-50"
							>
								{submitting ? 'Menghapus...' : 'Ya, Hapus Seksi'}
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Reset Queues Modal */}
			{showResetModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
					<div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 shadow-2xl">
						<div className="flex items-center gap-3 text-amber-700">
							<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 border border-amber-200">
								<ArrowPathIcon className="h-5 w-5 text-amber-600" />
							</div>
							<div>
								<h3 className="text-base font-bold text-slate-900">Reset Penomoran Antrian Hari Ini</h3>
								<p className="text-xs text-slate-500">Mereset urutan nomor tiket berikutnya kembali ke 001</p>
							</div>
						</div>

						<div className="mt-4 space-y-3 text-sm text-slate-700">
							<p className="font-semibold text-xs text-slate-600">Pilih cakupan seksi yang ingin direset nomor antriannya hari ini:</p>
							<ModernSelect
								value={resetTarget}
								onChange={setResetTarget}
								options={[
									{
										value: 'all',
										label: 'Semua Seksi Layanan (Reset Total)',
										description: 'Mereset nomor antrian seluruh seksi sekaligus ke 001',
										badge: 'Semua',
									},
									...categories.map((c) => ({
										value: c.id,
										label: `[${c.code}] ${c.name}`,
										description: `Hanya reset penomoran loket seksi ${c.code}`,
										badge: `Loket ${c.code}`,
									})),
								]}
								size="md"
								className="w-full"
							/>
							<p className="text-xs text-slate-500">
								Setelah direset, tiket yang dicetak selanjutnya akan bernomor awal kembali (misal <strong>A001</strong>).
							</p>
						</div>

						<div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
							<button
								type="button"
								onClick={() => setShowResetModal(false)}
								className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
							>
								Batal
							</button>
							<button
								type="button"
								onClick={handleResetQueuesConfirm}
								disabled={submitting}
								className="rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white hover:bg-amber-700 transition-colors shadow-xs disabled:opacity-50"
							>
								{submitting ? 'Mereset...' : 'Ya, Reset Nomor Antrian'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
