import { supabase } from '../lib/supabase';
import { redondear } from '../lib/money';
import { EdificioService, FondoReservaService, faltanteFondo } from './edificio.service';
import { repartirPorAlicuota } from './ajuste.service';

/** Primer día del mes actual y del siguiente, en formato YYYY-MM-DD (hora local). */
function rangoMesActual() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const firstDay = `${year}-${month}-01`;
  const nextMonth = new Date(year, now.getMonth() + 1, 1);
  const nextMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;
  return { firstDay, nextMonthStr };
}

async function gastosDelMes(codigo_edificio: string) {
  const { firstDay, nextMonthStr } = rangoMesActual();
  const { data: gastos, error } = await supabase
    .from('gastos')
    .select('monto')
    .eq('codigo_edificio', codigo_edificio)
    .gte('fecha_gasto', firstDay)
    .lt('fecha_gasto', nextMonthStr);
  if (error) throw new Error('Error al obtener gastos: ' + error.message);
  return gastos?.reduce((acc, g) => acc + Number(g.monto), 0) || 0;
}

/** Ajustes pendientes para el próximo recibo (si la tabla aún no existe, devuelve []). */
async function ajustesPendientes(codigo_edificio: string) {
  const { data, error } = await supabase
    .from('ajustes')
    .select('id, id_propietario, tipo, monto')
    .eq('codigo_edificio', codigo_edificio)
    .eq('estado', 'pendiente')
    .eq('aplicar', 'proximo_recibo');
  if (error) {
    console.warn('No se pudieron leer los ajustes (¿falta correr el script SQL?):', error.message);
    return [] as { id: number; id_propietario: number; tipo: 'cargo' | 'credito'; monto: number }[];
  }
  return (data || []) as { id: number; id_propietario: number; tipo: 'cargo' | 'credito'; monto: number }[];
}

export interface ResumenEmision {
  gastoTotalMes: number;
  /** Meta y saldo actuales del fondo de reserva */
  fondoMeta: number;
  fondoSaldo: number;
  /** Lo que se cobra este mes para reponer el fondo (meta − saldo) */
  fondoReposicion: number;
  totalCargos: number;
  totalCreditos: number;
  totalAFacturar: number;
  cantidadAjustes: number;
}

