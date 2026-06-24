export interface CompanyConfig {
  name: string;
  legalName: string;
  ruc: string;
  address: string;
  website: string;
  whatsapp: string;
  whatsappDisplay: string;
}

export interface ContactConfig {
  whatsapp: string;
  whatsappDisplay: string;
  whatsappUrl: string;
  address: string;
  website: string;
  facebookUrl: string | null;
  tiktokUrl: string | null;
}
