import { supabase } from '../lib/supabase';

export interface Ticket {
  id_ticket?: number;
  codigo_edificio: string;
  id_propietario: number;
  titulo: string;
  descripcion: string;
  ubicacion: string;
  foto_url?: string;
  estado: 'abierto' | 'en_proceso' | 'cerrado' | 'rechazado';
  prioridad: 'baja' | 'media' | 'alta';
  nota_admin?: string;
  calificacion?: number;
  comentario_calificacion?: string;
  foto_resolucion_url?: string;
  created_at?: string;
  propietarios?: {
    nombre: string;
    apartamento: string;
    correo?: string;
  };
}

export const TicketService = {
  // Crear un nuevo ticket (Usuario)
  createTicket: async (ticket: Partial<Ticket>, file?: File) => {
    try {
      let foto_url = null;

      if (file) {
        // Subimos la foto al bucket "tickets"
        const fileExt = file.name.split('.').pop();
        const fileName = `${ticket.codigo_edificio}/${Date.now()}_ticket.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('tickets')
          .upload(fileName, file);

        if (uploadError) throw new Error(`Error al subir imagen: ${uploadError.message}`);

        const { data } = supabase.storage.from('tickets').getPublicUrl(fileName);
        foto_url = data.publicUrl;
      }

      const { data, error } = await supabase
        .from('tickets')
        .insert([{
          codigo_edificio: ticket.codigo_edificio,
          id_propietario: ticket.id_propietario,
          titulo: ticket.titulo,
          descripcion: ticket.descripcion,
          ubicacion: ticket.ubicacion,
          foto_url,
          estado: 'abierto',
          prioridad: ticket.prioridad || 'media'
        }])
        .select()
        .single();

      if (error) throw error;
      return { exito: true, data };
    } catch (error: any) {
      console.error('Error al crear ticket:', error);
      return { exito: false, mensaje: error.message };
    }
  },

  // Obtener tickets de un usuario específico (Usuario)
  getTicketsByPropietario: async (id_propietario: number) => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('id_propietario', id_propietario)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { exito: true, data: data as Ticket[] };
    } catch (error: any) {
      console.error('Error al obtener tickets del usuario:', error);
      return { exito: false, data: [] };
    }
  },

  // Obtener todos los tickets de un edificio (Admin)
  getTicketsByEdificio: async (codigo_edificio: string) => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          propietarios (
            nombre,
            apartamento,
            correo
          )
        `)
        .eq('codigo_edificio', codigo_edificio)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { exito: true, data: data as Ticket[] };
    } catch (error: any) {
      console.error('Error al obtener tickets del edificio:', error);
      return { exito: false, data: [] };
    }
  },

  // Cambiar el estado, añadir nota y opcionalmente evidencia fotográfica (Admin)
  updateTicketStatus: async (id_ticket: number, estado: string, nota_admin: string, foto?: File | null) => {
    try {
      let foto_resolucion_url = undefined;

      // Si se provee una foto de resolución, la subimos
      if (foto) {
        const fileExt = foto.name.split('.').pop();
        const fileName = `resoluciones/${id_ticket}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('tickets')
          .upload(fileName, foto);

        if (uploadError) throw new Error(`Error al subir evidencia: ${uploadError.message}`);

        const { data } = supabase.storage.from('tickets').getPublicUrl(fileName);
        foto_resolucion_url = data.publicUrl;
      }

      // Preparamos payload dinámico
      const updatePayload: any = { estado, nota_admin };
      if (foto_resolucion_url) updatePayload.foto_resolucion_url = foto_resolucion_url;

      const { error } = await supabase
        .from('tickets')
        .update(updatePayload)
        .eq('id_ticket', id_ticket);

      if (error) throw error;
      return { exito: true, mensaje: 'Ticket actualizado correctamente' };
    } catch (error: any) {
      console.error('Error al actualizar ticket:', error);
      return { exito: false, mensaje: error.message };
    }
  },

  // Calificar la atención del ticket (Usuario)
  rateTicket: async (id_ticket: number, calificacion: number, comentario_calificacion: string) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ calificacion, comentario_calificacion })
        .eq('id_ticket', id_ticket);

      if (error) throw error;
      return { exito: true, mensaje: 'Calificación enviada correctamente' };
    } catch (error: any) {
      console.error('Error al enviar calificación:', error);
      return { exito: false, mensaje: error.message };
    }
  }
};
