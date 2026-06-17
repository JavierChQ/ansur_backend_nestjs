import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { IDENTITY_ERROR_CODES } from './constants/identity-error-codes.constants';
import { IdentityCacheService } from './identity-cache.service';
import {
  DniIdentityResult,
  RucIdentityResult,
} from './interfaces/identity-result.interface';
import { ApisPeruIdentityProvider } from './providers/apisperu-identity.provider';
import {
  isValidDniFormat,
  isValidRucFormat,
  normalizeDocumentNumber,
} from './utils/document-number.util';

@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name);

  constructor(
    private readonly provider: ApisPeruIdentityProvider,
    private readonly cache: IdentityCacheService,
  ) {}

  async lookupDni(rawDocNumber: string): Promise<DniIdentityResult> {
    const docNumber = normalizeDocumentNumber(rawDocNumber);

    if (!isValidDniFormat(docNumber)) {
      throw new BadRequestException({
        code: IDENTITY_ERROR_CODES.INVALID_DNI_FORMAT,
        message: 'El DNI debe tener exactamente 8 dígitos numéricos.',
      });
    }

    const cached = this.cache.getDni(docNumber);
    if (cached) {
      return cached;
    }

    try {
      const result = await this.provider.lookupDni(docNumber);
      this.cache.setDni(docNumber, result);
      return result;
    } catch (error) {
      this.logProviderError('DNI', docNumber, error);
      throw error;
    }
  }

  async lookupRuc(rawDocNumber: string): Promise<RucIdentityResult> {
    const docNumber = normalizeDocumentNumber(rawDocNumber);

    if (!isValidRucFormat(docNumber)) {
      throw new BadRequestException({
        code: IDENTITY_ERROR_CODES.INVALID_RUC_FORMAT,
        message: 'El RUC debe tener exactamente 11 dígitos numéricos.',
      });
    }

    const cached = this.cache.getRuc(docNumber);
    if (cached) {
      return cached;
    }

    try {
      const result = await this.provider.lookupRuc(docNumber);
      this.cache.setRuc(docNumber, result);
      return result;
    } catch (error) {
      this.logProviderError('RUC', docNumber, error);
      throw error;
    }
  }

  private logProviderError(
    docType: 'DNI' | 'RUC',
    docNumber: string,
    error: unknown,
  ): void {
    if (error instanceof HttpException) {
      const status = error.getStatus();
      if (
        status === HttpStatus.NOT_FOUND ||
        status === HttpStatus.BAD_REQUEST
      ) {
        return;
      }
    }

    this.logger.error(
      `Fallo al consultar ${docType} ${docNumber}`,
      error instanceof Error ? error.stack : String(error),
    );
  }
}
