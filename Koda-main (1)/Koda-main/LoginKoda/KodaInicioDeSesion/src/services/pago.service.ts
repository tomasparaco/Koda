import { supabase } from '../lib/supabase';

export const PagoService = {
    getPendingRecibos: async (id_propietario: number) => {
        try {
            const { data, error } = await supabase
                .from('recibos')
                .select('*')
                .eq('id_propietario', id_propietario)
                .eq('estado', 'pendiente');

            if (error) throw error;
            return { exito: true, data };
        } catch (error: any) {
            console.error('Error fetching pending receipts:', error);
            return { exito: false, mensaje: error.message, data: [] };
        }
    },

    getPagosPendientesAdmin: async (codigo_edificio: string) => {
        try {
            const { data, error } = await supabase
                .from('pagos')
                .select(`
          *,
          recibos!inner(
            id_propietario,
            propietarios!inner(
              codigo_edificio,
              apartamento,
              nombre
            )
          )
        `)
                .eq('estado', 'pendiente')
                .eq('recibos.propietarios.codigo_edificio', codigo_edificio);

            if (error) throw error;
            return { exito: true, data };
        } catch (error: any) {
            console.error('Error fetching pending payments admin:', error);
            return { exito: false, mensaje: error.message, data: [] };
        }
    },

    getTodosLosPagosAdmin: async (codigo_edificio: string) => {
        try {
            const { data, error } = await supabase
                .from('pagos')
                .select(`
          *,
          recibos!inner(
            id_propietario,
            propietarios!inner(
              codigo_edificio,
              apartamento,
              nombre
            )
          )
        `)
                .eq('recibos.propietarios.codigo_edificio', codigo_edificio)
                .order('fecha_pago', { ascending: false });

            if (error) throw error;
            return { exito: true, data };
        } catch (error: any) {
            console.error('Error fetching all payments admin:', error);
            return { exito: false, mensaje: error.message, data: [] };
        }
    },

    getPagosPendientesCountAdmin: async (codigo_edificio: string) => {
        try {
            const { count, error } = await supabase
                .from('pagos')
                .select(`
          id_pago,
          recibos!inner(
            id_propietario,
            propietarios!inner(
              codigo_edificio
            )
          )
        `, { count: 'exact', head: true })
                .eq('estado', 'pendiente')
                .eq('recibos.propietarios.codigo_edificio', codigo_edificio);

            if (error) throw error;
            return { exito: true, count: count || 0 };
        } catch (error: any) {
            console.error('Error fetching pending payments count admin:', error);
            return { exito: false, count: 0 };
        }
    },

    aprobarPago: async (id_pago: number, id_recibo: number, id_propietario: number, monto: number) => {
        try {
            // 1. Actualizar estado del pago a 'aprobado'
            const { error: pagoError } = await supabase
                .from('pagos')
                .update({ estado: 'aprobado' })
                .eq('id_pago', id_pago);

            if (pagoError) throw pagoError;

            // NOTA IMPORTANTE:
            // La base de datos de Supabase maneja un Trigger llamado 'manejar_descuento_por_aprobacion'
            // que se encarga automáticamente de descontar la deuda del propietario, y posiblemente 
            // marcar el recibo como pagado si el monto del pago completo alcanza el monto_total.
            // Por ende, comentamos la lógica manual de deducción que producía un doble descuento.

            return { exito: true, mensaje: 'Pago aprobado y deuda actualizada.' };
        } catch (error: any) {
            console.error('Error approving payment:', error);
            return { exito: false, mensaje: error.message };
        }
    },

    rechazarPago: async (id_pago: number, motivo_rechazo: string) => {
        try {
            const { error } = await supabase
                .from('pagos')
                .update({ estado: 'rechazado', motivo_rechazo: motivo_rechazo })
                .eq('id_pago', id_pago);

            if (error) throw error;
            return { exito: true, mensaje: 'Pago rechazado.' };
        } catch (error: any) {
            console.error('Error rejecting payment:', error);
            return { exito: false, mensaje: error.message };
        }
    },

    getPagosUsuario: async (id_propietario: number) => {
        try {
            const { data, error } = await supabase
                .from('pagos')
                .select(`
          *,
          recibos!inner(id_propietario)
        `)
                .eq('recibos.id_propietario', id_propietario)
                .order('fecha_pago', { ascending: false });

            if (error) throw error;
            return { exito: true, data };
        } catch (error: any) {
            console.error('Error fetching user payments:', error);
            return { exito: false, mensaje: error.message, data: [] };
        }
    },

    getTopMorosos: async (codigo_edificio: string) => {
        try {
            const { data, error } = await supabase
                .from('propietarios')
                .select('nombre, apartamento, deuda')
                .eq('codigo_edificio', codigo_edificio)
                .gt('deuda', 0)
                .order('deuda', { ascending: false })
                .limit(5);

            if (error) throw error;
            return { exito: true, data };
        } catch (error: any) {
            console.error('Error fetching top morosos:', error);
            return { exito: false, data: [] };
        }
    }
};
