import React, { useState, useEffect } from 'react';
import { Head, usePage } from '@inertiajs/react'; // Import usePage if not already
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import CsvTable from './CsvTable';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
ChartJS.register(ArcElement, Tooltip, Legend);

export default function Index({ auth }) {
    const [csvData, setCsvData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('');
    const [debugInfo, setDebugInfo] = useState(null);
    const [usingFallback, setUsingFallback] = useState(false);

    // State for specific searches (Direct, Offline, Tender)
    const [directAcquisitionIdSearch, setDirectAcquisitionIdSearch] = useState('');
    const [directAcquisitionSearchResults, setDirectAcquisitionSearchResults] = useState(null);
    const [directAcquisitionSearchLoading, setDirectAcquisitionSearchLoading] = useState(false);
    const [directAcquisitionSearchError, setDirectAcquisitionSearchError] = useState(null);

    const [offlineAcquisitionIdSearch, setOfflineAcquisitionIdSearch] = useState('');
    const [offlineAcquisitionSearchResults, setOfflineAcquisitionSearchResults] = useState(null);
    const [offlineAcquisitionSearchLoading, setOfflineAcquisitionSearchLoading] = useState(false);
    const [offlineAcquisitionSearchError, setOfflineAcquisitionSearchError] = useState(null);

    const [publicTenderIdSearch, setPublicTenderIdSearch] = useState('');
    const [publicTenderSearchResults, setPublicTenderSearchResults] = useState(null);
    const [publicTenderSearchLoading, setPublicTenderSearchLoading] = useState(false);
    const [publicTenderSearchError, setPublicTenderSearchError] = useState(null);

    // State for Pie Chart data (full aggregation)
    const [pieChartData, setPieChartData] = useState({ labels: [], datasets: [] });
    const [pieLoading, setPieLoading] = useState(false);
    const [pieError, setPieError] = useState(null);


    // Pretty names for files
    const fileDisplayNames = {
        'achizitii_directe.csv': 'Achiziții Directe',
        'achizitii_offline.csv': 'Achiziții Offline',
        'licitatii_publice.csv': 'Licitații Publice',
        'test.csv': 'Test'
    };

    // Initial data fetch for tables
    useEffect(() => {
        fetchData();
    }, []);

    // Fetch aggregated data for Pie Chart when tab is active
    useEffect(() => {
        if (activeTab === 'achizitii_directe.csv') {
            fetchPieData();
        } else {
            // Clear pie data when switching away
            setPieChartData({ labels: [], datasets: [] });
            setPieError(null);
        }
    }, [activeTab]);

    const fetchPieData = async () => {
        setPieLoading(true);
        setPieError(null);
        try {
            // Use the named route if available, otherwise use the direct path
            const pieRoute = route ? route('seap.pie.data', { filename: 'achizitii_directe.csv' }) : '/seap/pie-data/achizitii_directe.csv';
            const response = await axios.get(pieRoute);
            
            console.log("Aggregated Pie Data Response:", response.data);

            if (response.data.error) {
                 throw new Error(response.data.error);
            }

            // Format for Chart.js
            setPieChartData({
                labels: response.data.labels,
                datasets: [{
                    data: response.data.data,
                    backgroundColor: [
                        '#4dc9f6','#f67019','#f53794','#537bc4','#acc236',
                        '#166a8f','#00a950','#58595b','#8549ba',
                        // Add more colors if needed, maybe generate dynamically
                        '#ff9f40', '#ffcd56', '#4bc0c0', '#9966ff', '#ff6384', 
                        '#36a2eb', '#c9cbcf', '#ffb3ba', '#ffdfba', '#ffffba',
                        '#baffc9', '#bae1ff', '#e0baff'
                    ],
                    borderColor: '#ffffff',
                    borderWidth: 1,
                }]
            });

        } catch (err) {
            console.error('Error fetching aggregated pie data:', err);
            let errorMessage = 'Eroare la încărcarea datelor pentru grafic';
             if (err.response?.data?.error) {
                 errorMessage += `: ${err.response.data.error}`;
             } else if (err.message) {
                 errorMessage += `: ${err.message}`;
             }
            setPieError(errorMessage);
            setPieChartData({ labels: [], datasets: [] }); // Clear data on error
        } finally {
            setPieLoading(false);
        }
    };

    const fetchData = async () => { // Fetches limited data for tables
        try {
            setLoading(true);
            setError(null);
            setDebugInfo(null);
            setUsingFallback(false);
            clearAllSpecificSearches(); 
            
            // ... (rest of existing fetchData logic remains the same) ...
            // Try the main endpoint first
            try {
                const tableRoute = route ? route('seap.data') : '/seap-data';
                const response = await axios.get(tableRoute);
                console.log('Main CSV Response (for tables):', response.data);
                
                if (response.data.error) {
                    throw new Error(response.data.error);
                }
                
                setCsvData(response.data);
                
                // Set the first file as active tab if available
                if (Object.keys(response.data).length > 0 && !activeTab) { // Set only if not already set
                    setActiveTab(Object.keys(response.data)[0]);
                } else if (!Object.keys(response.data).length && response.data.message) {
                    setError(response.data.message);
                }
            } catch (err) {
                 console.error('Error with main endpoint. Trying fallback:', err);
                 // Fallback logic remains the same...
                 const simpleCsvRoute = route ? route('simple.csv') : '/simple-csv';
                 const simpleCsvResponse = await axios.get(simpleCsvRoute);
                 // ... rest of fallback logic ...
                 setCsvData(formattedData);
                 if (!activeTab) setActiveTab(fileName); // Set only if not already set
                 setUsingFallback(true);
            }
        } catch (err) {
            // ... (existing error handling for fetchData) ...
            setError(errorMessage);
            setCsvData({});
        } finally {
            setLoading(false);
        }
    };

    // Function to handle specific searches (Direct, Offline, Tender) - remains the same
    const handleDirectAcquisitionSearch = async (e) => {
        e.preventDefault();
        if (!directAcquisitionIdSearch.trim()) {
            setDirectAcquisitionSearchError('Introduceți un ID valid.');
            return;
        }
        setDirectAcquisitionSearchLoading(true);
        setDirectAcquisitionSearchError(null);
        setDirectAcquisitionSearchResults(null); // Clear previous results

        try {
            const response = await axios.get(route('seap.search.direct', { id: directAcquisitionIdSearch }));
            console.log('Specific Direct Search Response:', response.data);
            if (response.data.rows && response.data.rows.length > 0) {
                setDirectAcquisitionSearchResults(response.data);
            } else {
                setDirectAcquisitionSearchError(`Nu s-au găsit rezultate pentru ID: ${directAcquisitionIdSearch}`);
            }
        } catch (err) {
            console.error('Error during specific direct search:', err);
            setDirectAcquisitionSearchError(err.response?.data?.error || 'Eroare la căutare.');
        } finally {
            setDirectAcquisitionSearchLoading(false);
        }
    };

    const handleOfflineAcquisitionSearch = async (e) => {
        e.preventDefault();
        if (!offlineAcquisitionIdSearch.trim()) {
            setOfflineAcquisitionSearchError('Introduceți un ID valid.');
            return;
        }
        setOfflineAcquisitionSearchLoading(true);
        setOfflineAcquisitionSearchError(null);
        setOfflineAcquisitionSearchResults(null);

        try {
            const response = await axios.get(route('seap.search.offline', { id: offlineAcquisitionIdSearch }));
            console.log('Specific Offline Search Response:', response.data);
            if (response.data.rows && response.data.rows.length > 0) {
                setOfflineAcquisitionSearchResults(response.data);
            } else {
                setOfflineAcquisitionSearchError(`Nu s-au găsit rezultate pentru ID: ${offlineAcquisitionIdSearch}`);
            }
        } catch (err) {
            console.error('Error during specific offline search:', err);
            setOfflineAcquisitionSearchError(err.response?.data?.error || 'Eroare la căutare.');
        } finally {
            setOfflineAcquisitionSearchLoading(false);
        }
    };

    const handlePublicTenderSearch = async (e) => {
        e.preventDefault();
        if (!publicTenderIdSearch.trim()) {
            setPublicTenderSearchError('Introduceți un ID valid.');
            return;
        }
        setPublicTenderSearchLoading(true);
        setPublicTenderSearchError(null);
        setPublicTenderSearchResults(null); // Clear previous results

        try {
            const response = await axios.get(route('seap.search.tender', { id: publicTenderIdSearch }));
            console.log('Specific Tender Search Response:', response.data);
            if (response.data.rows && response.data.rows.length > 0) {
                setPublicTenderSearchResults(response.data);
            } else {
                setPublicTenderSearchError(`Nu s-au găsit rezultate pentru ID: ${publicTenderIdSearch}`);
            }
        } catch (err) {
            console.error('Error during specific tender search:', err);
            setPublicTenderSearchError(err.response?.data?.error || 'Eroare la căutare.');
        } finally {
            setPublicTenderSearchLoading(false);
        }
    };
    
    const clearAllSpecificSearches = () => {
        setDirectAcquisitionIdSearch('');
        setDirectAcquisitionSearchResults(null);
        setDirectAcquisitionSearchError(null);
        
        setOfflineAcquisitionIdSearch('');
        setOfflineAcquisitionSearchResults(null);
        setOfflineAcquisitionSearchError(null);

        setPublicTenderIdSearch('');
        setPublicTenderSearchResults(null);
        setPublicTenderSearchError(null);
    };

    const getFileDisplayName = (filename) => {
        return fileDisplayNames[filename] || filename;
    };


    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Date SEAP</h2>}
        >
            <Head title="SEAP" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            {usingFallback && (
                                <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded">
                                    Notă: Se folosește un mod simplificat pentru afișarea datelor.
                                </div>
                            )}
                        
                            {loading ? (
                                <div className="flex justify-center p-12">
                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                                </div>
                            ) : error ? (
                                <div className="p-4 text-center">
                                    <div className="text-red-500 mb-4 whitespace-pre-line">{error}</div>
                                    {debugInfo && (
                                        <div className="mb-4 text-left p-4 bg-gray-100 rounded overflow-auto max-h-48">
                                            <div className="font-medium mb-2">Debug Info:</div>
                                            <pre className="text-xs">{JSON.stringify(debugInfo, null, 2)}</pre>
                                        </div>
                                    )}
                                    <button 
                                        onClick={fetchData} 
                                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                    >
                                        Încearcă din nou
                                    </button>
                                </div>
                            ) : Object.keys(csvData).length === 0 ? (
                                <div className="p-4 text-center">Nu există fișiere CSV disponibile.</div>
                            ) : (
                                <>
                                    <div className="mb-4">
                                        <div className="border-b border-gray-200">
                                            <nav className="-mb-px flex flex-wrap">
                                                {Object.keys(csvData).map((filename) => (
                                                    <button
                                                        key={filename}
                                                        onClick={() => {
                                                            setActiveTab(filename);
                                                            // Clear specific search when changing tabs
                                                            clearAllSpecificSearches(); 
                                                        }}
                                                        className={`mr-2 whitespace-nowrap py-4 px-3 border-b-2 font-medium text-sm ${
                                                            activeTab === filename
                                                                ? 'border-blue-500 text-blue-600'
                                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                        }`}
                                                    >
                                                        {getFileDisplayName(filename)}
                                                    </button>
                                                ))}
                                            </nav>
                                        </div>
                                    </div>

                                    {/* Specific Search Section */}
                                    <div className="mb-6 p-4 border rounded bg-gray-50">
                                        {activeTab === 'achizitii_directe.csv' && (
                                            <form onSubmit={handleDirectAcquisitionSearch} className="flex items-center space-x-2">
                                                <label htmlFor="directIdSearch" className="font-medium">Caută după ID Achiziție Directă:</label>
                                                <input
                                                    id="directIdSearch"
                                                    type="text"
                                                    value={directAcquisitionIdSearch}
                                                    onChange={(e) => setDirectAcquisitionIdSearch(e.target.value)}
                                                    placeholder="Introduceți ID..."
                                                    className="px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 flex-grow"
                                                />
                                                <button 
                                                    type="submit"
                                                    className="px-4 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                                                    disabled={directAcquisitionSearchLoading}
                                                >
                                                    {directAcquisitionSearchLoading ? 'Caută...' : 'Caută ID'}
                                                </button>
                                                {(directAcquisitionSearchResults || directAcquisitionSearchError) && (
                                                    <button 
                                                        type="button"
                                                        onClick={clearAllSpecificSearches}
                                                        className="px-4 py-1 bg-gray-400 text-white rounded hover:bg-gray-500"
                                                        title="Șterge căutarea specifică"
                                                    >
                                                        X
                                                    </button>
                                                )}
                                            </form>
                                        )}
                                        {activeTab === 'achizitii_offline.csv' && (
                                            <form onSubmit={handleOfflineAcquisitionSearch} className="flex items-center space-x-2">
                                                <label htmlFor="offlineIdSearch" className="font-medium">Caută după ID Notificare Atribuire:</label>
                                                <input
                                                    id="offlineIdSearch"
                                                    type="text"
                                                    value={offlineAcquisitionIdSearch}
                                                    onChange={(e) => setOfflineAcquisitionIdSearch(e.target.value)}
                                                    placeholder="Introduceți ID..."
                                                    className="px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 flex-grow"
                                                />
                                                <button 
                                                    type="submit"
                                                    className="px-4 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                                                    disabled={offlineAcquisitionSearchLoading}
                                                >
                                                    {offlineAcquisitionSearchLoading ? 'Caută...' : 'Caută ID'}
                                                </button>
                                                {(offlineAcquisitionSearchResults || offlineAcquisitionSearchError) && (
                                                    <button 
                                                        type="button"
                                                        onClick={clearAllSpecificSearches}
                                                        className="px-4 py-1 bg-gray-400 text-white rounded hover:bg-gray-500"
                                                        title="Șterge căutarea specifică"
                                                    >
                                                        X
                                                    </button>
                                                )}
                                            </form>
                                        )}
                                        {activeTab === 'licitatii_publice.csv' && (
                                            <form onSubmit={handlePublicTenderSearch} className="flex items-center space-x-2">
                                                <label htmlFor="tenderIdSearch" className="font-medium">Caută după ID Notificare AC:</label>
                                                <input
                                                    id="tenderIdSearch"
                                                    type="text"
                                                    value={publicTenderIdSearch}
                                                    onChange={(e) => setPublicTenderIdSearch(e.target.value)}
                                                    placeholder="Introduceți ID..."
                                                    className="px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 flex-grow"
                                                />
                                                <button 
                                                    type="submit"
                                                    className="px-4 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                                                    disabled={publicTenderSearchLoading}
                                                >
                                                    {publicTenderSearchLoading ? 'Caută...' : 'Caută ID'}
                                                </button>
                                                {(publicTenderSearchResults || publicTenderSearchError) && (
                                                    <button 
                                                        type="button"
                                                        onClick={clearAllSpecificSearches}
                                                        className="px-4 py-1 bg-gray-400 text-white rounded hover:bg-gray-500"
                                                        title="Șterge căutarea specifică"
                                                    >
                                                        X
                                                    </button>
                                                )}
                                            </form>
                                        )}
                                        {/* Display errors for specific searches */}
                                        {directAcquisitionSearchError && activeTab === 'achizitii_directe.csv' && (
                                            <div className="mt-2 text-red-600">{directAcquisitionSearchError}</div>
                                        )}
                                        {offlineAcquisitionSearchError && activeTab === 'achizitii_offline.csv' && (
                                            <div className="mt-2 text-red-600">{offlineAcquisitionSearchError}</div>
                                        )}
                                        {publicTenderSearchError && activeTab === 'licitatii_publice.csv' && (
                                            <div className="mt-2 text-red-600">{publicTenderSearchError}</div>
                                        )}
                                    </div>

                                    {/* Display Specific Search Results OR General Table */}
                                    {activeTab === 'achizitii_directe.csv' && directAcquisitionSearchResults ? (
                                        <div>
                                            <h3 className="mb-2 text-lg font-semibold">Rezultate Căutare Specifică (ID: {directAcquisitionSearchResults.searchId})</h3>
                                            <CsvTable 
                                                headers={directAcquisitionSearchResults.headers} 
                                                rows={directAcquisitionSearchResults.rows} 
                                            />
                                        </div>
                                    ) : activeTab === 'achizitii_offline.csv' && offlineAcquisitionSearchResults ? (
                                        <div>
                                            <h3 className="mb-2 text-lg font-semibold">Rezultate Căutare Specifică (ID: {offlineAcquisitionSearchResults.searchId})</h3>
                                            <CsvTable 
                                                headers={offlineAcquisitionSearchResults.headers} 
                                                rows={offlineAcquisitionSearchResults.rows} 
                                            />
                                        </div>
                                    ) : activeTab === 'licitatii_publice.csv' && publicTenderSearchResults ? (
                                        <div>
                                            <h3 className="mb-2 text-lg font-semibold">Rezultate Căutare Specifică (ID: {publicTenderSearchResults.searchId})</h3>
                                            <CsvTable 
                                                headers={publicTenderSearchResults.headers} 
                                                rows={publicTenderSearchResults.rows} 
                                            />
                                        </div>
                                    ) : (
                                        // General Table Display (if no specific search results for the active tab)
                                        activeTab && csvData[activeTab] && !csvData[activeTab].error && (
                                            <div>
                                                {csvData[activeTab].limited && ( 
                                                    <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded">
                                                        Notă: Se afișează primele {csvData[activeTab].displayed_rows} rânduri din {csvData[activeTab].total_rows}. Folosiți căutarea specifică după ID de mai sus pentru a găsi o intrare anume.
                                                    </div>
                                                )}
                                                <CsvTable 
                                                    headers={csvData[activeTab].headers} 
                                                    rows={csvData[activeTab].rows} 
                                                />
                                            </div>
                                        )
                                    )}
                                    
                                    {/* Error display for the active tab (general loading) - only if no specific search results are shown */}
                                    {!(directAcquisitionSearchResults || offlineAcquisitionSearchResults || publicTenderSearchResults) && activeTab && csvData[activeTab] && csvData[activeTab].error && (
                                        <div className="p-4 text-center text-red-500">
                                            {csvData[activeTab].error}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* PieChart Section - Moved outside the main data container if preferred, or keep inside */}
                    {activeTab === 'achizitii_directe.csv' && (
                        <div className="mt-8 mb-8 bg-white p-6 rounded shadow sm:rounded-lg">
                            <h3 className="text-lg font-semibold mb-4">Suma totală tranzacționată per oraș (Achiziții Directe - Toate Datele)</h3>
                            {pieLoading ? (
                                <div className="flex justify-center items-center h-64">
                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                                </div>
                            ) : pieError ? (
                                <div className="text-red-600 text-center p-4">{pieError}</div>
                            ) : pieChartData.labels.length > 0 ? (
                                <div style={{ height: '450px', position: 'relative' }}> {/* Increased height slightly */}
                                    <Pie
                                        data={pieChartData} // Use the new state variable
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: {
                                                    position: 'right',
                                                },
                                                tooltip: {
                                                    callbacks: {
                                                        label: function(context) {
                                                            let label = context.label || '';
                                                            if (label) {
                                                                label += ': ';
                                                            }
                                                            if (context.parsed !== null) {
                                                                label += new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(context.parsed);
                                                            }
                                                            return label;
                                                        }
                                                    }
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="text-gray-500 text-center p-4">Nu există date agregate pentru afișare.</div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
