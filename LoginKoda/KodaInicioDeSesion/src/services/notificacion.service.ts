import { supabase } from '../lib/supabase';

export interface Notificacion {
  id: string;
  codigo_edificio: string;
  tipo: 'pago' | 'ticket' | 'comunicado' | 'evento' | 'encuesta' | 'cobro' | 'sistema';
  titulo: string;
  mensaje: string;
  leido: boolean;
  destinatario: string; // 'admin' | 'usuarios' | apartamento específico
  created_at: string;
}

export const NotificacionService = {
  /** Crear una nueva notificación */
  crear: async (data: Omit<Notificacion, 'id' | 'leido' | 'created_at'>) => {
    const { error } = await supabase.from('notificaciones').insert([data]);
    if (error) console.error('Error al crear notificación:', error);
  },

  /** Obtener notificaciones para un viewer (admin o usuario con apartamento) */
  getNotificaciones: async (codigo_edificio: string, destinatarios: string[]) => {
    const { data, error } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('codigo_edificio', codigo_edificio)
      .in('destinatario', destinatarios)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error al obtener notificaciones:', error);
      return [];
    }
    return (data as Notificacion[]) || [];
  },

  /** Marcar una notificación como leída */
  marcarLeida: async (id: string) => {
    await supabase.from('notificaciones').update({ leido: true }).eq('id', id);
  },

  /** Marcar todas como leídas para un viewer */
  marcarTodasLeidas: async (codigo_edificio: string, destinatarios: string[]) => {
    await supabase
      .from('notificaciones')
      .update({ leido: true })
      .eq('codigo_edificio', codigo_edificio)
      .in('destinatario', destinatarios)
      .eq('leido', false);
  },

  /** Eliminar una notificación */
  eliminar: async (id: string) => {
    await supabase.from('notificaciones').delete().eq('id', id);
  },

  /** Eliminar todas las notificaciones para un viewer */
  eliminarTodas: async (codigo_edificio: string, destinatarios: string[]) => {
    // Para mayor seguridad de no borrar cosas ajenas, garantizamos edificio + dest.
    await supabase
      .from('notificaciones')
      .delete()
      .eq('codigo_edificio', codigo_edificio)
      .in('destinatario', destinatarios);
  },
};
