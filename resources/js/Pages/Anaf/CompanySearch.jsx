import { useState, useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import axios from 'axios';

// Custom JSON display component
const JSONDisplay = ({ data, title, expanded = false }) => {
    const [isExpanded, setIsExpanded] = useState(expanded);
    
    if (!data || typeof data !== 'object') return null;
    
    // Format label from key name
    const formatLabel = (key) => {
        // Special case formatting for common keys
        const specialCases = {
            'cui': 'CUI',
            'scpTVA': 'Plătitor TVA',
            'statusInactivi': 'Inactiv',
            'nrRegCom': 'Nr. Reg. Com.',
            'codPostal': 'Cod Poștal',
            'statusRO_e_Factura': 'RO e-Factura'
        };
        
        if (specialCases[key]) return specialCases[key];
        
        // Default formatting
        return key
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };
    
    // Format value for display
    const formatValue = (val) => {
        if (val === null || val === undefined || val === '') return '-';
        if (typeof val === 'boolean') return val ? 'Da' : 'Nu';
        return String(val);
    };
    
    return (
        <div className="mb-6 border rounded-lg overflow-hidden">
            <div 
                className="flex justify-between items-center p-3 bg-gray-50 cursor-pointer" 
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <h3 className="font-medium text-gray-700">{title}</h3>
                <button className="text-gray-500">{isExpanded ? '▼' : '►'}</button>
            </div>
            
            {isExpanded && (
                <div className="p-0">
                    <table className="w-full border-collapse">
                        <tbody>
                            {Object.entries(data).map(([key, value]) => {
                                // Skip rendering null/undefined values
                                if (value === null || value === undefined) return null;
                                
                                // Handle nested objects
                                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                                    return (
                                        <tr key={key} className="border-t">
                                            <td colSpan="2" className="p-0">
                                                <JSONDisplay 
                                                    data={value} 
                                                    title={formatLabel(key)} 
                                                />
                                            </td>
                                        </tr>
                                    );
                                }
                                
                                return (
                                    <tr key={key} className="border-t hover:bg-gray-50">
                                        <td className="p-3 w-1/3 font-medium text-gray-600">
                                            {formatLabel(key)}
                                        </td>
                                        <td className="p-3 break-words text-gray-800">
                                            {formatValue(value)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default function CompanySearch() {
    const { presetCui } = usePage().props;
    const [cui, setCui] = useState(presetCui || '');
    const [companyData, setCompanyData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (presetCui) {
            (async () => {
                setLoading(true);
                setError(null);
                try {
                    const response = await axios.get(`/anaf/company?cui=${presetCui}`);
                    if (response.data.success) {
                        setCompanyData(response.data.data);
                    } else {
                        setError(response.data.message);
                        setCompanyData(null);
                    }
                } catch (err) {
                    setError(err.response?.data?.message || 'Eroare la comunicarea cu serverul');
                    setCompanyData(null);
                } finally {
                    setLoading(false);
                }
            })();
        }
    }, [presetCui]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`/anaf/company?cui=${cui}`);
            if (response.data.success) {
                console.log('API Response:', response.data.data);
                setCompanyData(response.data.data);
                setError(null);
            } else {
                setError(response.data.message);
                setCompanyData(null);
            }
        } catch (err) {
            console.error('API Error:', err);
            setError(err.response?.data?.message || 'Eroare la comunicarea cu serverul');
            setCompanyData(null);
        } finally {
            setLoading(false);
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
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                                    disabled={loading}
                                >
                                    {loading ? 'Se caută...' : 'Verifică'}
                                </button>
                            </form>

                            {error && (
                                <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                                    {error}
                                </div>
                            )}

                            {companyData && (
                                <div className="mt-6">
                                    {companyData.date_generale?.denumire && (
                                        <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
                                            <h2 className="text-xl font-medium text-blue-800">
                                                {companyData.date_generale.denumire}
                                            </h2>
                                            {companyData.date_generale.cui && (
                                                <p className="text-blue-600">CUI: {companyData.date_generale.cui}</p>
                                            )}
                                        </div>
                                    )}
                                    
                                    <div className="space-y-2">
                                        <JSONDisplay 
                                            data={companyData.date_generale} 
                                            title="Date Generale" 
                                            expanded={true}
                                        />
                                        <JSONDisplay 
                                            data={companyData.inregistrare_scop_Tva} 
                                            title="Înregistrare TVA" 
                                        />
                                        <JSONDisplay 
                                            data={companyData.inregistrare_RTVAI} 
                                            title="TVA la Încasare" 
                                        />
                                        <JSONDisplay 
                                            data={companyData.adresa_sediu_social} 
                                            title="Adresa Sediu Social" 
                                        />
                                        <JSONDisplay 
                                            data={companyData.adresa_domiciliu_fiscal} 
                                            title="Adresa Domiciliu Fiscal" 
                                        />
                                        <JSONDisplay 
                                            data={companyData.stare_inactiv} 
                                            title="Stare Inactivitate" 
                                        />
                                        <JSONDisplay 
                                            data={companyData.inregistrare_SplitTVA} 
                                            title="Split TVA" 
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}