import React, { useState } from 'react';
import { Link } from '@inertiajs/react';

export default function CsvTable({ headers, rows }) {
    const [currentPage, setCurrentPage] = useState(1);
    const [search, setSearch] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    
    const rowsPerPage = 10;
    
    // Filtrare după căutare
    const filteredRows = rows.filter((row) =>
        Object.values(row).some(
            (value) => 
                value && 
                value.toString().toLowerCase().includes(search.toLowerCase())
        )
    );
    
    // Sortarea datelor
    const sortedRows = React.useMemo(() => {
        let sortableRows = [...filteredRows];
        if (sortConfig.key !== null) {
            sortableRows.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                
                // Verifică dacă valorile sunt numere
                const aNum = Number(aValue);
                const bNum = Number(bValue);
                
                if (!isNaN(aNum) && !isNaN(bNum)) {
                    return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
                }
                
                // Compară ca string-uri
                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableRows;
    }, [filteredRows, sortConfig]);
    
    // Paginare
    const paginatedRows = sortedRows.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );
    
    const totalPages = Math.ceil(sortedRows.length / rowsPerPage);
    
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };
    
    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    return (
        <div>
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Caută..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
            </div>
            
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {headers.map((header, index) => (
                                <th
                                    key={index}
                                    onClick={() => handleSort(header)}
                                    className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                                >
                                    <div className="flex items-center">
                                        {header}
                                        {sortConfig.key === header && (
                                            <span className="ml-1">
                                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {paginatedRows.map((row, rowIndex) => (
                            <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                {headers.map((header) => {
                                    const raw = row[header]?.toString() || '';
                                    const stripped = raw.replace(/^RO/i, '');
                                    return (
                                        <td key={header} className="p-3 break-words text-gray-800">
                                            {header.includes('CUI') ? (
                                                <Link
                                                    href={`/company-search?cui=${stripped}`}
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    {stripped || '-'}
                                                </Link>
                                            ) : (
                                                raw
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {/* Paginare */}
            {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6">
                    <div>
                        <p className="text-sm text-gray-700">
                            Afișare <span className="font-medium">{(currentPage - 1) * rowsPerPage + 1}</span> - 
                            <span className="font-medium">
                                {Math.min(currentPage * rowsPerPage, sortedRows.length)}
                            </span> din{' '}
                            <span className="font-medium">{sortedRows.length}</span> rezultate
                        </p>
                    </div>
                    <nav className="inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                        <button
                            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-sm font-medium ${
                                currentPage === 1
                                    ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                                    : 'bg-white text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            &laquo; Anterior
                        </button>
                        
                        {[...Array(totalPages)].map((_, i) => (
                            <button
                                key={i}
                                onClick={() => handlePageChange(i + 1)}
                                className={`relative inline-flex items-center px-4 py-2 text-sm font-medium ${
                                    currentPage === i + 1
                                        ? 'bg-blue-50 text-blue-600'
                                        : 'bg-white text-gray-500 hover:bg-gray-50'
                                }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                        
                        <button
                            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-sm font-medium ${
                                currentPage === totalPages
                                    ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                                    : 'bg-white text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            Următor &raquo;
                        </button>
                    </nav>
                </div>
            )}
        </div>
    );
}
