<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use GuzzleHttp\Client;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Storage;

class AnafController extends Controller
{
    protected $anaf;

    public function __construct()
    {
        try {
            $this->anaf = new Client();
        } catch (\Exception $e) {
            dd([
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    public function getCompanyInfo(Request $request)
    {
        try {
            $cui = $request->input('cui');
            
            // Store the CUI in session history
            $history = Session::get('anaf_history', []);
            if (!in_array($cui, $history)) {
                $history[] = $cui;
                // Limit history to last 20 entries
                if (count($history) > 20) {
                    $history = array_slice($history, -20);
                }
                Session::put('anaf_history', $history);
            }
            
            $date = date('Y-m-d');

            $client = new Client();
            $response = $client->post('https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva', [
                'headers' => [
                    'Content-Type' => 'application/json',
                ],
                'json' => [
                    [
                        'cui' => $cui,
                        'data' => $date,
                    ]
                ],
                'verify' => false,
            ]);

            $data = json_decode($response->getBody(), true);

            if (!empty($data['found'])) {
                // Process the data to match the expected structure in the frontend
                $companyData = $this->processCompanyData($data['found'][0]);
                
                return response()->json([
                    'success' => true,
                    'data' => $companyData
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Nu s-au găsit date pentru acest CUI'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Process the ANAF API response to match the expected structure in the frontend
     * 
     * @param array $data Raw data from ANAF API
     * @return array Processed data structure
     */
    private function processCompanyData($data)
    {
        // Initialize the structure that matches what your React component expects
        $processedData = [
            'date_generale' => [],
            'inregistrare_scop_Tva' => [],
            'inregistrare_RTVAI' => [],
            'adresa_sediu_social' => [],
            'stare_inactiv' => [],
            'inregistrare_SplitTVA' => [],
            'adresa_domiciliu_fiscal' => [], // Add this field which is in the API response
        ];
    
        // Map general data
        if (isset($data['date_generale'])) {
            $processedData['date_generale'] = $data['date_generale']; // Use all fields as they are
        }
    
        // Map VAT registration data
        if (isset($data['inregistrare_scop_Tva'])) {
            // Handle both the direct fields and the nested perioade_TVA object
            $processedData['inregistrare_scop_Tva'] = [
                'scpTVA' => $data['inregistrare_scop_Tva']['scpTVA'] ?? null,
            ];
            
            // Handle the nested perioade_TVA object if it exists
            if (isset($data['inregistrare_scop_Tva']['perioade_TVA'])) {
                $processedData['inregistrare_scop_Tva'] = array_merge(
                    $processedData['inregistrare_scop_Tva'], 
                    $data['inregistrare_scop_Tva']['perioade_TVA']
                );
            }
        }
    
        // Map other sections directly
        $sections = ['inregistrare_RTVAI', 'adresa_sediu_social', 'stare_inactiv', 
                     'inregistrare_SplitTVA', 'adresa_domiciliu_fiscal'];
        
        foreach ($sections as $section) {
            if (isset($data[$section])) {
                $processedData[$section] = $data[$section];
            }
        }
    
        return $processedData;
    }
}