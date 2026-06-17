import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { IDENTITY_ERROR_CODES } from './constants/identity-error-codes.constants';
import { IdentityCacheService } from './identity-cache.service';
import { IdentityService } from './identity.service';
import { ApisPeruIdentityProvider } from './providers/apisperu-identity.provider';

describe('IdentityService', () => {
  let service: IdentityService;
  let provider: ApisPeruIdentityProvider;
  let cache: IdentityCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdentityService,
        ApisPeruIdentityProvider,
        IdentityCacheService,
        {
          provide: HttpService,
          useValue: { get: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const values: Record<string, string> = {
                IDENTITY_API_TOKEN: 'test-token',
                IDENTITY_API_BASE_URL: 'https://dniruc.apisperu.com/api/v1',
                IDENTITY_API_TIMEOUT_MS: '8000',
                IDENTITY_CACHE_TTL_SECONDS: '86400',
              };
              return values[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get(IdentityService);
    provider = module.get(ApisPeruIdentityProvider);
    cache = module.get(IdentityCacheService);
  });

  it('rechaza DNI con formato inválido', async () => {
    await expect(service.lookupDni('123')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rechaza RUC con formato inválido', async () => {
    await expect(service.lookupRuc('123')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('devuelve DNI desde cache en segunda consulta', async () => {
    const providerResult = {
      doc_type: 'DNI' as const,
      doc_number: '12345678',
      nombres: 'JUAN',
      apellido_paterno: 'PEREZ',
      apellido_materno: 'QUISPE',
      nombre_completo: 'JUAN PEREZ QUISPE',
      validated_at: '2026-06-16T12:00:00.000Z',
      provider: 'apisperu' as const,
    };

    jest.spyOn(provider, 'lookupDni').mockResolvedValue(providerResult);

    const first = await service.lookupDni('12345678');
    const second = await service.lookupDni('12345678');

    expect(first).toEqual(providerResult);
    expect(second).toEqual(providerResult);
    expect(provider.lookupDni).toHaveBeenCalledTimes(1);
  });

  it('propaga errores del proveedor', async () => {
    jest.spyOn(provider, 'lookupRuc').mockRejectedValue(
      new HttpException(
        {
          code: IDENTITY_ERROR_CODES.SERVICE_UNAVAILABLE,
          message: 'No se pudo validar el documento en este momento. Intenta nuevamente.',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      ),
    );

    await expect(service.lookupRuc('20131312955')).rejects.toMatchObject({
      status: HttpStatus.SERVICE_UNAVAILABLE,
    });
  });

  afterEach(() => {
    cache.clear();
  });
});

describe('ApisPeruIdentityProvider', () => {
  let provider: ApisPeruIdentityProvider;
  let httpService: { get: jest.Mock };

  beforeEach(async () => {
    httpService = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApisPeruIdentityProvider,
        {
          provide: HttpService,
          useValue: httpService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const values: Record<string, string> = {
                IDENTITY_API_TOKEN: 'test-token',
                IDENTITY_API_BASE_URL: 'https://dniruc.apisperu.com/api/v1',
                IDENTITY_API_TIMEOUT_MS: '8000',
              };
              return values[key];
            }),
          },
        },
      ],
    }).compile();

    provider = module.get(ApisPeruIdentityProvider);
  });

  it('mapea respuesta DNI de ApisPeru', async () => {
    httpService.get.mockReturnValue(
      of({
        status: 200,
        data: {
          dni: '12345678',
          nombres: 'JUAN',
          apellidoPaterno: 'PEREZ',
          apellidoMaterno: 'QUISPE',
        },
      }),
    );

    const result = await provider.lookupDni('12345678');

    expect(result.doc_number).toBe('12345678');
    expect(result.nombre_completo).toBe('JUAN PEREZ QUISPE');
    expect(httpService.get).toHaveBeenCalledWith(
      'https://dniruc.apisperu.com/api/v1/dni/12345678',
      expect.objectContaining({
        params: { token: 'test-token' },
      }),
    );
  });

  it('mapea respuesta RUC activo y habido', async () => {
    httpService.get.mockReturnValue(
      of({
        status: 200,
        data: {
          ruc: '20131312955',
          razonSocial: 'EMPRESA DEMO SAC',
          direccion: 'AV. PRINCIPAL 123',
          departamento: 'LIMA',
          provincia: 'LIMA',
          distrito: 'LIMA',
          estado: 'ACTIVO',
          condicion: 'HABIDO',
        },
      }),
    );

    const result = await provider.lookupRuc('20131312955');

    expect(result.razon_social).toBe('EMPRESA DEMO SAC');
    expect(result.estado).toBe('ACTIVO');
    expect(result.condicion).toBe('HABIDO');
  });

  it('rechaza RUC no habido', async () => {
    httpService.get.mockReturnValue(
      of({
        status: 200,
        data: {
          ruc: '20131312955',
          razonSocial: 'EMPRESA DEMO SAC',
          estado: 'ACTIVO',
          condicion: 'NO HABIDO',
        },
      }),
    );

    await expect(provider.lookupRuc('20131312955')).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
    });
  });

  it('responde servicio no disponible ante error de red', async () => {
    httpService.get.mockReturnValue(
      throwError(() => new Error('Network error')),
    );

    await expect(provider.lookupDni('12345678')).rejects.toMatchObject({
      status: HttpStatus.SERVICE_UNAVAILABLE,
    });
  });

  it('responde no configurado si falta token', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApisPeruIdentityProvider,
        {
          provide: HttpService,
          useValue: httpService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => undefined),
          },
        },
      ],
    }).compile();

    const unconfiguredProvider = module.get(ApisPeruIdentityProvider);

    await expect(unconfiguredProvider.lookupDni('12345678')).rejects.toMatchObject(
      {
        status: HttpStatus.SERVICE_UNAVAILABLE,
      },
    );
  });
});
