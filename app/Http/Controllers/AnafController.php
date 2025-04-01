<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Itrack\Anaf\Client;
use GuzzleHttp\Client as GuzzleClient;

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
            $date = date('Y-m-d');

            // Configurați clientul HTTP
            $client = new GuzzleClient();
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
                'verify' => false, // Dezactivează verificarea SSL
            ]);

            // Decodificați răspunsul
            $data = json_decode($response->getBody(), true);

            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}