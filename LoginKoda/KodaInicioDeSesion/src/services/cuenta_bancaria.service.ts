import { supabase } from '../lib/supabase';

export interface CuentaBancaria {
  id?: number;
  codigo_edificio: string;
  banco_nombre: string;
  numero_cuenta: string;
  rif: string;
  telefono: string;
  moneda: string;
  created_at?: string;
}

export const CuentaBancariaService = {
  async getCuentas(codigoEdificio: string) {
    try {
      const { data, error } = await supabase
        .from('cuentas_bancarias')
        .select('*')
        .eq('codigo_edificio', codigoEdificio)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { exito: true, data: data as CuentaBancaria[] };
    } catch (error: any) {
      console.error('Error obteniendo cuentas bancarias:', error);
      return { exito: false, mensaje: error.message };
    }
  },

  async addCuenta(cuenta: Omit<CuentaBancaria, 'id' | 'created_at'>) {
    try {
      const { data, error } = await supabase
        .from('cuentas_bancarias')
        .insert([cuenta])
        .select()
        .single();

      if (error) throw error;
      return { exito: true, data: data as CuentaBancaria };
    } catch (error: any) {
      console.error('Error insertando cuenta bancaria:', error);
      return { exito: false, mensaje: error.message };
    }
  },

  async updateCuenta(id: number, cuenta: Partial<CuentaBancaria>) {
    try {
      const { data, error } = await supabase
        .from('cuentas_bancarias')
        .update(cuenta)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { exito: true, data: data as CuentaBancaria };
    } catch (error: any) {
      console.error('Error actualizando cuenta bancaria:', error);
      return { exito: false, mensaje: error.message };
    }
  },

  async deleteCuenta(id: number) {
    try {
      const { error } = await supabase
        .from('cuentas_bancarias')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { exito: true };
    } catch (error: any) {
      console.error('Error eliminando cuenta bancaria:', error);
      return { exito: false, mensaje: error.message };
    }
  }
};
