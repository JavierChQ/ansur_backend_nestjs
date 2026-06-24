import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CompanyConfig, ContactConfig } from './company-config.types';

@Injectable()
export class CompanyConfigService {
  constructor(private readonly configService: ConfigService) {}

  getCompany(): CompanyConfig {
    const whatsapp = this.getWhatsappDigits();

    return {
      name: this.configService.get<string>('COMPANY_NAME') ?? 'Ansur',
      legalName:
        this.configService.get<string>('COMPANY_LEGAL_NAME') ?? 'Ansur Perú S.A.C.',
      ruc: this.configService.get<string>('COMPANY_RUT') ?? '20600674651',
      address:
        this.configService.get<string>('COMPANY_ADDRESS') ??
        'Cal. Garci Carbajal nro 101, int. a-12',
      website: this.configService.get<string>('COMPANY_WEBSITE') ?? 'https://ansur.com.pe',
      whatsapp,
      whatsappDisplay: this.formatWhatsappDisplay(whatsapp),
    };
  }

  getContactConfig(): ContactConfig {
    const company = this.getCompany();

    return {
      whatsapp: company.whatsapp,
      whatsappDisplay: company.whatsappDisplay,
      whatsappUrl: this.buildWhatsappUrl(company.whatsapp),
      address: company.address,
      website: company.website,
      facebookUrl: this.getOptionalUrl('COMPANY_FACEBOOK_URL'),
      tiktokUrl: this.getOptionalUrl('COMPANY_TIKTOK_URL'),
    };
  }

  private getWhatsappDigits(): string {
    const raw = this.configService.get<string>('COMPANY_WHATSAPP') ?? '51947346467';
    return raw.replace(/\D/g, '');
  }

  private getOptionalUrl(key: string): string | null {
    const value = this.configService.get<string>(key)?.trim();
    return value ? value : null;
  }

  private buildWhatsappUrl(whatsapp: string): string {
    return `https://wa.me/${whatsapp.replace(/\D/g, '')}`;
  }

  private formatWhatsappDisplay(whatsapp: string): string {
    const digits = whatsapp.replace(/\D/g, '');
    if (digits.startsWith('51') && digits.length === 11) {
      const local = digits.slice(2);
      return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
    }

    if (digits.length === 9) {
      return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }

    return whatsapp;
  }
}
