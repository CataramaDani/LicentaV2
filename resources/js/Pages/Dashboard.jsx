import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

export default function Dashboard() {
	return (
		<AuthenticatedLayout
			header={
				<h2 className="text-xl font-semibold leading-tight text-gray-800">
					Dashboard
				</h2>
			}
		>
			<Head title="Dashboard" />

			<div className="py-12">
				<div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
					<div className="overflow-hidden bg-white shadow-sm sm:rounded-lg p-6">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<Link
								href={route('pnrr')}
								className="block p-6 bg-blue-50 hover:bg-blue-100 rounded-lg shadow transition"
							>
								<h3 className="text-lg font-medium text-blue-700">PNRR</h3>
								<p className="mt-2 text-sm text-blue-600">
									Vezi datele din fișiere CSV și rapoarte.
								</p>
							</Link>

							<Link
								href={route('company.search')}
								className="block p-6 bg-green-50 hover:bg-green-100 rounded-lg shadow transition"
							>
								<h3 className="text-lg font-medium text-green-700">Căutare ANAF</h3>
								<p className="mt-2 text-sm text-green-600">
									Verifică informații firme după CUI.
								</p>
							</Link>

							<Link
								href={route('profile.edit')}
								className="block p-6 bg-yellow-50 hover:bg-yellow-100 rounded-lg shadow transition"
							>
								<h3 className="text-lg font-medium text-yellow-700">Profil</h3>
								<p className="mt-2 text-sm text-yellow-600">
									Actualizează-ți datele de utilizator și parola.
								</p>
							</Link>
						</div>
					</div>
				</div>
			</div>
		</AuthenticatedLayout>
	);
}
