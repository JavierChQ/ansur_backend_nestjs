export interface DniIdentityResult {
  doc_type: 'DNI';
  doc_number: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  nombre_completo: string;
  validated_at: string;
  provider: 'apisperu';
}

export interface RucIdentityResult {
  doc_type: 'RUC';
  doc_number: string;
  razon_social: string;
  direccion: string;
  departamento: string | null;
  provincia: string | null;
  distrito: string | null;
  estado: string;
  condicion: string;
  validated_at: string;
  provider: 'apisperu';
}
