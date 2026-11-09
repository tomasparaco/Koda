import { supabase } from '../lib/supabase';
import { NotificacionService } from './notificacion.service';
import { formatMonto, redondear } from '../lib/money';
import type { Moneda } from './bcv.service';

export type TipoAjuste = 'cargo' | 'credito';
export type CategoriaAjuste = 'multa' | 'alquiler_salon' | 'gasto_extra' | 'devolucion' | 'otro';
export type AplicarAjuste = 'proximo_recibo' | 'inmediato';

export interface Ajuste {
  id: number;
  codigo_edificio: string;
  id_propietario: number;
  grupo: string | null;
  tipo: TipoAjuste;
  categoria: CategoriaAjuste;
  concepto: string;
  monto: number;
  aplicar: AplicarAjuste;
  estado: 'pendiente' | 'aplicado' | 'anulado';
  id_recibo: number | null;
  created_at: string;
  propietarios?: { apartamento: string; nombre: string };
}

export const CATEGORIAS_AJUSTE: Record<CategoriaAjuste, { label: string; tipo: TipoAjuste }> = {
  multa: { label: 'Multa', tipo: 'cargo' },
  alquiler_salon: { label: 'Alquiler de salón de fiestas', tipo: 'cargo' },
  gasto_extra: { label: 'Gasto extra', tipo: 'cargo' },
  otro: { label: 'Otro cargo', tipo: 'cargo' },
  devolucion: { label: 'Devolución / cobro en exceso', tipo: 'credito' },
};

export interface NuevoAjuste {
  codigo_edificio: string;
  categoria: CategoriaAjuste;
  concepto: string;
  monto: number;
  /** null = todo el edificio, repartido por alícuota */
  id_propietario: number | null;
  aplicar: AplicarAjuste;
  moneda: Moneda;
}

const hoyISO = () => new Date().toLocaleDateString('en-CA');

/** Reparte un monto entre propietarios según su alícuota (los centavos sobrantes van al de mayor alícuota). */
export function repartirPorAlicuota(total: number, propietarios: { id_propietario: number; alicuota: number }[]) {
  const sumaAlicuotas = propietarios.reduce((s, p) => s + (Number(p.alicuota) || 0), 0);
  if (sumaAlicuotas <= 0) return [];
  const partes = propietarios.map((p) => ({
    id_propietario: p.id_propietario,
    monto: redondear((total * (Number(p.alicuota) || 0)) / sumaAlicuotas),
  }));
  const diferencia = redondear(total - partes.reduce((s, p) => s + p.monto, 0));
  if (diferencia !== 0 && partes.length > 0) {
    const mayor = partes.reduce((a, b) => (b.monto > a.monto ? b : a));
    mayor.monto = redondear(mayor.monto + diferencia);
  }
  return partes.filter((p) => p.monto > 0);
}

