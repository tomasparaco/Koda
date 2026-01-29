import { supabase } from '../lib/supabase';
import type { RespuestaLogin, Propietario } from '../types'; 
export const AuthService = {
  
  // 1. Login
  login: async (email: string, password: string): Promise<RespuestaLogin> => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) return { exito: false, mensaje: 'Credenciales incorrectas.' };
      if (!authData.user) return { exito: false, mensaje: 'Usuario no encontrado.' };

      const { data: misPropiedades, error: dbError } = await supabase
        .from('propietarios')
        .select(`*, edificios ( descripcion, direccion )`)
        .eq('id_auth', authData.user.id);

      if (dbError) return { exito: false, mensaje: 'Error al buscar datos.' };

      return { exito: true, datos: misPropiedades as any };

    } catch (error) {
      return { exito: false, mensaje: 'Error de red.' };
    }
  },

  // 2. Logout
  logout: async () => {
    await supabase.auth.signOut();
  },
};