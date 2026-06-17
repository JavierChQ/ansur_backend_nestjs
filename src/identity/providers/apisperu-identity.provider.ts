import { HttpService } from '@nestjs/axios';
import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { IDENTITY_ERROR_CODES } from '../constants/identity-error-codes.constants';
import {
  ApisPeruDniResponse,
  ApisPeruRucResponse,
} from '../interfaces/apisperu-response.interface';
import {
  DniIdentityResult,
  RucIdentityResult,
} from '../interfaces/identity-result.interface';

@Injectable()
export class ApisPeruIdentityProvider {
  private readonly logger = new Logger(ApisPeruIdentityProvider.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async lookupDni(docNumber: string): Promise<DniIdentityResult> {
    const data = await this.request<ApisPeruDniResponse>(
      `/dni/${docNumber}`,
      IDENTITY_ERROR_CODES.DNI_NOT_FOUND,
    );

    const nombres = data.nombres?.trim();
    const apellidoPaterno = data.apellidoPaterno?.trim() ?? '';
    const apellidoMaterno = data.apellidoMaterno?.trim() ?? '';

    if (!nombres) {
      throw this.buildHttpException(
        HttpStatus.NOT_FOUND,
        IDENTITY_ERROR_CODES.DNI_NOT_FOUND,
        'No se encontró información para el DNI ingresado.',
      );
    }

    const nombreCompleto = [nombres, apellidoPaterno, apellidoMaterno]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      doc_type: 'DNI',
      doc_number: data.dni ?? docNumber,
      nombres,
      apellido_paterno: apellidoPaterno,
      apellido_materno: apellidoMaterno,
      nombre_completo: nombreCompleto,
      validated_at: new Date().toISOString(),
      provider: 'apisperu',
    };
  }

  async lookupRuc(docNumber: string): Promise<RucIdentityResult> {
    const data = await this.request<ApisPeruRucResponse>(
      `/ruc/${docNumber}`,
      IDENTITY_ERROR_CODES.RUC_NOT_FOUND,
    );

    const razonSocial = data.razonSocial?.trim();
    const direccion = data.direccion?.trim();

    if (!razonSocial) {
      throw this.buildHttpException(
        HttpStatus.NOT_FOUND,
        IDENTITY_ERROR_CODES.RUC_NOT_FOUND,
        'No se encontró información para el RUC ingresado.',
      );
    }

    const estado = (data.estado ?? '').trim().toUpperCase();
    const condicion = (data.condicion ?? '').trim().toUpperCase();

    if (estado !== 'ACTIVO' || condicion !== 'HABIDO') {
      throw this.buildHttpException(
        HttpStatus.BAD_REQUEST,
        IDENTITY_ERROR_CODES.RUC_NOT_ACTIVE,
        'El RUC no se encuentra activo y habido.',
      );
    }

    return {
      doc_type: 'RUC',
      doc_number: data.ruc ?? docNumber,
      razon_social: razonSocial,
      direccion: direccion ?? '',
      departamento: data.departamento?.trim() ?? null,
      provincia: data.provincia?.trim() ?? null,
      distrito: data.distrito?.trim() ?? null,
      estado,
      condicion,
      validated_at: new Date().toISOString(),
      provider: 'apisperu',
    };
  }

  private async request<T>(
    path: string,
    notFoundCode: (typeof IDENTITY_ERROR_CODES)[keyof typeof IDENTITY_ERROR_CODES],
  ): Promise<T> {
    const token = this.configService.get<string>('IDENTITY_API_TOKEN')?.trim();
    if (!token) {
      this.logger.error('IDENTITY_API_TOKEN no configurado');
      throw this.buildHttpException(
        HttpStatus.SERVICE_UNAVAILABLE,
        IDENTITY_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
        'El servicio de validación de documentos no está disponible.',
      );
    }

    const baseUrl = (
      this.configService.get<string>('IDENTITY_API_BASE_URL') ??
      'https://dniruc.apisperu.com/api/v1'
    ).replace(/\/$/, '');
    const timeoutMs = Number(
      this.configService.get<string>('IDENTITY_API_TIMEOUT_MS') ?? 8000,
    );

    try {
      const response = await firstValueFrom(
        this.httpService.get<T>(`${baseUrl}${path}`, {
          params: { token },
          timeout: timeoutMs,
          headers: { Accept: 'application/json' },
          validateStatus: (status) => status >= 200 && status < 500,
        }),
      );

      if (response.status === 404) {
        throw this.buildHttpException(
          HttpStatus.NOT_FOUND,
          notFoundCode,
          notFoundCode === IDENTITY_ERROR_CODES.DNI_NOT_FOUND
            ? 'No se encontró información para el DNI ingresado.'
            : 'No se encontró información para el RUC ingresado.',
        );
      }

      if (response.status >= 400) {
        this.logger.warn(
          `ApisPeru respondió ${response.status} para ${path}: ${JSON.stringify(response.data)}`,
        );
        throw this.buildHttpException(
          HttpStatus.SERVICE_UNAVAILABLE,
          IDENTITY_ERROR_CODES.SERVICE_UNAVAILABLE,
          'No se pudo validar el documento en este momento. Intenta nuevamente.',
        );
      }

      const payload = response.data as T & { success?: boolean; message?: string };
      if (payload?.success === false) {
        throw this.buildHttpException(
          HttpStatus.NOT_FOUND,
          notFoundCode,
          payload.message ??
            (notFoundCode === IDENTITY_ERROR_CODES.DNI_NOT_FOUND
              ? 'No se encontró información para el DNI ingresado.'
              : 'No se encontró información para el RUC ingresado.'),
        );
      }

      return response.data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const axiosError = error as AxiosError;
      if (axiosError.code === 'ECONNABORTED') {
        this.logger.error(`Timeout consultando ApisPeru en ${path}`);
      } else {
        this.logger.error(
          `Error consultando ApisPeru en ${path}`,
          axiosError.stack ?? String(error),
        );
      }

      throw this.buildHttpException(
        HttpStatus.SERVICE_UNAVAILABLE,
        IDENTITY_ERROR_CODES.SERVICE_UNAVAILABLE,
        'No se pudo validar el documento en este momento. Intenta nuevamente.',
      );
    }
  }

  private buildHttpException(
    status: HttpStatus,
    code: (typeof IDENTITY_ERROR_CODES)[keyof typeof IDENTITY_ERROR_CODES],
    message: string,
  ): HttpException {
    return new HttpException({ code, message }, status);
  }
}
