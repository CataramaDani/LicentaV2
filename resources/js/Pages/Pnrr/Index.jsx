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
                                                        onClick={() => setActiveTab(filename)}
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

                                    {activeTab && csvData[activeTab] && !csvData[activeTab].error && (
                                        <div>
                                            {csvData[activeTab].limited && (
                                                <div className="mb-4 p-2 bg-blue-50 border border-blue-200 text-blue-700 rounded">
                                                    Notă: Se afișează primele {csvData[activeTab].displayed_rows} rânduri din totalul de {csvData[activeTab].total_rows} rânduri.
                                                </div>
                                            )}
                                            <CsvTable 
                                                headers={csvData[activeTab].headers} 
                                                rows={csvData[activeTab].rows} 
                                            />
                                        </div>
                                    )}
                                    
                                    {activeTab && csvData[activeTab] && csvData[activeTab].error && (
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
