import { supabase } from '../lib/supabase';
import { redondear } from '../lib/money';
import type { Moneda } from './bcv.service';

export interface EdificioConfig {
  codigo_edificio: string;
  descripcion: string;
  direccion?: string;
  rif?: string;
  moneda_cobro: Moneda;
  /** Monto que debe tener el fondo de reserva (ej. 1000). 0 = sin fondo */
  fondo_reserva_meta: number;
  /** Dinero que hay hoy en el fondo */
  fondo_reserva_saldo: number;
}

/** Lo que falta para que el fondo vuelva a su meta (es lo que se cobra en el próximo recibo). */
export function faltanteFondo(cfg: Pick<EdificioConfig, 'fondo_reserva_meta' | 'fondo_reserva_saldo'>) {
  return redondear(Math.max(0, (cfg.fondo_reserva_meta || 0) - (cfg.fondo_reserva_saldo || 0)));
}

/** Normaliza una fila de "edificios" (tolera que aún no se hayan corrido los scripts SQL). */
export function normalizarEdificio(row: any, codigo: string): EdificioConfig {
  return {
    codigo_edificio: row?.codigo_edificio ?? codigo,
    descripcion: row?.descripcion ?? codigo,
    direccion: row?.direccion ?? '',
    rif: row?.rif ?? '',
    moneda_cobro: row?.moneda_cobro === 'EUR' ? 'EUR' : 'USD',
    fondo_reserva_meta: Number(row?.fondo_reserva_meta) || 0,
    fondo_reserva_saldo: Number(row?.fondo_reserva_saldo) || 0,
  };
}

const mensajeError = (error: { message: string }) =>
  /does not exist|schema cache|fondo_reserva_meta|kuota_fondo/i.test(error.message)
    ? 'Falta actualizar la base de datos: ejecuta los scripts SQL de Kuota en Supabase.'
    : error.message.replace(/^.*?ERROR:\s*/, '');

export const EdificioService = {
  getConfig: async (codigo_edificio: string): Promise<EdificioConfig> => {
    const { data, error } = await supabase
      .from('edificios')
      .select('*')
      .eq('codigo_edificio', codigo_edificio)
      .maybeSingle();
    if (error) console.error('Error al cargar configuración del edificio:', error);
    return normalizarEdificio(data, codigo_edificio);
  },

  updateConfig: async (
    codigo_edificio: string,
    cambios: Partial<Pick<EdificioConfig, 'descripcion' | 'direccion' | 'rif' | 'moneda_cobro'>>
  ): Promise<{ exito: boolean; mensaje: string }> => {
    const { error } = await supabase.from('edificios').update(cambios).eq('codigo_edificio', codigo_edificio);
    if (error) {
      console.error('Error al actualizar edificio:', error);
      return { exito: false, mensaje: mensajeError(error) };
    }
    return { exito: true, mensaje: 'Configuración guardada.' };
  },
};

export interface MovimientoFondo {
  id: number;
  codigo_edificio: string;
  tipo: 'uso' | 'reposicion' | 'ajuste';
  monto: number;
  saldo_resultante: number;
  concepto: string;
  created_at: string;
}

/** Fondo de reserva con meta fija: solo se cobra para reponer lo que se usó. */
export const FondoReservaService = {
  getMovimientos: async (codigo_edificio: string, limite = 20): Promise<MovimientoFondo[]> => {
    const { data, error } = await supabase
      .from('fondo_reserva_movimientos')
      .select('*')
      .eq('codigo_edificio', codigo_edificio)
      .order('created_at', { ascending: false })
      .limit(limite);
    if (error) {
      console.warn('No se pudo leer el historial del fondo:', error.message);
      return [];
    }
    return (data as MovimientoFondo[]) || [];
  },

  /** Fija la meta y el saldo actual del fondo. */
  configurar: async (codigo_edificio: string, meta: number, saldo: number) => {
    const { error } = await supabase.rpc('kuota_fondo_configurar', { p_codigo: codigo_edificio, p_meta: meta, p_saldo: saldo });
    return error ? { exito: false, mensaje: mensajeError(error) } : { exito: true, mensaje: 'Fondo de reserva actualizado.' };
  },

  /** Registra que se usó dinero del fondo; se repondrá en el próximo recibo. */
  usar: async (codigo_edificio: string, monto: number, concepto: string) => {
    const { data, error } = await supabase.rpc('kuota_fondo_usar', { p_codigo: codigo_edificio, p_monto: monto, p_concepto: concepto });
    return error
      ? { exito: false, mensaje: mensajeError(error), saldo: null as number | null }
      : { exito: true, mensaje: 'Uso del fondo registrado.', saldo: Number(data) };
  },

  /** Lo llama la emisión de recibos con el monto de reposición que se facturó. */
  reponer: async (codigo_edificio: string, monto: number, concepto: string) => {
    const { error } = await supabase.rpc('kuota_fondo_reponer', { p_codigo: codigo_edificio, p_monto: monto, p_concepto: concepto });
    if (error) console.error('No se pudo actualizar el saldo del fondo:', error);
    return !error;
  },
};
