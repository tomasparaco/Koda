import { supabase } from '../lib/supabase';
import type { RespuestaLogin } from '../types'; 

const isAbortError = (err: any) => {
    return err?.name === 'AbortError' || err?.message?.includes('AbortError');
};

export const AuthService = {
  
  // 1. Login
  login: async (email: string, password: string): Promise<RespuestaLogin> => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (isAbortError(authError)) {
            return { exito: false, mensaje: 'Conexión interrumpida. Intenta de nuevo.' };
        }
        return { exito: false, mensaje: 'Credenciales incorrectas.' };
      }

      if (!authData.user) return { exito: false, mensaje: 'Usuario no encontrado.' };

      const misPropiedades = await AuthService.getMisPropiedades(authData.user.id);
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

  // 4. Update Password
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

  // 5. Helper Propiedades
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
  
  // 6. Directorio Vecinos
  getDirectorioVecinos: async (codigoEdificio: string) => {
    try {
      const { data, error } = await supabase
        .from('propietarios')
        .select('*, edificios(descripcion)')
        .eq('codigo_edificio', codigoEdificio)
        .neq('rol', 'admin')
        .order('apartamento', { ascending: true });

      if (error) {
        console.error("Error al obtener directorio:", error);
        return [];
      }
      return data;
    } catch (e) {
      return [];
    }
  },

  // 7. Actualizar Teléfono (¡Ahora sincronizado para todos los apartamentos!)
  // Recibimos 'userId' (string) en lugar de 'id_propietario'
  updatePhone: async (userId: string, nuevoCelular: string): Promise<{ exito: boolean; mensaje: string }> => {
    try {
      const { error } = await supabase
        .from('propietarios')
        .update({ celular: nuevoCelular })
        .eq('id_auth', userId); // <-- CLAVE: Actualiza TODAS las filas de este usuario

      if (error) {
        console.error("Error al actualizar teléfono:", error.message);
        return { exito: false, mensaje: 'Hubo un problema al actualizar el teléfono.' };
      }
      
      return { exito: true, mensaje: 'Teléfono actualizado en todas tus propiedades.' };
      
    } catch (error: any) {
      console.error("Catch al actualizar teléfono:", error);
      return { exito: false, mensaje: 'Error de conexión inesperado.' };
    }
  }

};