<?php

namespace App\Models;

use App\Enums\Operator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Constraint extends Model
{
    protected $fillable = [
        'project_id',
        'coefficients',
        'operator',
        'rhs_value',
    ];

    protected $casts = [
        'coefficients' => 'array',
        'rhs_value' => 'float',
        'operator' => Operator::class
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
