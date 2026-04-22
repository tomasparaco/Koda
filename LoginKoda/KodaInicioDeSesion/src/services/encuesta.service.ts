import { supabase } from '../lib/supabase';

export const EncuestaService = {
  crearEncuesta: async (
    codigo_edificio: string,
    pregunta: string,
    opciones: string[],
    fecha_cierre: string,
    archivo: File | null
  ) => {
    try {
      let documento_url = null;

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

      const { data: encuesta, error } = await supabase
        .from('encuestas')
        .insert([{ codigo_edificio, pregunta, opciones, fecha_cierre, documento_url, activa: true }])
        .select()
        .single();

      if (error) throw error;

      // --- LÓGICA DE CORREOS ACTUALIZADA ---
      const { data: propietarios } = await supabase
        .from('propietarios')
        .select('correo')
        .eq('codigo_edificio', codigo_edificio);

      if (propietarios && propietarios.length > 0) {
        const correos = propietarios.map(p => p.correo).filter(Boolean); // Filtramos nulls
        
        try {
          // Llamada real a tu Supabase Edge Function
          await supabase.functions.invoke('enviar-correos-votacion', {
            body: { 
              destinatarios: correos, 
              asunto: "Nueva Asamblea/Votación Abierta en Kuota", 
              pregunta: pregunta,
              fecha_cierre: fecha_cierre
            }
          });
          console.log("Notificación de correos enviada al servidor.");
        } catch (funcErr) {
          console.error("Error contactando al servicio de correos:", funcErr);
          // No bloqueamos la creación de la encuesta si el correo falla
        }
      }

      return { exito: true, data: encuesta };
    } catch (error: any) {
      return { exito: false, mensaje: error.message };
    }
  },

  getEncuestas: async (codigo_edificio: string) => {
    const { data: encuestas, error: errEncuestas } = await supabase
      .from('encuestas')
      .select('*')
      .eq('codigo_edificio', codigo_edificio)
      .order('creado_en', { ascending: false });

    if (errEncuestas) return [];

    const { data: votos } = await supabase
      .from('votos')
      .select('encuesta_id, opcion_seleccionada, apartamento');

    return encuestas.map(enc => {
      const votosDeEncuesta = votos?.filter(v => v.encuesta_id === enc.id) || [];
      return { ...enc, votos: votosDeEncuesta };
    });
  },

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

  cerrarEncuesta: async (encuesta_id: string) => {
    const { error } = await supabase
      .from('encuestas')
      .update({ activa: false })
      .eq('id', encuesta_id);
    return !error;
  }
};