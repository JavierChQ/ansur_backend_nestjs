export interface ApisPeruDniResponse {
  dni?: string;
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  codVerifica?: string;
  success?: boolean;
  message?: string;
}

export interface ApisPeruRucResponse {
  ruc?: string;
  razonSocial?: string;
  nombreComercial?: string | null;
  telefonos?: string[];
  estado?: string;
  condicion?: string;
  direccion?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  ubigeo?: string;
  capital?: string;
  success?: boolean;
  message?: string;
}
