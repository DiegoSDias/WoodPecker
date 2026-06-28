<?php

use App\Http\Controllers\Project\MyProjects;
use App\Http\Controllers\Project\ProjectController;
use Illuminate\Support\Facades\Route;

Route::prefix('me')
    ->name('projects.me.')
    ->middleware('auth')
    ->group(function () {
        Route::get('/', [MyProjects::class, 'index'])->name('index');
        Route::get('/{project}', [MyProjects::class, 'show'])->name('show');
        Route::get('/{project}', [MyProjects::class, 'edit'])->name('edit');
        Route::put('/{project}', [MyProjects::class, 'update'])->name('update');
        Route::delete('/{project}', [MyProjects::class, 'destroy'])->name('destroy');
    });

Route::post('/', [ProjectController::class, 'store']);
Route::post('/{project}/solve/simplex', [ProjectController::class, 'solveSimplex']);
Route::post('/{project}/solve/graphical', [ProjectController::class, 'solveGraphical']);
Route::post('/{project}/solve/integer', [ProjectController::class, 'solveInteger']);
Route::post('/{project}/solve/dual', [ProjectController::class, 'solveDual']);
Route::post('/{project}/solve/sensitivity', [ProjectController::class, 'solveSensitivity']);
Route::get('/{project}/solutions', [ProjectController::class, 'solutions']);