import { supabase } from '../lib/supabase';

export const EncuestaService = {
  // 1. Crear encuesta con archivo y enviar notificación
  crearEncuesta: async (
    codigo_edificio: string,
    pregunta: string,
    opciones: string[],
    fecha_cierre: string,
    archivo: File | null
  ) => {
    try {
      let documento_url = null;

      // Subir archivo si existe
      if (archivo) {
        const fileExt = archivo.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `encuestas/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documentos')
          .upload(filePath, archivo);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('documentos')
          .getPublicUrl(filePath);
          
        documento_url = publicUrlData.publicUrl;
      }

      // Insertar encuesta en BDD
      const { data: encuesta, error } = await supabase
        .from('encuestas')
        .insert([{ codigo_edificio, pregunta, opciones, fecha_cierre, documento_url, activa: true }])
        .select()
        .single();

      if (error) throw error;

      // --- INTEGRACIÓN DE NOTIFICACIÓN POR CORREO ---
      // Obtenemos todos los correos del edificio
      const { data: propietarios } = await supabase
        .from('propietarios')
        .select('correo')
        .eq('codigo_edificio', codigo_edificio);

      if (propietarios && propietarios.length > 0) {
        const correos = propietarios.map(p => p.correo);
        console.log(`Simulando envío de correo a: ${correos.join(', ')} para la nueva encuesta: ${pregunta}`);
        
        // NOTA: Aquí debes enlazar tu API de correos real (ej. Resend, SendGrid o Supabase Edge Functions).
        /* Ejemplo de llamada real:
        await fetch('TU_URL_DE_EDGE_FUNCTION_PARA_CORREOS', {
          method: 'POST',
          body: JSON.stringify({ destinatarios: correos, asunto: "Nueva Votación Abierta", mensaje: pregunta })
        });
        */
      }

      return { exito: true, data: encuesta };
    } catch (error: any) {
      console.error("Error creando encuesta:", error);
      return { exito: false, mensaje: error.message };
    }
  },

  // 2. Obtener encuestas y sus votos
  getEncuestas: async (codigo_edificio: string) => {
    const { data: encuestas, error: errEncuestas } = await supabase
      .from('encuestas')
      .select('*')
      .eq('codigo_edificio', codigo_edificio)
      .order('creado_en', { ascending: false });

    if (errEncuestas) return [];

    // Obtenemos los votos para calcular gráficas (anonimizados en la vista)
    const { data: votos } = await supabase
      .from('votos')
      .select('encuesta_id, opcion_seleccionada, apartamento');

    return encuestas.map(enc => {
      const votosDeEncuesta = votos?.filter(v => v.encuesta_id === enc.id) || [];
      return { ...enc, votos: votosDeEncuesta };
    });
  },

  // 3. Registrar un voto
  votar: async (encuesta_id: string, apartamento: string, opcion_seleccionada: string) => {
    try {
      const { error } = await supabase
        .from('votos')
        .insert([{ encuesta_id, apartamento, opcion_seleccionada }]);

      if (error) {
        if (error.code === '23505') return { exito: false, mensaje: 'Ya registraste un voto para este apartamento.' };
        throw error;
      }
      return { exito: true };
    } catch (error: any) {
      return { exito: false, mensaje: error.message };
    }
  },

  // 4. Cerrar encuesta anticipadamente
  cerrarEncuesta: async (encuesta_id: string) => {
    const { error } = await supabase
      .from('encuestas')
      .update({ activa: false })
      .eq('id', encuesta_id);
    return !error;
  }
};