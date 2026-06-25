<?php

use App\Http\Controllers\Project\ProjectController;
use Illuminate\Support\Facades\Route;

Route::post('/', [ProjectController::class, 'store']);
Route::get('/{project}', [ProjectController::class, 'show']);
Route::post('/{project}/solve/simplex', [ProjectController::class, 'solveSimplex']);
Route::post('/{project}/solve/graphical', [ProjectController::class, 'solveGraphical']);
Route::post('/{project}/solve/integer', [ProjectController::class, 'solveInteger']);
Route::post('/{project}/solve/dual', [ProjectController::class, 'solveDual']);
Route::post('/{project}/solve/sensitivity', [ProjectController::class, 'solveSensitivity']);
Route::get('/{project}/solutions', [ProjectController::class, 'solutions']);
