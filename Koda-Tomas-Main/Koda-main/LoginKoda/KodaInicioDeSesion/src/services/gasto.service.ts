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

      // 2. Get all proprietors from the building
      const { data: propietarios, error: propietariosError } = await supabase
        .from('propietarios')
        .select('id_propietario, alicuota, deuda')
        .eq('codigo_edificio', gastoData.codigo_edificio);

      if (propietariosError) {
        console.error('Error fetching propietarios:', propietariosError);
        // Here we have an inconsistent state: the expense was added but debts were not updated.
        // This should be handled, maybe by deleting the expense or flagging it.
        return { exito: false, mensaje: 'Gasto registrado, pero no se pudo actualizar las deudas.' };
      }
      
      if (!propietarios || propietarios.length === 0) {
        return { exito: true, mensaje: 'Gasto registrado. No se encontraron propietarios para actualizar deuda.' };
      }

      // 3. Calculate and update debt for each proprietor
      const updates = propietarios.map(p => {
        const currentDeuda = p.deuda || 0;
        const alicuotaPercentage = p.alicuota / 100;
        const debtShare = gastoData.monto * alicuotaPercentage;
        const newDeuda = currentDeuda + debtShare;

        return supabase
          .from('propietarios')
          .update({ deuda: newDeuda })
          .eq('id_propietario', p.id_propietario);
      });

      const results = await Promise.all(updates);
      
      const updateErrors = results.filter(res => res.error);
      if (updateErrors.length > 0) {
          console.error('Errors updating debts:', updateErrors);
          return { exito: false, mensaje: 'Gasto registrado, pero ocurrieron errores al actualizar algunas deudas.' };
      }

      return { exito: true, mensaje: 'Gasto registrado y deudas actualizadas con éxito.' };

    } catch (e) {
      console.error('Catch adding gasto:', e);
      return { exito: false, mensaje: 'Un error inesperado ocurrió.' };
    }
  },
};
