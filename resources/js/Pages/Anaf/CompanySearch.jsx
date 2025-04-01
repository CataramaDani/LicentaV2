import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import axios from 'axios';

export default function CompanySearch() {
    const [cui, setCui] = useState('');
    const [companyData, setCompanyData] = useState(null);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.get(`/anaf/company?cui=${cui}`);
            setCompanyData(response.data);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.error || 'A apărut o eroare');
            setCompanyData(null);
        }
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Verificare ANAF</h2>}
        >
            <Head title="Verificare ANAF" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        <div className="p-6">
                            <form onSubmit={handleSubmit}>
                                <div className="mb-4">
                                    <label className="block text-gray-700 text-sm font-bold mb-2">
                                        CUI Companie
                                    </label>
                                    <input
                                        type="text"
                                        value={cui}
                                        onChange={(e) => setCui(e.target.value)}
                                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                        placeholder="Introduceți CUI-ul"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                                >
                                    Verifică
                                </button>
                            </form>

                            {error && (
                                <div className="mt-4 text-red-500">
                                    {error}
                                </div>
                            )}

                            {companyData && (
                                <div className="mt-4">
                                    <h3 className="text-lg font-semibold mb-4">Rezultate:</h3>
                                    <table className="table-auto border-collapse border border-gray-300 w-full">
                                        <thead>
                                            <tr>
                                                <th className="border border-gray-300 px-4 py-2">Câmp</th>
                                                <th className="border border-gray-300 px-4 py-2">Valoare</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(companyData.found[0]?.date_generale || {}).map(([key, value]) => (
                                                <tr key={key}>
                                                    <td className="border border-gray-300 px-4 py-2 font-medium">{key}</td>
                                                    <td className="border border-gray-300 px-4 py-2">{value || 'N/A'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}