export const ReciboService = {
  /** Lo que se va a facturar este mes, para mostrarlo antes de confirmar la emisión. */
  previsualizarEmision: async (codigo_edificio: string): Promise<ResumenEmision> => {
    const [gastoTotalMes, cfg, ajustes] = await Promise.all([
      gastosDelMes(codigo_edificio).catch(() => 0),
      EdificioService.getConfig(codigo_edificio),
      ajustesPendientes(codigo_edificio),
    ]);
    const fondoReposicion = faltanteFondo(cfg);
    const totalCargos = redondear(ajustes.filter((a) => a.tipo === 'cargo').reduce((s, a) => s + Number(a.monto), 0));
    const totalCreditos = redondear(ajustes.filter((a) => a.tipo === 'credito').reduce((s, a) => s + Number(a.monto), 0));
    return {
      gastoTotalMes,
      fondoMeta: cfg.fondo_reserva_meta,
      fondoSaldo: cfg.fondo_reserva_saldo,
      fondoReposicion,
      totalCargos,
      totalCreditos,
      totalAFacturar: redondear(gastoTotalMes + fondoReposicion + totalCargos - totalCreditos),
      cantidadAjustes: ajustes.length,
    };
  },

  /**
   * Emite los recibos del mes para todos los propietarios de un edificio.
   * Por cada apartamento:
   *   alícuota         = gastos del mes × alícuota%
   *   fondo de reserva = su parte (por alícuota) de lo que falta para que el
   *                      fondo vuelva a su meta. Si el fondo está lleno, 0.
   *   + cargos pendientes (multas, salón, gastos extra) − devoluciones pendientes
   * La deuda la suma el trigger de la base de datos al insertar cada recibo.
   */
  emitirRecibosDelMes: async (codigo_edificio: string): Promise<{ exito: boolean; mensaje: string; recibosEmitidos?: number }> => {
    try {
      const { firstDay } = rangoMesActual();

      // 1. Propietarios del edificio
      const { data: propietarios, error: propError } = await supabase
        .from('propietarios')
        .select('id_propietario, alicuota, deuda')
        .eq('codigo_edificio', codigo_edificio);
      if (propError) throw new Error('Error al obtener propietarios: ' + propError.message);
      if (!propietarios || propietarios.length === 0) return { exito: false, mensaje: 'No hay propietarios en el edificio.' };

      // 2. ¿Ya se emitió el recibo mensual de este periodo?
      const idsPropietarios = propietarios.map((p) => p.id_propietario);
      const { data: recibosExistentes, error: checkError } = await supabase
        .from('recibos')
        .select('*')
        .eq('periodo', firstDay)
        .in('id_propietario', idsPropietarios);
      if (checkError) throw new Error('Error al verificar recibos existentes: ' + checkError.message);
      // Los recibos "extra" (cargos cobrados de inmediato) no cuentan como recibo mensual
      if ((recibosExistentes || []).some((r: any) => r.tipo !== 'extra')) {
        return { exito: false, mensaje: 'Los recibos para este periodo ya fueron emitidos.' };
      }

      // 3. Gastos, configuración y ajustes pendientes
      const [gastoTotalMes, cfg, ajustes] = await Promise.all([
        gastosDelMes(codigo_edificio),
        EdificioService.getConfig(codigo_edificio),
        ajustesPendientes(codigo_edificio),
      ]);
      const reposicion = faltanteFondo(cfg);
      if (gastoTotalMes === 0 && ajustes.length === 0 && reposicion === 0) {
        return { exito: false, mensaje: 'No hay gastos ni cargos registrados en el mes actual para generar recibos.' };
      }
      // Reposición del fondo repartida por alícuota (los centavos sobrantes van al de mayor alícuota)
      const partesFondo = new Map(
        repartirPorAlicuota(reposicion, propietarios as any).map((p) => [p.id_propietario, p.monto] as const)
      );
      const fechaEmision = new Date().toLocaleDateString('en-CA');

      // 4. Armar cada recibo
      const recibosInsert = propietarios.map((prop) => {
        const monto_alicuota = redondear(gastoTotalMes * ((Number(prop.alicuota) || 0) / 100));
        const fondo_reserva = partesFondo.get(prop.id_propietario) || 0;
        const propios = ajustes.filter((a) => a.id_propietario === prop.id_propietario);
        const monto_cargos = redondear(propios.filter((a) => a.tipo === 'cargo').reduce((s, a) => s + Number(a.monto), 0));
        const monto_creditos = redondear(propios.filter((a) => a.tipo === 'credito').reduce((s, a) => s + Number(a.monto), 0));
        const monto_total = redondear(monto_alicuota + fondo_reserva + monto_cargos - monto_creditos);
        return {
          id_propietario: prop.id_propietario,
          periodo: firstDay,
          monto_alicuota,
          fondo_reserva,
          monto_cargos,
          monto_creditos,
          monto_total,
          moneda: cfg.moneda_cobro,
          tipo: 'mensual',
          fecha_emision: fechaEmision,
          // Si la devolución cubre todo el recibo, nace pagado y el excedente queda a favor
          estado: monto_total > 0 ? 'pendiente' : 'pagado',
        };
      });

      // 5. Insertar recibos en lote
      const { data: recibosData, error: insertError } = await supabase.from('recibos').insert(recibosInsert).select();
      if (insertError) {
        if (/monto_cargos|monto_creditos|moneda|tipo/.test(insertError.message)) {
          throw new Error('Falta actualizar la base de datos: ejecuta el script SQL de Kuota en Supabase.');
        }
        throw new Error('Error al insertar recibos: ' + insertError.message);
      }

      // 6. Marcar los ajustes como cobrados en su recibo
      const reciboPorPropietario = new Map<number, number>();
      (recibosData || []).forEach((r: any) => reciboPorPropietario.set(r.id_propietario, r.id_recibo));
      const ajustesUpdates = ajustes
        .filter((a) => reciboPorPropietario.has(a.id_propietario))
        .map((a) =>
          supabase
            .from('ajustes')
            .update({ estado: 'aplicado', id_recibo: reciboPorPropietario.get(a.id_propietario) })
            .eq('id', a.id)
        );

      // 7. La deuda NO se actualiza aquí: el trigger "trigger_nuevo_recibo"
      //    (función sumar_deuda_propietario) de la base de datos ya suma el
      //    monto_total de cada recibo insertado. Hacerlo también aquí la duplicaba.
      const resultados = await Promise.all(ajustesUpdates);
      const errores = resultados.filter((r) => r.error);

      // 8. El fondo vuelve a su meta con lo que se acaba de facturar
      const fondoFacturado = redondear(recibosInsert.reduce((s, r) => s + r.fondo_reserva, 0));
      const fondoOk =
        fondoFacturado > 0
          ? await FondoReservaService.reponer(codigo_edificio, fondoFacturado, `Reposición facturada en los recibos de ${firstDay.slice(0, 7)}`)
          : true;

      if (errores.length > 0 || !fondoOk) {
        console.error('Errores después de emitir:', errores);
        return {
          exito: false,
          mensaje: !fondoOk
            ? 'Recibos emitidos, pero no se pudo actualizar el saldo del fondo de reserva. Revísalo en Finanzas.'
            : 'Recibos emitidos, pero algunos cargos o devoluciones no se marcaron como cobrados.',
        };
      }

      return {
        exito: true,
        mensaje: `Se emitieron ${recibosInsert.length} recibos correctamente.`,
        recibosEmitidos: recibosInsert.length,
      };
    } catch (e: any) {
      console.error('Catch emitiendo recibos:', e);
      return { exito: false, mensaje: e.message || 'Error inesperado al emitir los recibos.' };
    }
  },

  /** Total de gastos acumulados del mes actual */
  getGastosDelMesEstimados: async (codigo_edificio: string): Promise<number> => {
    try {
      return await gastosDelMes(codigo_edificio);
    } catch {
      return 0;
    }
  },

  /** Recibo MENSUAL de un propietario para un periodo (YYYY-MM-01) */
  getReciboUsuario: async (id_propietario: number, periodo: string): Promise<any> => {
    try {
      const { data, error } = await supabase
        .from('recibos')
        .select('*')
        .eq('id_propietario', id_propietario)
        .eq('periodo', periodo);
      if (error) throw error;
      return (data || []).find((r: any) => r.tipo !== 'extra') ?? null;
    } catch (e) {
      console.error('Error al obtener el recibo del usuario:', e);
      return null;
    }
  },
};
