<?php

use App\Http\Controllers\Project\LinearSystemController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;


Route::get('/', function () {
    return Inertia::render('Dashboard');
})->name('dashboard');

Route::middleware('auth')->group(function () {
    require __DIR__.'/user.php';

    
});
    
Route::prefix('projects')->group(function() {
    require __DIR__.'/project.php';
});

require __DIR__.'/auth.php';

Route::get('/linear-systems', function () {
    return Inertia::render('LinearSystems');
})->name('linear-systems');


Route::post('/linear-systems/solve', [LinearSystemController::class, 'solve']
);