import { supabase } from '../lib/supabase';
import type { Propietario } from '../types';

// Type for a new expense, matching the database schema
type NewGasto = {
  titulo: string;
  descripcion: string;
  monto: number;
  fecha_gasto: string;
  categoria: string;
  factura_url?: string;
  codigo_edificio: string;
  // Default values for fields not in the form
  pagado_al_proveedor?: boolean;
  referencia_pago?: string;
  codigo_concepto?: number;
};

export const GastoService = {
  /**
   * Fetches all expenses for a given building code.
   */
  getGastos: async (codigo_edificio: string) => {
    try {
      const { data, error } = await supabase
        .from('gastos')
        .select('*')
        .eq('codigo_edificio', codigo_edificio)
        .order('fecha_gasto', { ascending: false });

      if (error) {
        console.error('Error fetching gastos:', error);
        return [];
      }
      return data;
    } catch (e) {
      console.error('Catch fetching gastos:', e);
      return [];
    }
  },

  /**
   * Adds a new expense and updates the debt for all proprietors of the building.
   */
  addGasto: async (gastoData: NewGasto): Promise<{ exito: boolean; mensaje: string }> => {
    try {
      // Manually construct the object to insert to avoid schema mismatch
      const gastoToInsert = {
        descripcion: `${gastoData.titulo}: ${gastoData.descripcion}`,
        monto: gastoData.monto,
        fecha_gasto: gastoData.fecha_gasto,
        categoria: gastoData.categoria,
        factura_url: gastoData.factura_url,
        codigo_edificio: gastoData.codigo_edificio,
        pagado_al_proveedor: gastoData.pagado_al_proveedor,
      };

      // 1. Insert the new expense
      const { data: newGasto, error: insertError } = await supabase
        .from('gastos')
        .insert(gastoToInsert)
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting gasto:', insertError);
        return { exito: false, mensaje: 'Error al registrar el gasto. Revisa los datos o contacta a soporte.' };
      }

      // The previous logic updated `deuda` for all proprietors, but the new flow
      // requires `deuda` to be updated ONLY when a receipt is emitted at the end of the month.
      // Therefore, we just return success after successfully inserting the `gasto`.

      return { exito: true, mensaje: 'Gasto registrado con éxito.' };

    } catch (e) {
      console.error('Catch adding gasto:', e);
      return { exito: false, mensaje: 'Un error inesperado ocurrió.' };
    }
  },
};
