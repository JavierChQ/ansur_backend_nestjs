import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { DniIdentityResponseDto } from './dto/dni-identity-response.dto';
import { RucIdentityResponseDto } from './dto/ruc-identity-response.dto';
import { IdentityService } from './identity.service';

@ApiTags('identity')
@Controller('identity')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Get('dni/:docNumber')
  @UseGuards(ThrottlerGuard)
  @Throttle({ 'identity-lookup': {} })
  @ApiOperation({
    summary: 'Consultar DNI en RENIEC vía ApisPeru',
    description:
      'Valida formato, consulta el proveedor ApisPeru y devuelve nombres oficiales. ' +
      'Si el servicio externo no responde, bloquea el flujo de checkout.',
  })
  @ApiParam({ name: 'docNumber', example: '12345678' })
  @ApiBadRequestResponse({ description: 'Formato de DNI inválido' })
  @ApiNotFoundResponse({ description: 'DNI no encontrado' })
  @ApiServiceUnavailableResponse({
    description: 'Servicio de consulta no disponible',
  })
  @ApiTooManyRequestsResponse({ description: 'Demasiadas consultas' })
  lookupDni(@Param('docNumber') docNumber: string): Promise<DniIdentityResponseDto> {
    return this.identityService.lookupDni(docNumber);
  }

  @Get('ruc/:docNumber')
  @UseGuards(ThrottlerGuard)
  @Throttle({ 'identity-lookup': {} })
  @ApiOperation({
    summary: 'Consultar RUC en SUNAT vía ApisPeru',
    description:
      'Valida formato, consulta el proveedor ApisPeru y devuelve razón social y domicilio fiscal. ' +
      'Solo acepta RUC activo y habido.',
  })
  @ApiParam({ name: 'docNumber', example: '20131312955' })
  @ApiBadRequestResponse({
    description: 'Formato de RUC inválido o contribuyente no activo/habido',
  })
  @ApiNotFoundResponse({ description: 'RUC no encontrado' })
  @ApiServiceUnavailableResponse({
    description: 'Servicio de consulta no disponible',
  })
  @ApiTooManyRequestsResponse({ description: 'Demasiadas consultas' })
  lookupRuc(@Param('docNumber') docNumber: string): Promise<RucIdentityResponseDto> {
    return this.identityService.lookupRuc(docNumber);
  }
}
