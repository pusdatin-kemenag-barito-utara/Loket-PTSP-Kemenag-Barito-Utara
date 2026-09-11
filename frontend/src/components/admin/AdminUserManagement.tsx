import React from 'react';
import { api } from '../../lib/api';
import type { User } from '../../lib/types';
import {
	UsersIcon,
	PlusIcon,
	PencilIcon,
	TrashIcon,
	SearchIcon,
	ShieldCheckIcon,
	XMarkIcon,
	CheckCircleIcon,
	EyeIcon,
	EyeOffIcon,
} from '../common/Icons';
import ModernSelect from '../common/ModernSelect';

interface AdminUserManagementProps {
	currentUser: User | null;
}

export default function AdminUserManagement({ currentUser }: AdminUserManagementProps) {
	const [users, setUsers] = React.useState<User[]>([]);
	const [loading, setLoading] = React.useState(true);
	const [search, setSearch] = React.useState('');
	const [error, setError] = React.useState<string | null>(null);
	const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

	// Modal states
	const [showCreateModal, setShowCreateModal] = React.useState(false);
	const [editingUser, setEditingUser] = React.useState<User | null>(null);
	const [deletingUser, setDeletingUser] = React.useState<User | null>(null);

	// Form fields
	const [formData, setFormData] = React.useState({
		name: '',
		username: '',
		password: '',
		confirmPassword: '',
		role: 'admin',
	});
	const [showPass, setShowPass] = React.useState(false);
	const [submitting, setSubmitting] = React.useState(false);

	const loadUsers = React.useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const list = await api.users();
			setUsers(list);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Gagal memuat daftar pengguna.');
		} finally {
			setLoading(false);
		}
	}, []);

	React.useEffect(() => {
		loadUsers();
	}, [loadUsers]);

	const flashSuccess = (msg: string) => {
		setSuccessMsg(msg);
		setTimeout(() => setSuccessMsg(null), 4000);
	};

	const handleOpenCreate = () => {
		setFormData({
			name: '',
			username: '',
			password: '',
			confirmPassword: '',
			role: 'admin',
		});
		setShowPass(false);
		setError(null);
		setShowCreateModal(true);
	};

	const handleOpenEdit = (u: User) => {
		setEditingUser(u);
		setFormData({
			name: u.name,
			username: u.username,
			password: '',
			confirmPassword: '',
			role: u.role || 'admin',
		});
		setShowPass(false);
		setError(null);
	};

	const handleCreateSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!formData.name.trim() || !formData.username.trim() || !formData.password) {
			setError('Nama, username, dan password wajib diisi.');
			return;
		}
		if (formData.password.length < 6) {
			setError('Password minimal 6 karakter.');
			return;
		}
		if (formData.password !== formData.confirmPassword) {
			setError('Konfirmasi password tidak cocok.');
			return;
		}

		setSubmitting(true);
		setError(null);
		try {
			await api.createUser({
				name: formData.name.trim(),
				username: formData.username.trim(),
				password: formData.password,
				role: formData.role,
			});
			setShowCreateModal(false);
			flashSuccess(`Pengguna @${formData.username} berhasil dibuat!`);
			loadUsers();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Gagal membuat pengguna.');
		} finally {
			setSubmitting(false);
		}
	};

	const handleEditSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingUser) return;
		if (!formData.name.trim() || !formData.username.trim()) {
			setError('Nama dan username wajib diisi.');
			return;
		}
		if (formData.password && formData.password.length < 6) {
			setError('Password baru minimal 6 karakter.');
			return;
		}
		if (formData.password && formData.password !== formData.confirmPassword) {
			setError('Konfirmasi password baru tidak cocok.');
			return;
		}

		setSubmitting(true);
		setError(null);
		try {
			await api.updateUser(editingUser.id, {
				name: formData.name.trim(),
				username: formData.username.trim(),
				role: formData.role,
				password: formData.password ? formData.password : undefined,
			});
			setEditingUser(null);
			flashSuccess(`Pengguna @${formData.username} berhasil diperbarui!`);
			loadUsers();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Gagal memperbarui pengguna.');
		} finally {
			setSubmitting(false);
		}
	};

	const handleDeleteConfirm = async () => {
		if (!deletingUser) return;
		if (currentUser && currentUser.id === deletingUser.id) {
			setError('Anda tidak dapat menghapus akun Anda sendiri.');
			setDeletingUser(null);
			return;
		}

		setSubmitting(true);
		setError(null);
		try {
			await api.deleteUser(deletingUser.id);
			flashSuccess(`Pengguna @${deletingUser.username} berhasil dihapus.`);
			setDeletingUser(null);
			loadUsers();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Gagal menghapus pengguna.');
		} finally {
			setSubmitting(false);
		}
	};

	const filteredUsers = users.filter((u) => {
		const q = search.toLowerCase();
		return u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
	});

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

			{/* Action & Search Bar */}
			<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
				<div className="relative flex-1 max-w-md">
					<SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
					<input
						type="text"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Cari nama atau username pengguna..."
						className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 shadow-xs"
					/>
				</div>

				<button
					type="button"
					onClick={handleOpenCreate}
					className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition-colors shadow-xs"
				>
					<PlusIcon className="h-4 w-4 stroke-[2.5]" />
					<span>Tambah Pengguna</span>
				</button>
			</div>

			{/* Users Table */}
			<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm text-slate-700">
						<thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
							<tr>
								<th className="px-6 py-4">Pengguna</th>
								<th className="px-6 py-4">Username / Email</th>
								<th className="px-6 py-4">Peran (Role)</th>
								<th className="px-6 py-4">Status & Dibuat</th>
								<th className="px-6 py-4 text-right">Aksi</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100 font-medium">
							{loading ? (
								<tr>
									<td colSpan={5} className="px-6 py-12 text-center text-slate-400">
										Memuat data pengguna...
									</td>
								</tr>
							) : filteredUsers.length === 0 ? (
								<tr>
									<td colSpan={5} className="px-6 py-12 text-center text-slate-400">
										Tidak ada pengguna yang cocok dengan pencarian.
									</td>
								</tr>
							) : (
								filteredUsers.map((u) => {
									const isSelf = currentUser?.id === u.id;
									const isSuper = u.role === 'super_admin' || u.username === 'baritoutara@kemenag.go.id';
									const createdDate = u.created_at
										? new Date(u.created_at).toLocaleDateString('id-ID', {
												day: 'numeric',
												month: 'short',
												year: 'numeric',
										  })
										: '—';

									return (
										<tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
											<td className="px-6 py-4">
												<div className="flex items-center gap-3">
													<div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs">
														{u.name ? u.name[0].toUpperCase() : 'U'}
													</div>
													<div>
														<div className="font-bold text-slate-900 flex items-center gap-2">
															{u.name}
															{isSelf && (
																<span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
																	Anda
																</span>
															)}
														</div>
														<div className="text-xs text-slate-400">ID: {u.id.slice(0, 8)}...</div>
													</div>
												</div>
											</td>
											<td className="px-6 py-4 font-semibold text-xs text-slate-700">{u.username}</td>
											<td className="px-6 py-4">
												<span
													className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${
														isSuper
															? 'bg-amber-100 text-amber-900 border border-amber-200'
															: 'bg-emerald-100 text-emerald-900 border border-emerald-200'
													}`}
												>
													<ShieldCheckIcon className="h-3.5 w-3.5" />
													{isSuper ? 'Super Admin' : 'Admin PTSP'}
												</span>
											</td>
											<td className="px-6 py-4 text-xs text-slate-500">
												<div className="flex items-center gap-1.5">
													<span className="h-2 w-2 rounded-full bg-emerald-500" />
													<span>Aktif • {createdDate}</span>
												</div>
											</td>
											<td className="px-6 py-4 text-right">
												<div className="flex items-center justify-end gap-2">
													<button
														type="button"
														onClick={() => handleOpenEdit(u)}
														title="Edit Pengguna"
														className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-colors"
													>
														<PencilIcon className="h-4 w-4" />
													</button>
													<button
														type="button"
														onClick={() => setDeletingUser(u)}
														disabled={isSelf}
														title={isSelf ? 'Tidak dapat menghapus diri sendiri' : 'Hapus Pengguna'}
														className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
															isSelf
																? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
																: 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300'
														}`}
													>
														<TrashIcon className="h-4 w-4" />
													</button>
												</div>
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Create User Modal */}
			{showCreateModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
					<div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
						<div className="flex items-center justify-between border-b border-slate-100 pb-4">
							<h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
								<UsersIcon className="h-5 w-5 text-emerald-600" />
								Tambah Pengguna Baru
							</h3>
							<button
								type="button"
								onClick={() => setShowCreateModal(false)}
								className="text-slate-400 hover:text-slate-600"
							>
								<XMarkIcon className="h-5 w-5" />
							</button>
						</div>

						<form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
							<div>
								<label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
									Nama Lengkap
								</label>
								<input
									type="text"
									required
									value={formData.name}
									onChange={(e) => setFormData({ ...formData, name: e.target.value })}
									placeholder="Contoh: Petugas Loket 1"
									className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
								/>
							</div>

							<div>
								<label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
									Username atau Email
								</label>
								<input
									type="text"
									required
									value={formData.username}
									onChange={(e) => setFormData({ ...formData, username: e.target.value })}
									placeholder="Contoh: petugas1 atau petugas1@kemenag.go.id"
									className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
								/>
							</div>

							<ModernSelect
								label="Peran / Role"
								value={formData.role}
								onChange={(val) => setFormData({ ...formData, role: val })}
								options={[
									{
										value: 'admin',
										label: 'Admin Loket PTSP',
										description: 'Dapat memanggil antrian dan mengelola operasional loket harian',
										badge: 'Staf Loket',
									},
									{
										value: 'super_admin',
										label: 'Super Administrator',
										description: 'Akses penuh sistem, manajemen pengguna, pengaturan TV, dan statistik',
										badge: 'Super Admin',
									},
								]}
								size="md"
								className="w-full"
							/>

							<div>
								<div className="flex items-center justify-between mb-1.5">
									<label className="text-xs font-bold uppercase tracking-wider text-slate-600">
										Password (Min. 6 Karakter)
									</label>
									<button
										type="button"
										onClick={() => setShowPass(!showPass)}
										className="text-xs text-slate-500 hover:text-emerald-700 flex items-center gap-1 font-semibold"
									>
										{showPass ? <EyeOffIcon className="h-3.5 w-3.5" /> : <EyeIcon className="h-3.5 w-3.5" />}
										<span>{showPass ? 'Sembunyikan' : 'Lihat'}</span>
									</button>
								</div>
								<input
									type={showPass ? 'text' : 'password'}
									required
									minLength={6}
									value={formData.password}
									onChange={(e) => setFormData({ ...formData, password: e.target.value })}
									placeholder="••••••••"
									className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
								/>
							</div>

							<div>
								<label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
									Konfirmasi Password
								</label>
								<input
									type={showPass ? 'text' : 'password'}
									required
									value={formData.confirmPassword}
									onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
									placeholder="••••••••"
									className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
								/>
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
									{submitting ? 'Menyimpan...' : 'Simpan Pengguna'}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Edit User Modal */}
			{editingUser && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
					<div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
						<div className="flex items-center justify-between border-b border-slate-100 pb-4">
							<h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
								<PencilIcon className="h-5 w-5 text-emerald-600" />
								Edit Pengguna: {editingUser.name}
							</h3>
							<button
								type="button"
								onClick={() => setEditingUser(null)}
								className="text-slate-400 hover:text-slate-600"
							>
								<XMarkIcon className="h-5 w-5" />
							</button>
						</div>

						<form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
							<div>
								<label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
									Nama Lengkap
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
									Username atau Email
								</label>
								<input
									type="text"
									required
									value={formData.username}
									onChange={(e) => setFormData({ ...formData, username: e.target.value })}
									className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
								/>
							</div>

							<ModernSelect
								label="Peran / Role"
								value={formData.role}
								onChange={(val) => setFormData({ ...formData, role: val })}
								options={[
									{
										value: 'admin',
										label: 'Admin Loket PTSP',
										description: 'Dapat memanggil antrian dan mengelola operasional loket harian',
										badge: 'Staf Loket',
									},
									{
										value: 'super_admin',
										label: 'Super Administrator',
										description: 'Akses penuh sistem, manajemen pengguna, pengaturan TV, dan statistik',
										badge: 'Super Admin',
									},
								]}
								size="md"
								className="w-full"
							/>

							<div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-3">
								<div className="flex items-center justify-between">
									<span className="text-xs font-bold text-slate-800">
										Ganti Password (Opsional)
									</span>
									<button
										type="button"
										onClick={() => setShowPass(!showPass)}
										className="text-xs text-slate-500 hover:text-emerald-700 flex items-center gap-1 font-semibold"
									>
										{showPass ? <EyeOffIcon className="h-3.5 w-3.5" /> : <EyeIcon className="h-3.5 w-3.5" />}
										<span>{showPass ? 'Sembunyikan' : 'Lihat'}</span>
									</button>
								</div>
								<p className="text-[11px] text-slate-500">
									Biarkan kosong jika tidak ingin merubah password saat ini.
								</p>
								<input
									type={showPass ? 'text' : 'password'}
									value={formData.password}
									onChange={(e) => setFormData({ ...formData, password: e.target.value })}
									placeholder="Password baru (min. 6 karakter)"
									className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
								/>
								{formData.password && (
									<input
										type={showPass ? 'text' : 'password'}
										value={formData.confirmPassword}
										onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
										placeholder="Ulangi password baru"
										className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
									/>
								)}
							</div>

							<div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
								<button
									type="button"
									onClick={() => setEditingUser(null)}
									className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
								>
									Batal
								</button>
								<button
									type="submit"
									disabled={submitting}
									className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50"
								>
									{submitting ? 'Menyimpan...' : 'Perbarui Pengguna'}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Delete Confirmation Modal */}
			{deletingUser && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
					<div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl">
						<div className="flex items-center gap-3 text-rose-600">
							<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 border border-rose-200">
								<TrashIcon className="h-5 w-5 text-rose-600" />
							</div>
							<div>
								<h3 className="text-base font-bold text-slate-900">Hapus Pengguna</h3>
								<p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
							</div>
						</div>

						<p className="mt-4 text-sm text-slate-700">
							Apakah Anda yakin ingin menghapus akun pengguna{' '}
							<strong className="text-slate-900">"{deletingUser.name}"</strong> (
							<span className="font-semibold text-emerald-700">@{deletingUser.username}</span>)?
						</p>

						<div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
							<button
								type="button"
								onClick={() => setDeletingUser(null)}
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
								{submitting ? 'Menghapus...' : 'Ya, Hapus Akun'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
