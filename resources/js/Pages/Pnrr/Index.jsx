import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import CsvTable from './CsvTable';
import axios from 'axios';

export default function Index({ auth }) {
    const [csvData, setCsvData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('');
    const [debugInfo, setDebugInfo] = useState(null);
    const [usingFallback, setUsingFallback] = useState(false);

    // State for specific Direct Acquisition ID search
    const [directAcquisitionIdSearch, setDirectAcquisitionIdSearch] = useState('');
    const [directAcquisitionSearchResults, setDirectAcquisitionSearchResults] = useState(null);
    const [directAcquisitionSearchLoading, setDirectAcquisitionSearchLoading] = useState(false);
    const [directAcquisitionSearchError, setDirectAcquisitionSearchError] = useState(null);

    // State for specific Offline Acquisition ID search
    const [offlineAcquisitionIdSearch, setOfflineAcquisitionIdSearch] = useState('');
    const [offlineAcquisitionSearchResults, setOfflineAcquisitionSearchResults] = useState(null);
    const [offlineAcquisitionSearchLoading, setOfflineAcquisitionSearchLoading] = useState(false);
    const [offlineAcquisitionSearchError, setOfflineAcquisitionSearchError] = useState(null);

    // State for specific Public Tender ID search
    const [publicTenderIdSearch, setPublicTenderIdSearch] = useState('');
    const [publicTenderSearchResults, setPublicTenderSearchResults] = useState(null);
    const [publicTenderSearchLoading, setPublicTenderSearchLoading] = useState(false);
    const [publicTenderSearchError, setPublicTenderSearchError] = useState(null);

    // Pretty names for files
    const fileDisplayNames = {
        'achizitii_directe.csv': 'Achiziții Directe',
        'achizitii_offline.csv': 'Achiziții Offline',
        'licitatii_publice.csv': 'Licitații Publice',
        'test.csv': 'Test'
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            setDebugInfo(null);
            setUsingFallback(false);
            // Clear all specific search results on general fetch
            clearAllSpecificSearches(); 
            
            // Get storage debug info first
            try {
                const debugResponse = await axios.get('/debug-storage');
                setDebugInfo(debugResponse.data);
                console.log('Storage debug info:', debugResponse.data);
            } catch (debugErr) {
                console.error('Error fetching debug info:', debugErr);
            }
            
            // Try the main endpoint first
            try {
                const response = await axios.get(route('pnrr.data'));
                console.log('Main CSV Response:', response.data);
                
                if (response.data.error) {
                    throw new Error(response.data.error);
                }
                
                setCsvData(response.data);
                
                // Set the first file as active tab if available
                if (Object.keys(response.data).length > 0) {
                    setActiveTab(Object.keys(response.data)[0]);
                } else if (response.data.message) {
                    setError(response.data.message);
                }
            } catch (err) {
                console.error('Error with main endpoint. Trying fallback:', err);
                
                // Fallback to simple-csv endpoint
                const simpleCsvResponse = await axios.get('/simple-csv');
                console.log('Fallback CSV Response:', simpleCsvResponse.data);
                
                if (simpleCsvResponse.data.error) {
                    throw new Error(simpleCsvResponse.data.error);
                }
                
                // Format the data to match what CsvTable expects
                const fileName = simpleCsvResponse.data.file;
                const formattedData = {
                    [fileName]: {
                        headers: simpleCsvResponse.data.headers,
                        rows: simpleCsvResponse.data.rows
                    }
                };
                
                setCsvData(formattedData);
                setActiveTab(fileName);
                setUsingFallback(true);
            }
        } catch (err) {
            console.error('All CSV loading attempts failed:', err);
            let errorMessage = 'A apărut o eroare la încărcarea datelor';
            
            if (err.response) {
                errorMessage += `: ${err.response.status} - ${err.response.statusText}`;
                if (err.response.data && err.response.data.error) {
                    errorMessage += `\n${err.response.data.error}`;
                }
            } else if (err.request) {
                errorMessage += ': Nu s-a primit niciun răspuns de la server';
            } else {
                errorMessage += `: ${err.message}`;
            }
            
            setError(errorMessage);
            setCsvData({});
        } finally {
            setLoading(false);
        }
    };

    // Function to handle the specific search by Direct Acquisition ID
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
            const response = await axios.get(route('pnrr.search.direct', { id: directAcquisitionIdSearch }));
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

    // Function to handle the specific search by Offline Acquisition ID
    const handleOfflineAcquisitionSearch = async (e) => {
        e.preventDefault();
        if (!offlineAcquisitionIdSearch.trim()) {
            setOfflineAcquisitionSearchError('Introduceți un ID valid.');
            return;
        }
        setOfflineAcquisitionSearchLoading(true);
        setOfflineAcquisitionSearchError(null);
        setOfflineAcquisitionSearchResults(null); // Clear previous results

        try {
            const response = await axios.get(route('pnrr.search.offline', { id: offlineAcquisitionIdSearch }));
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

    // Function to handle the specific search by Public Tender ID
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
            const response = await axios.get(route('pnrr.search.tender', { id: publicTenderIdSearch }));
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
    
    // Function to clear all specific search results
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

    // Function to get a pretty display name for a file
    const getFileDisplayName = (filename) => {
        return fileDisplayNames[filename] || filename;
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Date PNRR</h2>}
        >
            <Head title="PNRR" />

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
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
