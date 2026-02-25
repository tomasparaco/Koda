//
import { supabase } from '../lib/supabase';
import type { RespuestaLogin } from '../types'; 

// Helper para ignorar errores "AbortError" (son inofensivos pero molestos)
const isAbortError = (err: any) => {
    return err?.name === 'AbortError' || err?.message?.includes('AbortError');
};

export const AuthService = {
  
  // 1. Login (¡Ahora blindado contra caídas!)
  login: async (email: string, password: string): Promise<RespuestaLogin> => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (isAbortError(authError)) {
            // Si Supabase aborta, asumimos fallo leve de red, pero no crash
            return { exito: false, mensaje: 'Conexión interrumpida. Intenta de nuevo.' };
        }
        return { exito: false, mensaje: 'Credenciales incorrectas.' };
      }

      if (!authData.user) return { exito: false, mensaje: 'Usuario no encontrado.' };

      // Buscar propiedades
      const misPropiedades = await AuthService.getMisPropiedades(authData.user.id);
      
      // Si falla la búsqueda de propiedades, no bloqueamos el login, devolvemos array vacío
      const propiedadesFinal = misPropiedades || [];

      return { exito: true, datos: propiedadesFinal as any };

    } catch (error: any) {
      console.error("Login Error Catch:", error);
      if (isAbortError(error)) return { exito: false, mensaje: 'Reintenta, por favor.' };
      return { exito: false, mensaje: 'Error de red inesperado.' };
    }
  },

  // 2. Logout
  logout: async () => {
    await supabase.auth.signOut();
  },

  // 3. Reset Password
  resetPassword: async (email: string): Promise<{ exito: boolean; mensaje: string }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin, 
      });

      if (error) return { exito: false, mensaje: error.message };
      return { exito: true, mensaje: 'Revisa tu correo para restablecer la contraseña.' };
    } catch (error) {
      return { exito: false, mensaje: 'Error al intentar enviar el correo.' };
    }
  },

  // 4. Update Password (Con tu protección existente)
  updatePassword: async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) {
        if (isAbortError(error)) {
             return { exito: false, mensaje: 'Interrupción leve. Dale al botón de nuevo.' };
        }
        return { exito: false, mensaje: error.message };
      }
      
      return { exito: true, mensaje: 'Contraseña actualizada con éxito.' };
      
    } catch (error: any) {
      console.error("Update Pass Error Catch:", error);
      if (isAbortError(error)) return { exito: false, mensaje: 'Reintenta por favor.' };
      return { exito: false, mensaje: 'Error de conexión.' };
    }
  },

  // 5. Helper
  getMisPropiedades: async (userId: string) => {
    try {
        const { data, error } = await supabase
            .from('propietarios')
            .select('*, edificios ( descripcion, direccion )')
            .eq('id_auth', userId);
        
        if (error) return null;
        return data;
    } catch (e) {
        return null;
    }
  },
  
// 6. Obtener el directorio filtrado por el edificio del Admin
  getDirectorioVecinos: async (codigoEdificio: string) => {
    try {
      const { data, error } = await supabase
        .from('propietarios')
        .select('*, edificios(descripcion)') // Traemos los datos y el nombre del edificio
        .eq('codigo_edificio', codigoEdificio) // 1. FILTRO CLAVE: Solo de este edificio
        .neq('rol', 'admin') // 2. (Opcional) No mostramos a la Junta en la lista de vecinos
        .order('apartamento', { ascending: true }); // Los ordenamos por número de apartamento

      if (error) {
        console.error("Error al obtener directorio:", error);
        return [];
      }
      return data;
    } catch (e) {
      return [];
    }
  }


};