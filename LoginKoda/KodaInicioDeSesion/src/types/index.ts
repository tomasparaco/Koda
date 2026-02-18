
export interface Edificio {
  codigo_edificio: string;
  descripcion: string;
  direccion?: string;
  rif?: string;
}

export interface Propietario {
  id_propietario: number;
  nombre: string;
  correo: string;
  apartamento: string;
  alicuota: number;
  celular?: string;
  id_auth: string;
  edificios?: Edificio;
  rol?: 'admin' | 'propietario' | string; 
}

export interface RespuestaLogin {
  exito: boolean;
  mensaje?: string;
  datos?: Propietario[];
}