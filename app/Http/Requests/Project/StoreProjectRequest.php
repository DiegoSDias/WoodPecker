<?php

namespace App\Http\Requests\Project;

use App\Enums\Operator;
use App\Enums\OptimizationType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProjectRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => [
                'required',
                'string',
                'max:255'
            ],
            'description' => [
                'nullable',
                'string'
            ],
            'num_variables' => [
                'required',
                'integer',
                'min:1'
            ],
            'num_constraints' => [
                'required',
                'integer',
                'min:1'
            ],
            'optimization_type' => [
                'required',
                Rule::enum(OptimizationType::class)
            ],
            'objective_function' => [
                'required',
                'array'
            ],
            'objective_function.coefficients' => [
                'required',
                'array',
                'size:' . $this->input('num_variables')
            ],
            'objective_function.coefficients.*' => [
                'required',
                'numeric'
            ],
            'constraints' => [
                'required',
                'array',
                'size:' . $this->input('num_constraints')
            ],
            'constraints.*.coefficients' => [
                'required',
                'array',
                'size:' . $this->input('num_variables')
            ],
            'constraints.coefficients.*' => [
                'required',
                'numeric'
            ],
            'constraints.*.operator' => [
                'required',
                Rule::enum(Operator::class)
            ],
            'constraints.*.rhs_value' => [
                'required',
                'numeric'
            ]
        ];
    }

    public function messages(): array
    {
        return [
            'objective_function.coefficients.size' => 'A função objetivo deve ter exatamente o mesmo número de coeficientes que o número de variáveis.',
            'constraints.*.coefficients.size' => 'Cada restrição deve ter um coeficiente para cada variável.',
            'constraints.size' => 'O número de restrições enviadas não bate com a configuração inicial.'
        ];
    }
}
