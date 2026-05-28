<?php

namespace App\Enums;

enum Operator: string
{
    case LESS_THAN_OR_EQUAL = '<=';
    case GREATER_THAN_OR_EQUAL = '>=';
    case EQUAL = '=';
}
