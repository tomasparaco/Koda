import { supabase } from '../lib/supabase';

export interface DocumentoCondominio {
  id?: number;
  codigo_edificio: string;
  titulo: string;
  url_archivo: string;
  tamano_archivo: string;
  formato: string;
  created_at?: string;
}

export interface ContactoEmergencia {
  id?: number;
  codigo_edificio: string;
  nombre: string;
  telefono: string;
  created_at?: string;
}
export interface Comunicado {
  id?: string;
  codigo_edificio: string;
  titulo: string;
  cuerpo: string;
  categoria: 'Mantenimiento' | 'Informativo' | 'Urgente';
  imagen_url?: string | null;
  autor_id: string;
  creado_en?: string;
}

export interface EventoCondominio {
  id?: string;
  codigo_edificio: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  tipo: 'Asamblea' | 'Mantenimiento' | 'Social';
  notificar_ahora: boolean;
}
  
export const ComunidadService = {
  // CONTACTOS DE EMERGENCIA
  getContactos: async (codigo_edificio: string) => {
    try {
      const { data, error } = await supabase
        .from('contactos_emergencia')
        .select('*')
        .eq('codigo_edificio', codigo_edificio)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return { exito: true, data };
    } catch (error: any) {
      console.error('Error fetching contactos:', error);
      return { exito: false, data: [] };
    }
  },

  addContacto: async (contacto: ContactoEmergencia) => {
    try {
      const { data, error } = await supabase
        .from('contactos_emergencia')
        .insert([contacto])
        .select();

      if (error) throw error;
      return { exito: true, data: data[0] };
    } catch (error: any) {
      console.error('Error adding contacto:', error);
      return { exito: false, mensaje: error.message };
    }
  },

  deleteContacto: async (id: number) => {
    try {
      const { error } = await supabase
        .from('contactos_emergencia')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { exito: true };
    } catch (error: any) {
      console.error('Error deleting contacto:', error);
      return { exito: false, mensaje: error.message };
    }
  },

  // DOCUMENTOS Y NORMATIVAS
  getDocumentos: async (codigo_edificio: string) => {
    try {
      const { data, error } = await supabase
        .from('documentos_condominio')
        .select('*')
        .eq('codigo_edificio', codigo_edificio)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { exito: true, data };
    } catch (error: any) {
      console.error('Error fetching documentos:', error);
      return { exito: false, data: [] };
    }
  },

  addDocumento: async (documentoInfo: Omit<DocumentoCondominio, 'url_archivo' | 'tamano_archivo' | 'formato'>, file: File) => {
    try {
      // 1. Subir archivo al bucket 'documentos'
      const fileExt = file.name.split('.').pop();
      const fileName = `${documentoInfo.codigo_edificio}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 2. Obtener URL pública
      const { data: publicUrlData } = supabase.storage
        .from('documentos')
        .getPublicUrl(fileName);

      const url_archivo = publicUrlData.publicUrl;

      // 3. Formatear tamaño
      const sizeBytes = file.size;
      const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(1);
      const sizeKB = (sizeBytes / 1024).toFixed(0);
      const tamano_archivo = sizeBytes > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;

      // 4. Formato
      const formato = file.type.includes('pdf') ? 'PDF' : file.type.split('/')[1]?.toUpperCase() || 'FILE';

      // 5. Insertar en base de datos
      const documentoCompleto: DocumentoCondominio = {
        ...documentoInfo,
        url_archivo,
        tamano_archivo,
        formato
      };

      const { data, error } = await supabase
        .from('documentos_condominio')
        .insert([documentoCompleto])
        .select();

      if (error) throw error;
      return { exito: true, data: data[0] };
    } catch (error: any) {
      console.error('Error adding documento:', error);
      return { exito: false, mensaje: error.message };
    }
  },

  deleteDocumento: async (documento_id: number, url_archivo: string) => {
    try {
      // 1. Extraer path del bucket desde la URL
      // supabase url format usually ends with /storage/v1/object/public/documentos/{path}
      const pathParts = url_archivo.split('/documentos/');
      if (pathParts.length > 1) {
        const filePath = pathParts[1];
        // 2. Eliminar de Supabase Storage
        await supabase.storage.from('documentos').remove([filePath]);
      }

      // 3. Eliminar registro en base de datos
      const { error } = await supabase
        .from('documentos_condominio')
        .delete()
        .eq('id', documento_id);

      if (error) throw error;
      return { exito: true };
    } catch (error: any) {
      console.error('Error deleting documento:', error);
      return { exito: false, mensaje: error.message };
    }
  },

  // COMUNICADOS OFICIALES
  getComunicados: async (codigo_edificio: string) => {
    try {
      const { data, error } = await supabase
        .from('comunicados')
        .select('*')
        .eq('codigo_edificio', codigo_edificio)
        .order('creado_en', { ascending: false });

      if (error) throw error;
      return { exito: true, data };
    } catch (error: any) {
      console.error('Error fetching comunicados:', error);
      return { exito: false, data: [] };
    }
  },

  crearComunicado: async (
    comunicadoInfo: Omit<Comunicado, 'id' | 'imagen_url' | 'autor_id' | 'creado_en'>, 
    file: File | null
  ) => {
    try {
      // 1. Obtener el ID del administrador actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      let imagen_url = null;

      // 2. Subir archivo al bucket 'comunicados' si existe
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${comunicadoInfo.codigo_edificio}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('comunicados')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Obtener URL pública
        const { data: publicUrlData } = supabase.storage
          .from('comunicados')
          .getPublicUrl(fileName);

        imagen_url = publicUrlData.publicUrl;
      }

      // 3. Insertar en la base de datos
      const comunicadoCompleto: Comunicado = {
        ...comunicadoInfo,
        imagen_url,
        autor_id: user.id
      };

      const { data, error } = await supabase
        .from('comunicados')
        .insert([comunicadoCompleto])
        .select();

      if (error) throw error;
      return { exito: true, data: data[0] };
    } catch (error: any) {
      console.error('Error al crear comunicado:', error);
      return { exito: false, mensaje: error.message };
    }
  },

  getEventos: async (codigo_edificio: string) => {
    const { data, error } = await supabase
      .from('eventos')
      .select('*')
      .eq('codigo_edificio', codigo_edificio)
      .order('fecha', { ascending: true });
    if (error) return { exito: false, data: [] };
    return { exito: true, data };
  },

  crearEvento: async (evento: EventoCondominio) => {
    try {
      const { data, error } = await supabase
        .from('eventos')
        .insert([evento])
        .select();
      if (error) throw error;
      return { exito: true, data: data[0] };
    } catch (error: any) {
      return { exito: false, mensaje: error.message };
    }
  },
  
};
