<?php

namespace App\Http\Controllers\Project;

use App\Http\Controllers\Controller;
use App\Http\Requests\Project\StoreProjectRequest;
use App\Models\Project;
use App\Services\Project\ProjectService;
use Illuminate\Http\Request;

use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class MyProjects extends Controller
{

    public function __construct(
        protected ProjectService $projectService,
    ) {
    }
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $projects = Project::query()
            ->where('user_id', Auth::id())
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
    }

    /**
     * Display the specified resource.
     */
    public function show(Project $project)
    {
        try {
            $projectId = $project->id;          
            return Inertia::render('MathematicalModeling', compact('projectId'));

        } catch (\Throwable $th) {
            return $this->sendError(
                ['detalhe' => $th->getMessage()],
                'Erro ao carregar projeto',
                Response::HTTP_NOT_FOUND
            );
        }
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Project $project)
    {
        return Inertia::render('MathematicalModeling', compact('project'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(StoreProjectRequest $request, Project $project)
    {
        try {
            $data = $request->validated();
            $project = $this->projectService->update($project, $data);

            return $this->sendResponse(
                ['project' => $project],
                'Projeto atualizado com sucesso!',
                Response::HTTP_OK
            );
            
        } catch (\Throwable $th) {
            return $this->sendError(
                ['detalhe' => $th->getMessage()],
                'Erro ao atualizar projeto',
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Project $project)
    {
        try {
            $project->delete();

            return $this->sendResponse(
                ['project' => $project],
                'Projeto escluido com sucesso!',
                Response::HTTP_OK
            );
            
        } catch (\Throwable $th) {
            return $this->sendError(
                ['detalhe' => $th->getMessage()],
                'Erro ao atualizar projeto',
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }
    }
}
