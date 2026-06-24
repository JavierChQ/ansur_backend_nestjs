import { ConfigService } from '@nestjs/config';
import { CompanyConfigService } from './company-config.service';

describe('CompanyConfigService', () => {
  const configService = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        COMPANY_NAME: 'Ansur',
        COMPANY_LEGAL_NAME: 'Ansur Perú S.A.C.',
        COMPANY_RUT: '20600674651',
        COMPANY_ADDRESS: 'Cal. Garci Carbajal nro 101, int. a-12',
        COMPANY_WEBSITE: 'https://www.ansur.com.pe',
        COMPANY_WHATSAPP: '51947346467',
        COMPANY_FACEBOOK_URL:
          'https://www.facebook.com/p/Ansel-peru-100063315543096/',
        COMPANY_TIKTOK_URL: 'https://www.tiktok.com/@anselperu',
      };
      return values[key];
    }),
  } as unknown as ConfigService;

  const service = new CompanyConfigService(configService);

  it('expone la configuración de empresa para recibos', () => {
    expect(service.getCompany()).toEqual({
      name: 'Ansur',
      legalName: 'Ansur Perú S.A.C.',
      ruc: '20600674651',
      address: 'Cal. Garci Carbajal nro 101, int. a-12',
      website: 'https://www.ansur.com.pe',
      whatsapp: '51947346467',
      whatsappDisplay: '947 346 467',
    });
  });

  it('expone la configuración pública de contacto', () => {
    expect(service.getContactConfig()).toEqual({
      whatsapp: '51947346467',
      whatsappDisplay: '947 346 467',
      whatsappUrl: 'https://wa.me/51947346467',
      address: 'Cal. Garci Carbajal nro 101, int. a-12',
      website: 'https://www.ansur.com.pe',
      facebookUrl: 'https://www.facebook.com/p/Ansel-peru-100063315543096/',
      tiktokUrl: 'https://www.tiktok.com/@anselperu',
    });
  });

  it('devuelve null para redes sociales no configuradas', () => {
    const emptyConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'COMPANY_WHATSAPP') {
          return '51947346467';
        }
        return undefined;
      }),
    } as unknown as ConfigService;

    const emptyService = new CompanyConfigService(emptyConfigService);

    expect(emptyService.getContactConfig().facebookUrl).toBeNull();
    expect(emptyService.getContactConfig().tiktokUrl).toBeNull();
  });
});
