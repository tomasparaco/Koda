import { supabase } from '../lib/supabase';
import { normalizarEdificio, type EdificioConfig } from './edificio.service';

export interface EdificioAdministrado {
  id: number;
  codigo_edificio: string;
  nombre: string | null;
  correo: string | null;
  edificio: EdificioConfig;
}

export interface MorosoResumen {
  id_propietario: number;
  nombre: string;
  apartamento: string;
  correo?: string;
  celular?: string;
  deuda: number;
  meses: number;
  codigo_edificio: string;
}

export interface ResumenEdificio {
  codigo_edificio: string;
  edificio: EdificioConfig;
  totalAptos: number;
  aptosSolventes: number;
  morosos: MorosoResumen[];
  deudaTotal: number;
  pagosPorConciliar: number;
}

export const AdministradoraService = {
  /** Edificios que maneja una administradora (vacío si no es administradora o falta el script SQL). */
  getEdificiosAdministrados: async (userId: string): Promise<EdificioAdministrado[]> => {
    try {
      let { data, error } = await supabase
        .from('administradora_edificios')
        .select('id, codigo_edificio, nombre, correo, edificios(*)')
        .eq('id_auth', userId);

      // Plan B: si la relación con "edificios" no está disponible, se piden por separado
      if (error && /relationship|PGRST200/i.test(`${error.message} ${(error as any).code}`)) {
        const base = await supabase.from('administradora_edificios').select('id, codigo_edificio, nombre, correo').eq('id_auth', userId);
        if (!base.error && base.data && base.data.length > 0) {
          const { data: edifs } = await supabase
            .from('edificios')
            .select('*')
            .in('codigo_edificio', base.data.map((r: any) => r.codigo_edificio));
          data = base.data.map((r: any) => ({ ...r, edificios: (edifs || []).find((e: any) => e.codigo_edificio === r.codigo_edificio) }));
          error = null;
        } else {
          data = base.data;
          error = base.error;
        }
      }

      if (error) {
        // La tabla no existe todavía → simplemente no es administradora
        if (!/does not exist/i.test(error.message)) console.error('Error administradora_edificios:', error);
        return [];
      }
      return (data || []).map((r: any) => ({
        id: r.id,
        codigo_edificio: r.codigo_edificio,
        nombre: r.nombre,
        correo: r.correo,
        edificio: normalizarEdificio(r.edificios, r.codigo_edificio),
      }));
    } catch {
      return [];
    }
  },

  /** Resumen de cobranza de varios edificios a la vez (para el panel de la administradora). */
  getResumen: async (edificios: EdificioAdministrado[]): Promise<ResumenEdificio[]> => {
    const codigos = edificios.map((e) => e.codigo_edificio);
    if (codigos.length === 0) return [];

    const [propsRes, recibosRes, pagosRes] = await Promise.all([
      supabase
        .from('propietarios')
        .select('id_propietario, nombre, apartamento, correo, celular, deuda, rol, codigo_edificio')
        .in('codigo_edificio', codigos),
      supabase
        .from('recibos')
        .select('id_propietario, propietarios!inner(codigo_edificio)')
        .eq('estado', 'pendiente')
        .in('propietarios.codigo_edificio', codigos),
      supabase
        .from('pagos')
        .select('id_pago, recibos!inner(propietarios!inner(codigo_edificio))')
        .eq('estado', 'pendiente')
        .in('recibos.propietarios.codigo_edificio', codigos),
    ]);

    if (propsRes.error) console.error('Resumen: propietarios', propsRes.error);
    if (recibosRes.error) console.error('Resumen: recibos', recibosRes.error);
    if (pagosRes.error) console.error('Resumen: pagos', pagosRes.error);

    const mesesPorProp = new Map<number, number>();
    (recibosRes.data || []).forEach((r: any) => mesesPorProp.set(r.id_propietario, (mesesPorProp.get(r.id_propietario) || 0) + 1));

    const pagosPorEdif = new Map<string, number>();
    (pagosRes.data || []).forEach((p: any) => {
      const cod = p.recibos?.propietarios?.codigo_edificio;
      if (cod) pagosPorEdif.set(cod, (pagosPorEdif.get(cod) || 0) + 1);
    });

    return edificios.map((e) => {
      // Las filas con rol 'admin' son las cuentas de la junta, no apartamentos
      const props = (propsRes.data || []).filter((p: any) => p.codigo_edificio === e.codigo_edificio && p.rol !== 'admin');
      const morosos: MorosoResumen[] = props
        .filter((p: any) => Number(p.deuda) > 0)
        .map((p: any) => ({
          id_propietario: p.id_propietario,
          nombre: p.nombre,
          apartamento: p.apartamento,
          correo: p.correo,
          celular: p.celular,
          deuda: Number(p.deuda),
          meses: Math.max(mesesPorProp.get(p.id_propietario) || 0, 1),
          codigo_edificio: e.codigo_edificio,
        }))
        .sort((a, b) => b.deuda - a.deuda);
      return {
        codigo_edificio: e.codigo_edificio,
        edificio: e.edificio,
        totalAptos: props.length,
        aptosSolventes: props.length - morosos.length,
        morosos,
        deudaTotal: morosos.reduce((s, m) => s + m.deuda, 0),
        pagosPorConciliar: pagosPorEdif.get(e.codigo_edificio) || 0,
      };
    });
  },
};
