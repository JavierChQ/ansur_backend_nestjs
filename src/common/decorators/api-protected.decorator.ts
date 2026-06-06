import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export function ApiProtected() {
  return applyDecorators(
    ApiBearerAuth('JWT'),
    ApiUnauthorizedResponse({ description: 'Token JWT inválido o ausente' }),
    ApiForbiddenResponse({ description: 'Sin permisos para este recurso' }),
  );
}
