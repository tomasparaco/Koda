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
  /** false = solo aviso dentro de la app, sin correo (por defecto se envía correo) */
  enviar_correo?: boolean;
}

export const NotificacionService = {
  /** Crear una nueva notificación */
  crear: async (data: Omit<Notificacion, 'id' | 'leido' | 'created_at'>) => {
    if (!data.destinatario) return; // sin destinatario no hay a quién avisar
    const fila: Record<string, unknown> = { ...data };
    // Solo mandamos la columna cuando se quiere omitir el correo (así funciona aunque falte la columna)
    if (data.enviar_correo !== false) delete fila.enviar_correo;
    let { error } = await supabase.from('notificaciones').insert([fila]);
    if (error && 'enviar_correo' in fila && /enviar_correo/.test(error.message)) {
      delete fila.enviar_correo;
      ({ error } = await supabase.from('notificaciones').insert([fila]));
    }
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

