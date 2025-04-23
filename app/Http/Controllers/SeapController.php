<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\File;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;

class SeapController extends Controller
{
    public function index()
    {
        return Inertia::render('Seap/Index');
    }

    public function getCsvData()
    {
        try {
            // Use the simplest approach just to get something working
            $path = public_path('storage');
            $files = glob($path . '/*.csv');
            
            if (empty($files)) {
                return response()->json([
                    'message' => 'No CSV file s found',
                    'path' => $path
                ]);
            }
            
            $data = [];
            
            // Process all files, not just the first one
            foreach ($files as $file) {
                $filename = basename($file);
                
                try {
                    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                    if ($lines === false || count($lines) < 1) {
                        $data[$filename] = [
                            'error' => 'Could not read file or file is empty',
                            'headers' => [],
                            'rows' => []
                        ];
                        continue;
                    }
                    
                    // Get and translate headers
                    $originalHeaders = str_getcsv($lines[0]);
                    $headers = $this->translateHeaders($originalHeaders);
                    
                    $records = [];
                    
                    // Process only first 1000 rows for safety
                    $rowLimit = min(230, count($lines) - 1);
                    for ($i = 1; $i <= $rowLimit; $i++) {
                        if (isset($lines[$i]) && !empty(trim($lines[$i]))) {
                            $row = str_getcsv($lines[$i]);
                            if (count($row) === count($headers)) {
                                $record = [];
                                foreach ($headers as $index => $header) {
                                    $record[$header] = $row[$index] ?? '';
                                }
                                $records[] = $record;
                            }
                        }
                    }
                    
                    $data[$filename] = [
                        'headers' => $headers,
                        'rows' => $records,
                        'total_rows' => count($lines) - 1,
                        'displayed_rows' => count($records),
                        'limited' => count($lines) - 1 > $rowLimit
                    ];
                    
                } catch (\Exception $e) {
                    Log::error("Error processing file {$filename}: " . $e->getMessage());
                    $data[$filename] = [
                        'error' => 'Error processing file: ' . $e->getMessage(),
                        'headers' => [],
                        'rows' => []
                    ];
                }
            }
            
            return response()->json($data);
            
        } catch (\Exception $e) {
            Log::error("Error in getCsvData: " . $e->getMessage() . "\n" . $e->getTraceAsString());
            return response()->json([
                'error' => 'General error: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Search for a specific Direct Acquisition by its ID efficiently.
     */
    public function searchDirectAcquisitionById(Request $request)
    {
        $searchId = $request->input('id');
        if (empty($searchId)) {
            return response()->json(['error' => 'ID is required'], 400);
        }

        $filename = 'achizitii_directe.csv';
        $filePath = public_path('storage/' . $filename);

        if (!file_exists($filePath)) {
            return response()->json(['error' => 'File not found: ' . $filename], 404);
        }

        $results = [];
        $headers = [];
        $idColumnIndex = -1;

        try {
            $handle = fopen($filePath, 'r');
            if ($handle === false) {
                throw new \Exception("Could not open file: {$filename}");
            }

            // Read header row
            $headerLine = fgetcsv($handle);
            if ($headerLine === false) {
                throw new \Exception("Could not read header from file: {$filename}");
            }
            
            $originalHeaders = $headerLine;
            $translatedHeaders = $this->translateHeaders($originalHeaders);
            $headers = $translatedHeaders; // Store translated headers for results

            // Find the index of the 'ID Achiziție Directă' column (using original header name for lookup)
            $idKey = 'directAcquisitionID'; // Or 'item.directAcquisitionId' depending on the actual CSV header
            // Check both possible keys for the ID
            $idColumnIndexOriginal = array_search($idKey, $originalHeaders);
            if ($idColumnIndexOriginal === false) {
                 $idKey = 'item.directAcquisitionId';
                 $idColumnIndexOriginal = array_search($idKey, $originalHeaders);
            }

            if ($idColumnIndexOriginal === false) {
                 // If still not found, try the translated header just in case
                 $translatedIdKey = $this->translateHeaders([$idKey])[0]; 
                 $idColumnIndex = array_search($translatedIdKey, $translatedHeaders);
                 if ($idColumnIndex === false) {
                    throw new \Exception("ID column '{$idKey}' not found in headers.");
                 }
            } else {
                $idColumnIndex = $idColumnIndexOriginal;
            }


            // Read data rows line by line
            while (($row = fgetcsv($handle)) !== false) {
                if (isset($row[$idColumnIndex]) && trim($row[$idColumnIndex]) === trim($searchId)) {
                    // Found a match
                    if (count($row) === count($headers)) {
                         $record = [];
                         foreach ($headers as $index => $header) {
                             $record[$header] = $row[$index] ?? '';
                         }
                         $results[] = $record;
                    } else {
                         Log::warning("Row column count mismatch for ID {$searchId} in {$filename}. Expected: " . count($headers) . ", Got: " . count($row));
                    }
                    // If you only expect one result, you could break here:
                    // break; 
                }
            }

            fclose($handle);

            return response()->json([
                'headers' => $headers,
                'rows' => $results,
                'searchId' => $searchId,
                'foundCount' => count($results)
            ]);

        } catch (\Exception $e) {
            Log::error("Error searching file {$filename} for ID {$searchId}: " . $e->getMessage());
            if (isset($handle) && is_resource($handle)) {
                fclose($handle);
            }
            return response()->json(['error' => 'Error searching file: ' . $e->getMessage()], 500);
        }
    }
    
    /**
     * Search for a specific Offline Acquisition by its ID efficiently.
     */
    public function searchOfflineAcquisitionById(Request $request)
    {
        $searchId = $request->input('id');
        if (empty($searchId)) {
            return response()->json(['error' => 'ID is required'], 400);
        }

        $filename = 'achizitii_offline.csv';
        $filePath = public_path('storage/' . $filename);

        if (!file_exists($filePath)) {
            return response()->json(['error' => 'File not found: ' . $filename], 404);
        }

        $results = [];
        $headers = [];
        $idColumnIndex = -1;
        $possibleIdKeys = ['item.daAwardNoticeId', 'siirapAcqId']; // Potential original header names for the ID

        try {
            $handle = fopen($filePath, 'r');
            if ($handle === false) {
                throw new \Exception("Could not open file: {$filename}");
            }

            // Read header row
            $headerLine = fgetcsv($handle);
            if ($headerLine === false) {
                throw new \Exception("Could not read header from file: {$filename}");
            }
            
            $originalHeaders = $headerLine;
            $translatedHeaders = $this->translateHeaders($originalHeaders);
            $headers = $translatedHeaders; // Store translated headers for results

            // Find the index of the ID column
            $foundIdKey = null;
            foreach ($possibleIdKeys as $key) {
                $idColumnIndexOriginal = array_search($key, $originalHeaders);
                if ($idColumnIndexOriginal !== false) {
                    $idColumnIndex = $idColumnIndexOriginal;
                    $foundIdKey = $key;
                    break;
                }
            }

            if ($idColumnIndex === -1) {
                 // Try translated headers if original keys not found
                 $translatedIdKey = $this->translateHeaders(['item.daAwardNoticeId'])[0]; // 'ID Notificare Atribuire'
                 $idColumnIndex = array_search($translatedIdKey, $translatedHeaders);
                 if ($idColumnIndex === false) {
                     throw new \Exception("ID column (tried: " . implode(', ', $possibleIdKeys) . ") not found in headers.");
                 }
            }

            // Read data rows line by line
            while (($row = fgetcsv($handle)) !== false) {
                if (isset($row[$idColumnIndex]) && trim($row[$idColumnIndex]) === trim($searchId)) {
                    // Found a match
                    if (count($row) === count($headers)) {
                         $record = [];
                         foreach ($headers as $index => $header) {
                             $record[$header] = $row[$index] ?? '';
                         }
                         $results[] = $record;
                    } else {
                         Log::warning("Row column count mismatch for ID {$searchId} in {$filename}. Expected: " . count($headers) . ", Got: " . count($row));
                    }
                    // break; // Uncomment if only one result is expected
                }
            }

            fclose($handle);

            return response()->json([
                'headers' => $headers,
                'rows' => $results,
                'searchId' => $searchId,
                'foundCount' => count($results)
            ]);

        } catch (\Exception $e) {
            Log::error("Error searching file {$filename} for ID {$searchId}: " . $e->getMessage());
            if (isset($handle) && is_resource($handle)) {
                fclose($handle);
            }
            return response()->json(['error' => 'Error searching file: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Search for a specific Public Tender by its ID efficiently.
     */
    public function searchPublicTenderById(Request $request)
    {
        $searchId = $request->input('id');
        if (empty($searchId)) {
            return response()->json(['error' => 'ID is required'], 400);
        }

        $filename = 'licitatii_publice.csv';
        $filePath = public_path('storage/' . $filename);

        if (!file_exists($filePath)) {
            return response()->json(['error' => 'File not found: ' . $filename], 404);
        }

        $results = [];
        $headers = [];
        $idColumnIndex = -1;
        // Potential original header names for the ID. Order matters for priority.
        $possibleIdKeys = ['item.caNoticeId', 'item.noticeId', 'id']; 

        try {
            $handle = fopen($filePath, 'r');
            if ($handle === false) {
                throw new \Exception("Could not open file: {$filename}");
            }

            // Read header row
            $headerLine = fgetcsv($handle);
            if ($headerLine === false) {
                throw new \Exception("Could not read header from file: {$filename}");
            }
            
            $originalHeaders = $headerLine;
            $translatedHeaders = $this->translateHeaders($originalHeaders);
            $headers = $translatedHeaders; // Store translated headers for results

            // Find the index of the ID column
            $foundIdKey = null;
            foreach ($possibleIdKeys as $key) {
                $idColumnIndexOriginal = array_search($key, $originalHeaders);
                if ($idColumnIndexOriginal !== false) {
                    $idColumnIndex = $idColumnIndexOriginal;
                    $foundIdKey = $key;
                    break;
                }
            }

            if ($idColumnIndex === -1) {
                 // Try translated headers if original keys not found
                 $translatedIdKey = $this->translateHeaders(['item.caNoticeId'])[0]; // 'ID Notificare AC'
                 $idColumnIndex = array_search($translatedIdKey, $translatedHeaders);
                 if ($idColumnIndex === false) {
                     throw new \Exception("ID column (tried: " . implode(', ', $possibleIdKeys) . ") not found in headers.");
                 }
            }

            // Read data rows line by line
            while (($row = fgetcsv($handle)) !== false) {
                if (isset($row[$idColumnIndex]) && trim($row[$idColumnIndex]) === trim($searchId)) {
                    // Found a match
                    if (count($row) === count($headers)) {
                         $record = [];
                         foreach ($headers as $index => $header) {
                             $record[$header] = $row[$index] ?? '';
                         }
                         $results[] = $record;
                    } else {
                         Log::warning("Row column count mismatch for ID {$searchId} in {$filename}. Expected: " . count($headers) . ", Got: " . count($row));
                    }
                    // break; // Uncomment if only one result is expected
                }
            }

            fclose($handle);

            return response()->json([
                'headers' => $headers,
                'rows' => $results,
                'searchId' => $searchId,
                'foundCount' => count($results)
            ]);

        } catch (\Exception $e) {
            Log::error("Error searching file {$filename} for ID {$searchId}: " . $e->getMessage());
            if (isset($handle) && is_resource($handle)) {
                fclose($handle);
            }
            return response()->json(['error' => 'Error searching file: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get aggregated contract values by city for a specific CSV file.
     * Currently optimized for 'achizitii_directe.csv'.
     *
     * @param string $filename
     * @return \Illuminate\Http\JsonResponse
     */
    public function getAggregatedDataByCity(string $filename)
    {
        if ($filename !== 'achizitii_directe.csv') {
            return response()->json(['error' => 'Aggregation not supported for this file type.'], 400);
        }

        try {
            $filePath = public_path('storage/' . $filename);
            if (!file_exists($filePath)) {
                return response()->json(['error' => 'File not found: ' . $filename], 404);
            }

            $handle = fopen($filePath, 'r');
            if ($handle === false) {
                throw new \Exception("Could not open file: {$filename}");
            }

            // --- Read Header and Find Columns ---
            $headerLine = fgetcsv($handle);
            if ($headerLine === false) {
                fclose($handle);
                throw new \Exception("Could not read header from file: {$filename}");
            }
            $originalHeaders = $headerLine;
            $translatedHeaders = $this->translateHeaders($originalHeaders);

            // Find indices using translated headers (adjust keys based on previous findings)
            $cityHeaderKey = 'Oraș Furnizor'; 
            $valueHeaderKey = 'Valoare Închidere'; // Use 'Valoare Închidere' or 'Valoare Contract' based on what works

            $cityColumnIndex = array_search($cityHeaderKey, $translatedHeaders);
            $valueColumnIndex = array_search($valueHeaderKey, $translatedHeaders);

            // Fallback: try original headers if translated not found
            if ($cityColumnIndex === false) {
                 $originalCityKey = array_search($cityHeaderKey, $this->translateHeaders([])); // Find original key
                 if ($originalCityKey) $cityColumnIndex = array_search($originalCityKey, $originalHeaders);
            }
             if ($valueColumnIndex === false) {
                 $originalValueKey = array_search($valueHeaderKey, $this->translateHeaders([])); // Find original key
                 if ($originalValueKey) $valueColumnIndex = array_search($originalValueKey, $originalHeaders);
            }


            if ($cityColumnIndex === false || $valueColumnIndex === false) {
                fclose($handle);
                Log::error("Required columns for aggregation not found in {$filename}. Needed: '{$cityHeaderKey}', '{$valueHeaderKey}'. Found Headers: " . implode(', ', $translatedHeaders));
                return response()->json([
                    'error' => "Required columns ('{$cityHeaderKey}', '{$valueHeaderKey}') not found in headers.",
                    'available_headers' => $translatedHeaders
                ], 500);
            }
            // --- End Header Reading ---


            $aggregation = [];
            // --- Process All Rows ---
            while (($row = fgetcsv($handle)) !== false) {
                // Ensure row has enough columns
                 if (count($row) <= max($cityColumnIndex, $valueColumnIndex)) {
                     Log::warning("Skipping row due to insufficient columns in {$filename}. Row data: " . implode(',', $row));
                     continue; // Skip malformed rows
                 }

                $city = trim($row[$cityColumnIndex]) ?: 'Necunoscut';
                $rawValue = $row[$valueColumnIndex] ?? '0';

                // Clean and parse value (handle Romanian format)
                $cleanedValue = str_replace('.', '', $rawValue); // Remove thousand separators
                $cleanedValue = str_replace(',', '.', $cleanedValue); // Replace decimal comma
                $value = floatval($cleanedValue);

                if (!isset($aggregation[$city])) {
                    $aggregation[$city] = 0;
                }
                $aggregation[$city] += $value;
            }
            fclose($handle);
            // --- End Row Processing ---

            // Prepare data for Chart.js
            $labels = array_keys($aggregation);
            $data = array_values($aggregation);

            return response()->json([
                'labels' => $labels,
                'data' => $data
            ]);

        } catch (\Exception $e) {
            Log::error("Error aggregating data for {$filename}: " . $e->getMessage() . "\n" . $e->getTraceAsString());
             if (isset($handle) && is_resource($handle)) {
                 fclose($handle);
             }
            return response()->json(['error' => 'Error processing file for aggregation: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Translate CSV headers from English to Romanian
     * 
     * @param array $headers Original headers
     * @return array Translated headers
     */
    private function translateHeaders(array $headers)
    {
        $translations = [
            // Achizitii directe
            'contractingAuthorityID' => 'ID Autoritate Contractantă',
            'contractingAuthorityName' => 'Denumire Autoritate Contractantă',
            'supplier' => 'Furnizor',
            'supplierID' => 'ID Furnizor',
            'directAcquisitionID' => 'ID Achiziție Directă',
            'publicationDate' => 'Data Publicării',
            'description' => 'Descriere',
            'cpvCode' => 'Cod CPV',
            'cpvDescription' => 'Descriere CPV',
            'contractValue' => 'Valoare Contract',
            'contractCurrency' => 'Monedă Contract',
            'uniqueIdentificationCode' => 'Cod Unic de Identificare',
            
            // Campuri specifice pentru achizitii - format nou
            'item.directAcquisitionId' => 'ID Achiziție Directă',
            'item.uniqueIdentificationCode' => 'Cod Unic de Identificare',
            'item.publicationDate' => 'Data Publicării',
            'item.closingValue' => 'Valoare Închidere',
            'item.cpvCode' => 'Cod CPV',
            'item.sysDirectAcquisitionState.text' => 'Stare Achiziție',
            'publicDirectAcquisition.sysAcquisitionContractType.text' => 'Tip Contract Achiziție',
            'item.directAcquisitionName' => 'Denumire Achiziție Directă',
            'supplier.entityId' => 'ID Furnizor',
            'supplier.entityName' => 'Denumire Furnizor',
            'supplier.fiscalNumber' => 'CUI Furnizor',
            'supplier.city' => 'Oraș Furnizor',
            'supplier.county' => 'Județ Furnizor',
            'authority.entityId' => 'ID Autoritate',
            'authority.entityName' => 'Denumire Autoritate',
            'authority.fiscalNumber' => 'CUI Autoritate',
            'authority.city' => 'Oraș Autoritate',
            'authority.county' => 'Județ Autoritate',
            
            // Achizitii offline - noi câmpuri specificate
            'item.daAwardNoticeId' => 'ID Notificare Atribuire',
            'item.noticeNo' => 'Număr Notificare',
            'Data Publicării' => 'Data Publicării',
            'details.finalizationDate' => 'Data Finalizării',
            'details.sysNoticeState.text' => 'Stare Notificare',
            'details.sysAcquisitionContractType.text' => 'Tip Contract Achiziție',
            'details.sysEuropeanFund.text' => 'Fond European',
            'item.awardedValue' => 'Valoare Atribuită',
            'item.contractObject' => 'Obiectul Contractului',
            
            // Achiziții offline existente
            'siirapAcqId' => 'ID Achiziție SIIRAP',
            'awardNoticeNumber' => 'Număr Notificare Atribuire', 
            'noticePublicationDate' => 'Data Publicării Notificării',
            'awardNoticeDate' => 'Data Notificării Atribuirii',
            'contractAssignationType' => 'Tip Atribuire Contract',
            'closingValue' => 'Valoare Închidere',
            'currency' => 'Monedă',
            'contractTitle' => 'Titlu Contract',
            'procedureType' => 'Tip Procedură',
            'caName' => 'Denumire CA',
            'caFiscalNumber' => 'CUI Autoritate',
            'supplierName' => 'Denumire Furnizor',
            'supplierFiscalNumber' => 'CUI Furnizor',
            
            // Licitatii publice - noi câmpuri specificate
            'item.caNoticeId' => 'ID Notificare AC',
            'item.noticeId' => 'ID Notificare',
            'item.procedureId' => 'ID Procedură',
            'item.noticeStateDate' => 'Data Stare Notificare',
            'item.ronContractValue' => 'Valoare Contract RON',
            'item.hasSubsequentContracts' => 'Are Contracte Subsecvente',
            'item.sysNoticeState.text' => 'Stare Notificare',
            'item.sysProcedureState.text' => 'Stare Procedură',
            'item.sysAcquisitionContractType.text' => 'Tip Contract Achiziție',
            'item.sysProcedureType.text' => 'Tip Procedură',
            'item.sysContractAssigmentType.text' => 'Tip Atribuire Contract',
            'item.currencyCode' => 'Cod Monedă',
            'item.contractTitle' => 'Titlu Contract',
            'item.nationalId' => 'ID Național',
            'item.contractingAuthorityNameAndFN' => 'Denumire și CUI Autoritate',
            'item.cpvCodeAndName' => 'Cod și Denumire CPV',
            'publicNotice.caNoticeEdit_New.section1_New.section1_1.caAddress.city' => 'Oraș Autoritate',
            'publicNotice.caNoticeEdit_New_U.section1_New_U.section1_1.caAddress.city' => 'Oraș Autoritate',
            'publicNotice.caNoticeEdit_New_U.section1_New_U.section1_1.caAddress.county.text' => 'Județ Autoritate',
            'publicNotice.caNoticeEdit_New_U.section1_New_U.section1_1.caAddress.nutsCodeItem.text' => 'Cod NUTS Autoritate',
            'publicNotice.caNoticeEdit_New_U.section1_New_U.section1_2_U.otherCANoticeAdresses.nutsCodeItem.text' => 'Cod NUTS Adrese Suplimentare',
            'publicNotice.caNoticeEdit_New_U.section2_New_U.section2_2_New_U.descriptionList.nutsCode.text' => 'Cod NUTS Descriere',
            'publicNotice.caNoticeEdit_New.section1_New.section1_1.caAddress.nutsCodeItem.text' => 'Cod NUTS Autoritate',
            'noticeContracts.items.winner.name' => 'Nume Câștigător',
            'noticeContracts.items.winners.name' => 'Nume Câștigători',
            'noticeContracts.items.winner.fiscalNumber' => 'CUI Câștigător',
            'noticeContracts.items.winners.fiscalNumber' => 'CUI Câștigători',
            'noticeContracts.items.winner.address.city' => 'Oraș Câștigător',
            'noticeContracts.items.winners.address.city' => 'Oraș Câștigători',
            'noticeContracts.items.winner.address.county.text' => 'Județ Câștigător',
            'noticeContracts.items.winners.address.county.text' => 'Județ Câștigători',
            
            // Licitatii publice existente
            'id' => 'ID',
            'caName' => 'Denumire Autoritate Contractantă',
            'caFiscalNumber' => 'CUI Autoritate',
            'noticeNo' => 'Număr Notificare',
            'procedureType' => 'Tip Procedură',
            'contractTitle' => 'Titlu Contract',
            'contractType' => 'Tip Contract',
            'cpvCodeAndName' => 'Cod CPV și Denumire',
            'consignmentValue' => 'Valoare Consemnare',
            'currency' => 'Monedă',
            'supplierName' => 'Denumire Furnizor',
            'supplierFiscalNumber' => 'CUI Furnizor',
            'isSmallOrMediumCompany' => 'Este IMM',
            'subcontracting' => 'Subcontractare',
            'subcontractingPct' => 'Procent Subcontractare',
            'subcontractingValue' => 'Valoare Subcontractare',
            'procedureApplicationAddress' => 'Adresă Aplicare Procedură',
            'decisionDate' => 'Data Deciziei',
            'assignDate' => 'Data Atribuirii',
            'city' => 'Oraș',
            'county' => 'Județ',
            'contractClosingDate' => 'Data Închidere Contract',
            'completionDate' => 'Data Finalizării',
            'finalizationDate' => 'Data Finalizării',
            'locale' => 'Locație',
            
            // Generic fields
            'name' => 'Nume',
            'date' => 'Dată',
            'value' => 'Valoare',
            'code' => 'Cod',
            'type' => 'Tip',
            'status' => 'Status',
            'address' => 'Adresă',
            'country' => 'Țară',
            'email' => 'Email',
            'phone' => 'Telefon',
            'website' => 'Website',
            'notes' => 'Note',
            'age' => 'Vârstă',
            'price' => 'Preț',
            'quantity' => 'Cantitate',
            'total' => 'Total'
        ];
        
        // Apply translations
        return array_map(function($header) use ($translations) {
            return $translations[$header] ?? $header; // Use original if no translation exists
        }, $headers);
    }
    
    /**
     * Provide a very simple CSV file access
     */
    public function getSimpleCsv(Request $request)
    {
        try {
            $filename = $request->query('file', 'test.csv');
            $file = public_path('storage/' . $filename);
            
            if (!file_exists($file)) {
                return response()->json([
                    'error' => 'File not found: ' . $filename
                ], 404);
            }
            
            $content = file_get_contents($file);
            if ($content === false) {
                return response()->json([
                    'error' => 'Could not read file: ' . $filename
                ], 500);
            }
            
            $lines = explode("\n", str_replace("\r\n", "\n", $content));
            $lines = array_filter($lines);
            
            if (count($lines) < 1) {
                return response()->json([
                    'error' => 'File is empty'
                ], 500);
            }
            
            $originalHeaders = str_getcsv($lines[0]);
            $headers = $this->translateHeaders($originalHeaders);
            
            $records = [];
            
            // Process only first 20 rows for testing
            $rowLimit = min(20, count($lines) - 1);
            for ($i = 1; $i <= $rowLimit; $i++) {
                if (isset($lines[$i]) && !empty(trim($lines[$i]))) {
                    $row = str_getcsv($lines[$i]);
                    if (count($row) === count($headers)) {
                        $records[] = array_combine($headers, $row);
                    }
                }
            }
            
            return response()->json([
                'file' => $filename,
                'headers' => $headers,
                'rows' => $records,
                'row_count' => count($records),
                'total_rows' => count($lines) - 1
            ]);
            
        } catch (\Exception $e) {
            Log::error("Error in getSimpleCsv: " . $e->getMessage());
            return response()->json([
                'error' => 'Error: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function debugStorage()
    {
        $storageLink = public_path('storage');
        $realPath = is_link($storageLink) ? readlink($storageLink) : 'Not a symlink';
        $appStorage = storage_path('app/public');
        $altPath = dirname(base_path()) . '/public/storage';
        
        // Fix path separators for consistency
        $appStorage = str_replace('\\', '/', $appStorage);
        $storageLink = str_replace('\\', '/', $storageLink);
        $altPath = str_replace('\\', '/', $altPath);
        
        $debugInfo = [
            'public_storage_exists' => is_dir($storageLink),
            'public_storage_path' => $storageLink,
            'alt_storage_exists' => is_dir($altPath),
            'alt_storage_path' => $altPath,
            'storage_symlink_target' => $realPath,
            'app_storage_exists' => is_dir($appStorage),
            'app_storage_path' => $appStorage,
            'test_csv_exists' => file_exists($appStorage . '/test.csv'),
            'test_csv_readable' => is_readable($appStorage . '/test.csv'),
            'php_memory_limit' => ini_get('memory_limit'),
            'csv_files_in_public_storage' => [],
            'csv_files_in_app_storage' => [],
            'php_version' => PHP_VERSION,
            'server_info' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown'
        ];
        
        // Check for CSV files
        if (is_dir($storageLink)) {
            $debugInfo['csv_files_in_public_storage'] = array_map('basename', glob($storageLink . '/*.csv'));
        }
        
        if (is_dir($appStorage)) {
            $debugInfo['csv_files_in_app_storage'] = array_map('basename', glob($appStorage . '/*.csv'));
        }
        
        if (is_dir($altPath)) {
            $debugInfo['csv_files_in_alt_storage'] = array_map('basename', glob($altPath . '/*.csv'));
        }
        
        // Try to create storage directories
        $this->ensureStorageDirectories();
        
        return response()->json($debugInfo);
    }
    
    /**
     * Ensure storage directories exist and create them if they don't
     */
    private function ensureStorageDirectories()
    {
        $publicStorage = public_path('storage');
        $appStorage = storage_path('app/public');
        
        // Create app/public directory if it doesn't exist
        if (!is_dir($appStorage)) {
            File::makeDirectory($appStorage, 0755, true);
        }
        
        // Create public/storage symlink if it doesn't exist
        if (!is_dir($publicStorage)) {
            try {
                // For Windows compatibility, first check if it's a broken symlink
                if (is_link($publicStorage)) {
                    unlink($publicStorage);
                }
                
                // Create the symlink
                if (PHP_OS_FAMILY === 'Windows') {
                    exec('mklink /D "' . $publicStorage . '" "' . $appStorage . '"');
                } else {
                    symlink($appStorage, $publicStorage);
                }
            } catch (\Exception $e) {
                Log::error("Failed to create storage symlink: " . $e->getMessage());
            }
        }
    }
}
