//
import React, { useState, useEffect, useMemo } from 'react';
import { Mail, Lock, ArrowLeft, KeyRound, Eye, EyeOff } from 'lucide-react';
import KuotaLogo from '../assets/LogoKuota4.png';
import { AuthService } from '../services/auth.service';
import { supabase } from '../lib/supabase';
import type { Propietario } from '../types';
import DashboardLayout from './DashboardAdmin/DashboardLayout';
import UserDashboard from './components/UserDashboard';
import CondominioSelector from './components/CondominioSelector';
import AdministradoraPanel from './Administradora/AdministradoraPanel';
import { AdministradoraService, type EdificioAdministrado } from '../services/administradora.service';
import { ThemeToggle } from './theme/ThemeContext';
import { motion, type Variants } from 'motion/react';
// componente auxiliar que dispara la animación cuando entra en el viewport (scroll)
import AnimatedSection from './components/AnimatedSection';
import { BeamsBackground } from './components/ui/beams-background';

export const container: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,    // tiempo entre cada hijo
      when: 'beforeChildren',   // primero el contenedor, luego los hijos
    },
  },
};

export const item: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

export default function App() {

  // --- Estados ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [propiedades, setPropiedades] = useState<Propietario[]>([]);
  const [selectedPropiedad, setSelectedPropiedad] = useState<Propietario | null>(null);

  // Administradora multi-edificio
  const [edificiosAdmin, setEdificiosAdmin] = useState<EdificioAdministrado[]>([]);
  const [verPanelAdmin, setVerPanelAdmin] = useState(false);
  const [edificioGestionado, setEdificioGestionado] = useState<string | null>(null);
  const haySesion = propiedades.length > 0 || edificiosAdmin.length > 0;
  // Si solo es administradora (sin apartamentos), su pantalla principal es el panel
  const mostrarPanelAdmin = edificiosAdmin.length > 0 && (verPanelAdmin || propiedades.length === 0);

  const [isResetMode, setIsResetMode] = useState(false);
  const [isUpdateFlow, setIsUpdateFlow] = useState(false);

  // A key that changes whenever we switch to a different screen/view; used to trigger
  // a CSS animation on the container each time the user navigates.
  const viewKey = useMemo(() => {
    if (haySesion && !isUpdateFlow) {
      if (edificioGestionado) return `admin-edif-${edificioGestionado}`;
      if (mostrarPanelAdmin) return 'admin-panel';
      if (!selectedPropiedad) return 'selector';
      return `${selectedPropiedad.rol}-${selectedPropiedad.id_propietario}`;
    }
    if (isUpdateFlow) return 'update';
    if (isResetMode) return 'reset';
    return 'login';
  }, [haySesion, edificioGestionado, mostrarPanelAdmin, selectedPropiedad, isUpdateFlow, isResetMode]);
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
          if (!haySesion) {
            const [data, admin] = await Promise.all([
              AuthService.getMisPropiedades(session.user.id),
              AdministradoraService.getEdificiosAdministrados(session.user.id),
            ]);
            if (data) setPropiedades(data as any);
            setEdificiosAdmin(admin);
          }
        }, 500);
      }
    });

    return () => subscription.unsubscribe();
  }, [haySesion, isUpdateFlow]);

  const recargarEdificiosAdmin = async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) setEdificiosAdmin(await AdministradoraService.getEdificiosAdministrados(data.user.id));
  };

  // --- HANDLERS (Con protección "finally" para no quedarse pegados) ---

  // 1. Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');

    try {
      if (!email || !password) throw new Error("Por favor completa ambos campos");

      const resultado = await AuthService.login(email, password);

      if (resultado.exito && resultado.datos) {
        setEdificiosAdmin(resultado.edificiosAdmin || []);
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
    setSelectedPropiedad(null);
    setEdificiosAdmin([]);
    setVerPanelAdmin(false);
    setEdificioGestionado(null);
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
  // Instead of returning directly from each branch we build the content and
  // render it inside a wrapper with a key. Changing the key forces React to
  // remount the container which in turn retriggers the CSS animation.
  let contenido: React.ReactNode;

  if (haySesion && !isUpdateFlow) {
    if (edificioGestionado) {
      // La administradora entra a un edificio: misma vista que la junta de condominio
      const adm = edificiosAdmin.find((e) => e.codigo_edificio === edificioGestionado);
      const propiedadAdmin: Propietario = {
        id_propietario: -1,
        nombre: adm?.nombre || 'Administradora',
        correo: adm?.correo || '',
        apartamento: '',
        alicuota: 0,
        id_auth: '',
        rol: 'admin',
        codigo_edificio: edificioGestionado,
        edificios: adm?.edificio,
      };
      contenido = (
        <DashboardLayout
          propiedad={propiedadAdmin}
          esAdministradora
          onLogout={handleLogout}
          onBackToSelector={() => { setEdificioGestionado(null); setVerPanelAdmin(true); recargarEdificiosAdmin(); }}
        />
      );
    } else if (mostrarPanelAdmin) {
      contenido = (
        <AdministradoraPanel
          edificios={edificiosAdmin}
          onGestionar={(codigo) => setEdificioGestionado(codigo)}
          onLogout={handleLogout}
          onIrAMisPropiedades={propiedades.length > 0 ? () => { setVerPanelAdmin(false); setSelectedPropiedad(null); } : undefined}
          onEdificiosActualizados={recargarEdificiosAdmin}
        />
      );
    } else if (!selectedPropiedad) {
      // Si no hay propiedad seleccionada, pedimos al usuario que elija
      contenido = (
        <CondominioSelector
          propiedades={propiedades}
          onSelect={(p) => setSelectedPropiedad(p)}
          onLogout={handleLogout}
          edificiosAdministrados={edificiosAdmin.length}
          onAbrirPanelAdmin={() => setVerPanelAdmin(true)}
        />
      );
    } else {
      const propiedadActiva = selectedPropiedad;

      // Renderizamos distinto UI según el rol del usuario
      if (propiedadActiva.rol === 'admin') {
        contenido = (
          <DashboardLayout
            propiedad={propiedadActiva}
            onLogout={handleLogout}
            onBackToSelector={() => setSelectedPropiedad(null)}
          />
        );
      } else {
        // Por defecto mostramos el dashboard de vecino
        contenido = (
          <UserDashboard
            userData={propiedadActiva}
            onLogout={handleLogout}
            onBackToSelector={() => setSelectedPropiedad(null)}
          />
        );
      }
    }
  } else {
    let titulo = 'Inicia Sesión';
    let handleSubmit = handleLogin;
    if (isUpdateFlow) { titulo = 'Nueva Contraseña'; handleSubmit = handleUpdatePassword; }
    else if (isResetMode) { titulo = 'Recuperar Cuenta'; handleSubmit = handleResetRequest; }

    contenido = (
      <BeamsBackground intensity="medium" className="flex items-center justify-center font-sans min-h-screen">
        <div className="fixed top-4 right-4 z-20"><ThemeToggle className="bg-kbg/70 backdrop-blur" /></div>
        <div className="w-full max-w-sm mx-4 z-10">
          <div className="bg-kbg border border-slate-800/60 rounded-3xl p-8 shadow-2xl">
            <div className="flex flex-col items-center mb-8">
              <div className="w-24 h-24 rounded-2xl bg-kbg border border-slate-700 flex items-center justify-center mb-0 shadow-lg p-3 hover:scale-105 transition-transform duration-300">
                <img src={KuotaLogo} alt="Kuota Logo" className="w-full h-full object-contain filter drop-shadow-md" />
              </div>
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight mb-1 mt-4">Kuota</h1>
              <h2 className="text-sm font-medium text-slate-400">{titulo}</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isUpdateFlow && (
                <>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2"><KeyRound className="w-5 h-5 text-slate-500" /></div>
                    <input type={showNewPassword ? "text" : "password"} placeholder="Nueva contraseña" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="theme-fixed w-full pl-12 pr-12 py-3.5 bg-white text-slate-900 placeholder-slate-400 rounded-xl focus:bg-white outline-none focus:ring-2 focus:ring-blue-500 border border-slate-200 transition-all" />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2"><Lock className="w-5 h-5 text-slate-500" /></div>
                    <input type={showConfirmPassword ? "text" : "password"} placeholder="Confirmar contraseña" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="theme-fixed w-full pl-12 pr-12 py-3.5 bg-white text-slate-900 placeholder-slate-400 rounded-xl focus:bg-white outline-none focus:ring-2 focus:ring-blue-500 border border-slate-200 transition-all" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </>
              )}
              {!isUpdateFlow && (
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2"><Mail className="w-5 h-5 text-slate-500" /></div>
                  <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="theme-fixed w-full pl-12 pr-4 py-3.5 bg-white text-slate-900 placeholder-slate-400 rounded-xl focus:bg-white outline-none focus:ring-2 focus:ring-blue-500 border border-slate-200 transition-all" />
                </div>
              )}
              {!isUpdateFlow && !isResetMode && (
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2"><Lock className="w-5 h-5 text-slate-500" /></div>
                  <input type={showPassword ? "text" : "password"} placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required className="theme-fixed w-full pl-12 pr-12 py-3.5 bg-white text-slate-900 placeholder-slate-400 rounded-xl focus:bg-white outline-none focus:ring-2 focus:ring-blue-500 border border-slate-200 transition-all" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              )}
              
              {error && <div className="p-3 bg-red-950/30 border border-red-900/50 text-red-400 text-sm rounded-xl text-center">{error}</div>}
              {successMsg && <div className="p-3 bg-green-950/30 border border-green-900/50 text-green-400 text-sm rounded-xl text-center">{successMsg}</div>}

              <button type="submit" disabled={loading} className="w-full mt-2 py-3.5 bg-slate-100 text-slate-900 font-semibold rounded-xl hover:bg-white active:scale-[0.98] transition-all disabled:opacity-50">
                {loading ? 'Procesando...' : (isUpdateFlow ? 'Guardar Nueva Contraseña' : (isResetMode ? 'Enviar Enlace' : 'Iniciar Sesión'))}
              </button>
            </form>

            {!isUpdateFlow && (
              <div className="mt-8 text-center space-y-3">
                {!isResetMode ? (
                  <>
                    <button type="button" onClick={toggleMode} className="text-slate-400 text-sm hover:text-slate-200 transition-colors">¿Olvidaste tu contraseña?</button>
                  </>
                ) : (
                  <button type="button" onClick={toggleMode} className="flex items-center justify-center w-full text-slate-400 text-sm hover:text-slate-200 transition-colors gap-2"><ArrowLeft className="w-4 h-4" /> Volver al inicio</button>
                )}
              </div>
            )}
          </div>
        </div>
      </BeamsBackground>
    );
  }

  // envolvemos el contenido en un motion.div para que cada vez que cambie
  // `viewKey` (navegación entre pantallas) se remonte el contenedor y se
  // reproduzca el slide-up + fade-in con stagger. Anteriormente usábamos la
  // clase `animate-rise` de Tailwind, ahora aprovechamos los `variants` ya
  // declarados arriba.
  return (
    <motion.div
      key={viewKey}
      variants={container}
      initial="hidden"
      animate="visible"
      className="min-h-screen"
    >
      {contenido}
    </motion.div>
  );
}


