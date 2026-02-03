//
import { useState, useEffect } from 'react';
import { Mail, Lock, ArrowLeft, KeyRound } from 'lucide-react'; 
import kodaLogo from '../assets/LogoKoda4.png';
import { AuthService } from '../services/auth.service';
import { supabase } from '../lib/supabase'; 
import type { Propietario } from '../types';
import { useState } from 'react';
import { 
  DollarSign, 
  Wrench, 
  Clock, 
  CreditCard, 
  Home, 
  Wallet, 
  Users, 
  User,
  Megaphone,
  Vote,
  Calendar,
  CheckCircle
} from 'lucide-react';

function showDashCondo() {
  const [balance] = useState(250.00); // Monto en dólares a pagar
  const [bcvRate] = useState(45.50); // Tasa BCV del día
  const [activeTab, setActiveTab] = useState('inicio'); // Estado para la navegación
  const bolivares = balance * bcvRate;

  const isSolvent = balance === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 pb-20">
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        
        {/* 1. Estado de Cuenta */}
        <div className={`rounded-3xl p-8 shadow-2xl transition-all ${
          isSolvent 
            ? 'bg-gradient-to-br from-green-500 to-green-600' 
            : 'bg-gradient-to-br from-blue-600 to-blue-700'
        }`}>
          <div className="text-white/80 text-sm mb-2 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Estado de Cuenta
          </div>
          
          {isSolvent ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-12 h-12 text-white" />
                <h1 className="text-4xl text-white">Estás Solvente</h1>
              </div>
              <p className="text-white/90 text-lg">¡No tienes pagos pendientes!</p>
            </div>
          ) : (
            <>
              <div className="space-y-1 mb-4">
                <h1 className="text-5xl text-white">${balance.toFixed(2)}</h1>
                <p className="text-white/90 text-xl">
                  Bs. {bolivares.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              
              <div className="flex items-center justify-between mb-6">
                <div className="text-white/70 text-sm">
                  Tasa BCV: Bs. {bcvRate.toFixed(2)}
                </div>
              </div>

              <button className="w-full bg-white text-blue-700 py-4 rounded-2xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]">
                REPORTAR PAGO
              </button>
            </>
          )}
        </div>

        {/* 2. Botonera de Accesos Rápidos */}
        <div className="grid grid-cols-3 gap-4">
          <button className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 hover:bg-white/20 transition-all border border-white/20 shadow-lg">
            <div className="flex flex-col items-center gap-3">
              <div className="bg-blue-500 p-4 rounded-full">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-sm text-center">Reportar Falla</span>
            </div>
          </button>

          <button className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 hover:bg-white/20 transition-all border border-white/20 shadow-lg">
            <div className="flex flex-col items-center gap-3">
              <div className="bg-blue-500 p-4 rounded-full">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-sm text-center">Historial de Pagos</span>
            </div>
          </button>

          <button className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 hover:bg-white/20 transition-all border border-white/20 shadow-lg">
            <div className="flex flex-col items-center gap-3">
              <div className="bg-blue-500 p-4 rounded-full">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-sm text-center">Datos Bancarios</span>
            </div>
          </button>
        </div>

        {/* 3. Sección "Lo que está pasando" */}
        <div className="space-y-4">
          <h2 className="text-white text-xl px-2">Lo que está pasando</h2>
          
          {/* Comunicado Reciente */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 hover:bg-white/20 transition-all border border-white/20 shadow-lg cursor-pointer">
            <div className="flex items-start gap-4">
              <div className="bg-orange-500 p-3 rounded-xl shrink-0">
                <Megaphone className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-white mb-1">Mantenimiento de Ascensor</h3>
                <p className="text-white/70 text-sm">Se realizará mantenimiento preventivo el próximo lunes 10 de febrero. Se estima una duración de 4 horas.</p>
                <p className="text-white/50 text-xs mt-2">Hace 2 horas</p>
              </div>
            </div>
          </div>

          {/* Votación Activa */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="bg-purple-500 p-3 rounded-xl shrink-0">
                <Vote className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-white mb-1">Votación Activa</h3>
                <p className="text-white/70 text-sm mb-3">¿Estás de acuerdo con implementar cámaras de seguridad en el área de estacionamiento?</p>
                <button className="bg-blue-500 text-white px-6 py-2 rounded-xl hover:bg-blue-600 transition-all text-sm">
                  VOTAR AHORA
                </button>
              </div>
            </div>
          </div>

          {/* Próxima Asamblea */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 hover:bg-white/20 transition-all border border-white/20 shadow-lg cursor-pointer">
            <div className="flex items-start gap-4">
              <div className="bg-green-500 p-3 rounded-xl shrink-0">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-white mb-1">Próxima Asamblea</h3>
                <p className="text-white/70 text-sm">Domingo 15 de febrero, 2026 - 10:00 AM</p>
                <p className="text-white/50 text-xs mt-2">Salón de eventos del edificio</p>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Lista "Mis Gestiones" */}
        <div className="space-y-4">
          <h2 className="text-white text-xl px-2">Mis Gestiones</h2>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20 shadow-lg">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="text-white text-sm">Filtración en el techo</h4>
                  <p className="text-white/60 text-xs mt-1">Reportado el 28 de enero</p>
                </div>
                <span className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-xs border border-yellow-500/30">
                  En Proceso
                </span>
              </div>

              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-white text-sm">Luz del pasillo no funciona</h4>
                    <p className="text-white/60 text-xs mt-1">Reportado el 20 de enero</p>
                  </div>
                  <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-xs border border-green-500/30">
                    Resuelto
                  </span>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-white text-sm">Puerta principal dañada</h4>
                    <p className="text-white/60 text-xs mt-1">Reportado el 15 de enero</p>
                  </div>
                  <span className="bg-red-500/20 text-red-300 px-3 py-1 rounded-full text-xs border border-red-500/30">
                    Pendiente
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Barra de Navegación Inferior Fija */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 shadow-2xl">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-4 gap-2 py-3">
            <button 
              onClick={() => setActiveTab('inicio')}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all ${
                activeTab === 'inicio' 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <Home className="w-6 h-6" />
              <span className="text-xs">Inicio</span>
            </button>

            <button 
              onClick={() => setActiveTab('finanzas')}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all ${
                activeTab === 'finanzas' 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <Wallet className="w-6 h-6" />
              <span className="text-xs">Finanzas</span>
            </button>

            <button 
              onClick={() => setActiveTab('comunidad')}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all ${
                activeTab === 'comunidad' 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <Users className="w-6 h-6" />
              <span className="text-xs">Comunidad</span>
            </button>

            <button 
              onClick={() => setActiveTab('perfil')}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all ${
                activeTab === 'perfil' 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <User className="w-6 h-6" />
              <span className="text-xs">Perfil</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
    const nombreUsuario = propiedades[0].nombre;
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#2B4A7C] relative overflow-hidden font-sans">
         <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#1F3A5F] rounded-full opacity-50"></div>
            <div className="absolute bottom-1/3 left-1/4 w-64 h-64 bg-[#4A6FA5] rounded-3xl opacity-30 rotate-45"></div>
         </div>
         <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-[2rem] p-8 shadow-2xl text-center max-h-[90vh] overflow-y-auto">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🏢</span>
            </div>
            <h1 className="text-2xl font-bold text-[#2B4A7C] mb-2">¡Hola, {nombreUsuario}!</h1>
            <p className="text-gray-500 mb-6">Tienes {propiedades.length} propiedad(es) registrada(s)</p>
            <div className="space-y-4 mb-6">
                {propiedades.map((prop, index) => (
                    <div onclick="showDashCondo()" key={index} className="bg-gray-50 rounded-xl p-4 text-left border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-center py-2 border-b border-gray-200">
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Propiedad #{index + 1}</span>
                            <span className="font-bold text-[#4A7FDB] text-lg">{prop.apartamento}</span>
                        </div>
                        <div className="pt-2">
                            <p className="text-sm text-gray-500">Edificio:</p>
                            <p className="font-medium text-gray-700">{prop.edificios?.descripcion || 'No registrado'}</p>
                            <p className="text-xs text-gray-400 mt-1">{prop.edificios?.direccion}</p>
                        </div>
                    </div>
                ))}
            </div>
            <button onClick={handleLogout} className="w-full py-3 bg-red-50 text-red-500 font-semibold rounded-xl hover:bg-red-100 transition-colors">
                Cerrar Sesión
            </button>
         </div>
      </div>
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