export const AjusteService = {
  getAjustes: async (codigo_edificio: string): Promise<Ajuste[]> => {
    const { data, error } = await supabase
      .from('ajustes')
      .select('*, propietarios(apartamento, nombre)')
      .eq('codigo_edificio', codigo_edificio)
      .neq('estado', 'anulado')
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) {
      console.error('Error al cargar ajustes:', error);
      return [];
    }
    return (data as Ajuste[]) || [];
  },

  getAjustesDeRecibo: async (id_recibo: number): Promise<Ajuste[]> => {
    const { data, error } = await supabase.from('ajustes').select('*').eq('id_recibo', id_recibo);
    if (error) return [];
    return (data as Ajuste[]) || [];
  },

  /**
   * Registra un cargo o devolución.
   *  - Devoluciones (créditos): siempre se descuentan en el próximo recibo.
   *  - Cargos "próximo recibo": quedan pendientes y salen en la factura del mes.
   *  - Cargos "inmediato": se crea un recibo extra que el propietario puede pagar ya.
   */
  crear: async (a: NuevoAjuste): Promise<{ exito: boolean; mensaje: string }> => {
    try {
      const tipo = CATEGORIAS_AJUSTE[a.categoria].tipo;
      const aplicar: AplicarAjuste = tipo === 'credito' ? 'proximo_recibo' : a.aplicar;
      const monto = redondear(Number(a.monto));
      if (!monto || monto <= 0) return { exito: false, mensaje: 'El monto debe ser mayor a 0.' };
      if (!a.concepto.trim()) return { exito: false, mensaje: 'Escribe el concepto.' };

      // 1. ¿A quién se le aplica?
      let query = supabase
        .from('propietarios')
        .select('id_propietario, alicuota, apartamento, deuda')
        .eq('codigo_edificio', a.codigo_edificio);
      if (a.id_propietario !== null) query = query.eq('id_propietario', a.id_propietario);
      const { data: props, error: propErr } = await query;
      if (propErr) throw propErr;
      if (!props || props.length === 0) return { exito: false, mensaje: 'No se encontraron propietarios.' };

      const partes =
        a.id_propietario !== null
          ? [{ id_propietario: a.id_propietario, monto }]
          : repartirPorAlicuota(monto, props as any);
      if (partes.length === 0) return { exito: false, mensaje: 'Los propietarios no tienen alícuota asignada.' };

      const grupo = a.id_propietario === null ? crypto.randomUUID() : null;
      const filas = partes.map((p) => ({
        codigo_edificio: a.codigo_edificio,
        id_propietario: p.id_propietario,
        grupo,
        tipo,
        categoria: a.categoria,
        concepto: a.concepto.trim(),
        monto: p.monto,
        aplicar,
        estado: 'pendiente',
      }));

      const { data: insertados, error: insErr } = await supabase.from('ajustes').insert(filas).select();
      if (insErr) throw insErr;

      // 2. Cargo inmediato: un recibo extra por apartamento (el trigger suma la deuda)
      if (aplicar === 'inmediato') {
        for (const aj of insertados as Ajuste[]) {
          const { data: recibo, error: recErr } = await supabase
            .from('recibos')
            .insert({
              id_propietario: aj.id_propietario,
              periodo: hoyISO(),
              monto_alicuota: 0,
              fondo_reserva: 0,
              monto_cargos: aj.monto,
              monto_creditos: 0,
              monto_total: aj.monto,
              moneda: a.moneda,
              tipo: 'extra',
              concepto: `${CATEGORIAS_AJUSTE[a.categoria].label}: ${aj.concepto}`,
              fecha_emision: hoyISO(),
              estado: 'pendiente',
            })
            .select()
            .single();
          if (recErr) throw recErr;
          // La deuda la suma el trigger "trigger_nuevo_recibo" de la base de datos.
          await supabase.from('ajustes').update({ estado: 'aplicado', id_recibo: recibo.id_recibo }).eq('id', aj.id);
        }
      }

      // 3. Avisar a los propietarios
      const etiqueta = CATEGORIAS_AJUSTE[a.categoria].label;
      const cuando = aplicar === 'inmediato' ? 'Ya puedes verlo y pagarlo en tu panel.' : 'Se reflejará en tu próximo recibo.';
      if (a.id_propietario !== null) {
        const apto = (props as any[])[0]?.apartamento;
        await NotificacionService.crear({
          codigo_edificio: a.codigo_edificio,
          tipo: 'cobro',
          titulo: tipo === 'credito' ? 'Devolución a tu favor' : `Nuevo cargo: ${etiqueta}`,
          mensaje: `${a.concepto.trim()} por ${formatMonto(monto, a.moneda)}. ${cuando}`,
          destinatario: apto,
        });
      } else {
        await NotificacionService.crear({
          codigo_edificio: a.codigo_edificio,
          tipo: 'cobro',
          titulo: tipo === 'credito' ? 'Devolución para todo el edificio' : `Cargo extra del edificio: ${etiqueta}`,
          mensaje: `${a.concepto.trim()} por un total de ${formatMonto(monto, a.moneda)}, repartido según la alícuota de cada apartamento. ${cuando}`,
          destinatario: 'usuarios',
        });
      }

      const n = partes.length;
      return {
        exito: true,
        mensaje:
          aplicar === 'inmediato'
            ? `Cargo aplicado de inmediato a ${n} apartamento${n > 1 ? 's' : ''}.`
            : `${tipo === 'credito' ? 'Devolución' : 'Cargo'} registrado para ${n} apartamento${n > 1 ? 's' : ''}. Saldrá en el próximo recibo.`,
      };
    } catch (e: any) {
      console.error('Error al registrar ajuste:', e);
      const faltaTabla = /ajustes|monto_cargos|does not exist/i.test(e?.message || '');
      return {
        exito: false,
        mensaje: faltaTabla
          ? 'Falta actualizar la base de datos: ejecuta el script SQL de Kuota en Supabase.'
          : e?.message || 'Error al registrar.',
      };
    }
  },

  /** Anula un ajuste que aún no se ha cobrado (si es de todo el edificio, anula el grupo completo). */
  anular: async (ajuste: Ajuste): Promise<{ exito: boolean; mensaje: string }> => {
    if (ajuste.estado !== 'pendiente') return { exito: false, mensaje: 'Solo se pueden anular ajustes pendientes.' };
    let q = supabase.from('ajustes').update({ estado: 'anulado' }).eq('estado', 'pendiente');
    q = ajuste.grupo ? q.eq('grupo', ajuste.grupo) : q.eq('id', ajuste.id);
    const { error } = await q;
    if (error) return { exito: false, mensaje: error.message };
    return { exito: true, mensaje: 'Ajuste anulado.' };
  },
};
