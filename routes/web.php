<?php

use App\Http\Controllers\Project\LinearSystemController;
use App\Models\Project;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Dashboard');
})->name('dashboard');

Route::get('/linear-systems', function () {
    return Inertia::render('LinearSystems');
})->name('linear-systems');

Route::post('/linear-systems/solve', [LinearSystemController::class, 'solve'])
    ->name('linear-systems.solve');

Route::get('/mathematical-modeling', function () {
    return Inertia::render('MathematicalModeling');
})->name('mathematical-modeling');

Route::get('/project-results/{project}', function ($project) {
    return Inertia::render('ProjectResults', [
        'projectId' => (int) $project,
    ]);
})->name('project-results.show');

Route::middleware('auth')->group(function () {
    Route::get('/my-projects', function () {
        $projects = Project::query()
            ->where('user_id', auth()->id())
            ->latest('updated_at')
            ->get([
                'id',
                'title',
                'description',
                'created_at',
                'updated_at',
            ]);

        return Inertia::render('MyProjects', [
            'projects' => $projects,
        ]);
    })->name('my-projects');

    require __DIR__ . '/user.php';
});

Route::prefix('projects')->group(function () {
    require __DIR__ . '/project.php';
});

require __DIR__ . '/auth.php';