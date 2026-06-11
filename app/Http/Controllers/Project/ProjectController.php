<?php

namespace App\Http\Controllers\Project;

use App\Http\Controllers\Controller;
use App\Http\Requests\Project\SimplexRequest;
use App\Services\Project\SimplexService;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function __construct(protected SimplexService $simplexService)
    {
        
    }
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(SimplexRequest $request)
    {
        try {
            $data = $request->validated();
            $result = $this->simplexService->solve($data);
            return $this->sendResponse($result, 'Projeto criado com sucesso!');
        } catch (\Throwable $th) {
            return $this->sendError(['detalhe' => $th->getMessage()], 'Erro ao criar projeto');
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
