//
import { useState, useEffect } from 'react';
import { Mail, Lock, ArrowLeft, KeyRound } from 'lucide-react'; 
import kodaLogo from '../assets/LogoKoda4.png';
import { AuthService } from '../services/auth.service';
import { supabase } from '../lib/supabase'; 
import type { Propietario } from '../types';
import DashboardLayout from './components/DashboardLayout';
import UserDashboard from './components/UserDashboard';


export default function App() {

  // --- Estados ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState(''); 
  const [loading, setLoading] = useState(false);
  
  const [propiedades, setPropiedades] = useState<Propietario[]>([]); 
  
  const [isResetMode, setIsResetMode] = useState(false);
  const [isUpdateFlow, setIsUpdateFlow] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');



  
  // --- EFECTO: Detectar Link de Correo ---
  useEffect(() => {
    // 1. Chequeo manual de URL
    const hash = window.location.hash;
    const query = window.location.search;
    if (hash.includes('type=recovery') || query.includes('type=recovery')) {
      setIsUpdateFlow(true);
    }

    // 2. Listener de Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsUpdateFlow(true);
      }
      
      // Solo cargamos propiedades si NO estamos en medio de un reseteo (para evitar conflictos)
      if (event === 'SIGNED_IN' && session && !isUpdateFlow) {
        // Pequeño delay para evitar choques con el login manual
        setTimeout(async () => {
            if (propiedades.length === 0) {
                const data = await AuthService.getMisPropiedades(session.user.id);
                if (data) setPropiedades(data as any);
            }
        }, 500);
      }
    });

    return () => subscription.unsubscribe();
  }, [propiedades.length, isUpdateFlow]);

  // --- HANDLERS (Con protección "finally" para no quedarse pegados) ---

  // 1. Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    
    try {
        if (!email || !password) throw new Error("Por favor completa ambos campos");

        const resultado = await AuthService.login(email, password);

        if (resultado.exito && resultado.datos) {
            setPropiedades(resultado.datos); 
        } else {
            setError(resultado.mensaje || 'Error desconocido');
        }
    } catch (err: any) {
        setError(err.message || "Error inesperado en la aplicación");
    } finally {
        setLoading(false); // <--- ESTO ASEGURA QUE SE DESBLOQUEE SIEMPRE
    }
  };

  // 2. Enviar correo de recuperación
  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccessMsg('');

    try {
        if (!email) throw new Error("Ingresa tu correo.");
        
        const resultado = await AuthService.resetPassword(email);
        if (resultado.exito) setSuccessMsg(resultado.mensaje);
        else setError(resultado.mensaje || 'Error');
    } catch (err: any) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  // 3. Guardar la nueva contraseña
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');

    try {
        if (newPassword !== confirmPassword) throw new Error('Las contraseñas no coinciden.');
        if (newPassword.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');

        const resultado = await AuthService.updatePassword(newPassword);
        
        if (resultado.exito) {
            alert("¡Contraseña actualizada! Bienvenido.");
            setIsUpdateFlow(false);
            setIsResetMode(false);
            setSuccessMsg('');
            // Recargamos la página para limpiar cualquier estado "basura" de la URL
            window.location.href = window.location.origin;
        } else {
            setError(resultado.mensaje || 'Error al actualizar');
        }
    } catch (err: any) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  // 4. Logout
  const handleLogout = () => {
    AuthService.logout(); 
    setPropiedades([]);
    setError('');         
    setPassword('');
    setIsResetMode(false);
    setIsUpdateFlow(false);
    // Limpiamos la URL para quitar el hash de recuperación
    window.history.replaceState(null, '', window.location.pathname);
  };

  const toggleMode = () => {
    setIsResetMode(!isResetMode);
    setError(''); setSuccessMsg(''); setPassword('');
  };

  // --- VISTAS --- (Sin cambios visuales, solo lógica)
  if (propiedades.length > 0 && !isUpdateFlow) {
    // Tomamos la primera propiedad por defecto (o podrías crear un selector de propiedades previo)
    const propiedadActiva = propiedades[0];

    // Renderizamos distinto UI según el rol del usuario
    if (propiedadActiva.rol === 'admin') {
      return (
        <DashboardLayout 
          propiedad={propiedadActiva} 
          onLogout={handleLogout} 
        />
      );
    }

    // Por defecto mostramos el dashboard de vecino
    return (
      <UserDashboard userData={propiedadActiva} onLogout={handleLogout} />
    );
  }

  let titulo = 'Inicia Sesión';
  let handleSubmit = handleLogin;
  if (isUpdateFlow) { titulo = 'Nueva Contraseña'; handleSubmit = handleUpdatePassword; }
  else if (isResetMode) { titulo = 'Recuperar Cuenta'; handleSubmit = handleResetRequest; }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#2B4A7C] relative overflow-hidden font-sans">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#1F3A5F] rounded-full opacity-50"></div>
        <div className="absolute top-1/4 -right-32 w-80 h-80 bg-[#3D5A80] rounded-full opacity-40"></div>
        <div className="absolute bottom-1/3 left-1/4 w-64 h-64 bg-[#4A6FA5] rounded-3xl opacity-30 rotate-45"></div>
        <div className="absolute bottom-20 -left-20 w-48 h-48 bg-[#6B8EC7] rounded-full opacity-40"></div>
        <div className="absolute -bottom-20 right-20 w-56 h-56 bg-[#5074A8] rounded-2xl opacity-25 rotate-12"></div>
        <div className="absolute bottom-10 right-10">
          <div className="w-16 h-16 relative"><div className="absolute inset-0 bg-white opacity-60 rounded-full blur-md"></div></div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="bg-gradient-to-b from-[#6BA3D8] to-[#4A7FDB] rounded-[2.5rem] p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-28 h-28 rounded-3xl bg-white flex items-center justify-center mb-4 shadow-lg p-3">
              <img src={kodaLogo} alt="Koda Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Koda</h1>
            <h2 className="text-xl font-semibold text-white tracking-wide">{titulo}</h2>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-xl">
            <form onSubmit={handleSubmit}>
                {isUpdateFlow && (
                    <>
                        <div className="mb-4 relative">
                            <div className="absolute left-4 top-1/2 transform -translate-y-1/2"><KeyRound className="w-5 h-5 text-[#4A7FDB]" /></div>
                            <input type="password" placeholder="Nueva contraseña" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="w-full pl-12 pr-4 py-3.5 bg-gray-100 rounded-xl focus:bg-white outline-none focus:border-[#4A7FDB] border-2 border-transparent transition-all" />
                        </div>
                        <div className="mb-4 relative">
                            <div className="absolute left-4 top-1/2 transform -translate-y-1/2"><Lock className="w-5 h-5 text-[#4A7FDB]" /></div>
                            <input type="password" placeholder="Confirmar contraseña" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full pl-12 pr-4 py-3.5 bg-gray-100 rounded-xl focus:bg-white outline-none focus:border-[#4A7FDB] border-2 border-transparent transition-all" />
                        </div>
                    </>
                )}
                {!isUpdateFlow && (
                    <div className="mb-4 relative">
                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2"><Mail className="w-5 h-5 text-[#4A7FDB]" /></div>
                        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full pl-12 pr-4 py-3.5 bg-gray-100 rounded-xl focus:bg-white outline-none focus:border-[#4A7FDB] border-2 border-transparent transition-all" />
                    </div>
                )}
                {!isUpdateFlow && !isResetMode && (
                  <div className="mb-4 relative">
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2"><Lock className="w-5 h-5 text-[#4A7FDB]" /></div>
                      <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full pl-12 pr-4 py-3.5 bg-gray-100 rounded-xl focus:bg-white outline-none focus:border-[#4A7FDB] border-2 border-transparent transition-all" />
                  </div>
                )}
                {error && <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-500 text-sm rounded-xl text-center">{error}</div>}
                {successMsg && <div className="mb-4 p-3 bg-green-50 border border-green-100 text-green-600 text-sm rounded-xl text-center">{successMsg}</div>}

                <button type="submit" disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-[#4A7FDB] to-[#5DA9E8] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70">
                    {loading ? 'Procesando...' : (isUpdateFlow ? 'Guardar Nueva Contraseña' : (isResetMode ? 'Enviar Enlace' : 'Iniciar Sesión'))}
                </button>
            </form>

            {!isUpdateFlow && (
                <div className="mt-6 text-center space-y-2">
                {!isResetMode ? (
                    <>
                    <p className="text-gray-600 text-sm">No tienes cuenta? <button className="text-[#4A7FDB] font-semibold hover:underline">Regístrate</button></p>
                    <button type="button" onClick={toggleMode} className="text-[#4A7FDB] text-sm hover:underline font-medium">Olvidaste tu contraseña?</button>
                    </>
                ) : (
                    <button type="button" onClick={toggleMode} className="flex items-center justify-center w-full text-gray-500 text-sm hover:text-[#4A7FDB] transition-colors gap-2"><ArrowLeft className="w-4 h-4" /> Volver al inicio</button>
                )}
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}