
export interface Edificio {
  codigo_edificio: string;
  descripcion: string;
  direccion?: string;
  rif?: string;
  moneda_cobro?: 'USD' | 'EUR';
  fondo_reserva_meta?: number;
  fondo_reserva_saldo?: number;
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
  deuda?: number;
  codigo_edificio: string;
}

export interface RespuestaLogin {
  exito: boolean;
  mensaje?: string;
  datos?: Propietario[];
  /** Edificios que maneja como administradora (si aplica) */
  edificiosAdmin?: import('../services/administradora.service').EdificioAdministrado[];
}
