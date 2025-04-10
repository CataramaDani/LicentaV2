<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\AnafController;
use App\Http\Controllers\PnrrController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    try {
        return Inertia::render('Welcome', [
            'canLogin' => Route::has('login'),
            'canRegister' => Route::has('register'),
            'laravelVersion' => Application::VERSION,
            'phpVersion' => PHP_VERSION,
        ]);
    } catch (\Exception $e) {
        return response()->json(['error' => $e->getMessage()], 500);
    }
});

Route::get('/test', function () {
    return 'Laravel is working!';
})->name('test');

Route::middleware(['auth'])->group(function () {
    Route::get('/company-search', function () {
        return Inertia::render('Anaf/CompanySearch');
    })->name('company.search');
    
    Route::get('/pnrr', [PnrrController::class, 'index'])->name('pnrr');
    Route::get('/pnrr/data', [PnrrController::class, 'getCsvData'])->name('pnrr.data');
});

// Test routes for diagnosing issues
Route::get('/test-csv-files', function () {
    $path = public_path('storage');
    $exists = is_dir($path);
    $files = $exists ? glob($path . '/*.csv') : [];
    
    return response()->json([
        'storage_path_exists' => $exists,
        'path' => $path,
        'csv_files' => array_map('basename', $files),
        'all_files' => $exists ? array_map('basename', glob($path . '/*.*')) : []
    ]);
})->name('test.csv');

Route::get('/debug-storage', [PnrrController::class, 'debugStorage'])->name('debug.storage');

// Simple CSV access for specific file
Route::get('/simple-csv', [PnrrController::class, 'getSimpleCsv'])->name('simple.csv');

// Direct CSV test route
Route::get('/direct-csv', function() {
    // Look for CSV files in multiple locations
    $locations = [
        storage_path('app/public'),
        public_path('storage'),
        dirname(base_path()) . '/public/storage'
    ];
    
    foreach ($locations as $location) {
        if (is_dir($location)) {
            $files = glob($location . '/*.csv');
            if (!empty($files)) {
                $file = $files[0]; // Get the first CSV file
                $content = file_get_contents($file);
                return response($content, 200)
                        ->header('Content-Type', 'text/plain');
            }
        }
    }
    
    // If we got here, no CSV files were found
    return response()->json([
        'error' => 'No CSV files found',
        'locations_checked' => $locations
    ]);
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

Route::middleware(['auth'])->group(function () {
    Route::get('/anaf/company', [AnafController::class, 'getCompanyInfo'])->name('anaf.company');
});

// Add a route that can be accessed without authentication for testing
Route::get('/health-check', function () {
    return response()->json(['status' => 'ok']);
})->name('health.check');

require __DIR__.'/auth.php';

