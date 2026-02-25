import { useState } from 'react';
import { User, Mail, Phone, Home, ChevronLeft, Shield, Bell, Key, Edit2, Check, X, Loader2, Lock, ChevronDown } from 'lucide-react';
import type { Propietario } from '../../types';
import { AuthService } from '../../services/auth.service';

interface UserProfileProps {
  userData: Propietario;
  onBack: () => void;
}

const PREFIJOS = ['0424', '0414', '0422', '0412', '0426'];

export default function UserProfile({ userData, onBack }: UserProfileProps) {
  const getInitialData = () => {
    const celular = userData?.celular || '';
    const celularLimpio = celular.replace(/-/g, '');
    
    const prefijoEncontrado = PREFIJOS.find(p => celularLimpio.startsWith(p));
    
    if (prefijoEncontrado) {
      return { 
        prefijo: prefijoEncontrado, 
        cuerpo: celularLimpio.slice(prefijoEncontrado.length) 
      };
    }
    return { prefijo: '0424', cuerpo: celularLimpio };
  };

  const initialData = getInitialData();

  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [prefijo, setPrefijo] = useState(initialData.prefijo);
  const [cuerpoNumero, setCuerpoNumero] = useState(initialData.cuerpo);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPhone, setCurrentPhone] = useState(userData?.celular || 'No registrado');
  const [mensajeExito, setMensajeExito] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSavePhone = async () => {
    if (!/^\d+$/.test(cuerpoNumero)) {
      alert('El número solo puede contener dígitos numéricos.');
      return;
    }

    if (cuerpoNumero.length !== 7) {
      alert(`El número debe tener exactamente 7 dígitos (actualmente tiene ${cuerpoNumero.length}).`);
      return;
    }
    
    setIsLoading(true);

    const telefonoCompleto = `${prefijo}-${cuerpoNumero}`;
    
    const response = await AuthService.updatePhone(userData.id_auth, telefonoCompleto);
    
    if (response.exito) {
      setCurrentPhone(telefonoCompleto);
      setIsEditingPhone(false);
      setMensajeExito('¡Actualizado en todas tus cuentas!');
      setTimeout(() => setMensajeExito(''), 3000);
    } else {
      alert(response.mensaje);
    }
    setIsLoading(false);
  };

  const handleChangeNumero = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= 7) {
      setCuerpoNumero(val);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-fade-in pb-32">
      {/* Cabecera */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={onBack}
          className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all backdrop-blur-lg"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <h2 className="text-white text-2xl font-bold">Mi Perfil</h2>
      </div>

      {/* Tarjeta Principal */}
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 border border-white/20 shadow-xl text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full mx-auto flex items-center justify-center border-4 border-white/20 shadow-lg mb-4">
          <User className="w-12 h-12 text-white" />
        </div>
        <h3 className="text-white text-2xl font-bold">{userData?.nombre || 'Usuario'}</h3>
        <p className="text-white/70 font-medium mt-1">
          {userData?.rol === 'admin' ? 'Administrador' : 'Copropietario'}
        </p>
        
        <div className="inline-flex items-center gap-2 bg-blue-500/20 px-4 py-2 rounded-full border border-blue-500/30 mt-4">
          <Home className="w-4 h-4 text-blue-300" />
          <span className="text-blue-100 font-medium">Apartamento {userData?.apartamento || 'N/A'}</span>
        </div>
      </div>

      {/* Información de Contacto */}
      {/* CLAVE AQUÍ: relative z-20 asegura que el menú flote sobre las tarjetas de abajo */}
      <div className="space-y-4 relative z-20">
        <h3 className="text-white text-lg px-2 font-medium">Información Personal</h3>
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-2 border border-white/20 shadow-lg">
          
          {/* Correo */}
          <div className="flex items-center gap-4 p-4 border-b border-white/10">
            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
              <Mail className="w-5 h-5 text-white/50" />
            </div>
            <div className="flex-1">
              <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Correo Electrónico</p>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="email"
                  value={userData?.correo || 'No registrado'}
                  disabled
                  className="bg-white/5 text-white/50 border border-white/10 rounded-lg px-3 py-1.5 w-full cursor-not-allowed"
                />
                <div className="p-2 bg-white/5 rounded-lg border border-white/5 cursor-not-allowed">
                  <Lock className="w-4 h-4 text-white/40" />
                </div>
              </div>
            </div>
          </div>

          {/* Teléfono */}
          <div className="flex flex-col gap-2 p-4">
            <div className="flex items-center gap-4">
              <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Teléfono</p>
                
                {isEditingPhone ? (
                  <div className="flex items-center gap-2 mt-1">
                    
                    {/* Dropdown Personalizado */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowDropdown(!showDropdown)}
                        disabled={isLoading}
                        className="flex items-center justify-between gap-2 bg-white/10 text-white border border-white/30 hover:border-white/50 rounded-lg pl-3 pr-2 py-1.5 focus:outline-none focus:border-blue-400 transition-all min-w-[90px]"
                      >
                        <span>{prefijo}</span>
                        <ChevronDown className={`w-4 h-4 text-white/70 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {showDropdown && (
                        <>
                          <div 
                            className="fixed inset-0 z-40"
                            onClick={() => setShowDropdown(false)}
                          />
                          <div className="absolute top-full left-0 mt-2 w-full bg-[#0f172a]/95 backdrop-blur-xl border border-white/20 rounded-xl overflow-hidden z-50 shadow-2xl animate-fade-in">
                            {PREFIJOS.map((p) => (
                              <div
                                key={p}
                                onClick={() => {
                                  setPrefijo(p);
                                  setShowDropdown(false);
                                }}
                                className="px-3 py-2 text-white hover:bg-white/20 cursor-pointer transition-colors text-center text-sm font-medium"
                              >
                                {p}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    <span className="text-white/50 font-bold select-none">-</span>

                    <input
                      type="text"
                      value={cuerpoNumero}
                      onChange={handleChangeNumero}
                      className="bg-white/10 text-white border border-white/30 rounded-lg px-3 py-1.5 w-full focus:outline-none focus:border-blue-400 placeholder-white/30"
                      placeholder="1234567"
                      disabled={isLoading}
                      maxLength={7}
                      inputMode="numeric"
                    />

                    <button onClick={handleSavePhone} disabled={isLoading} className="p-2 bg-green-500/20 rounded-lg hover:bg-green-500/40 text-green-300 border border-green-500/30 transition-all flex-shrink-0">
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={() => {
                        setIsEditingPhone(false); 
                        setCuerpoNumero(initialData.cuerpo); 
                        setPrefijo(initialData.prefijo);
                        setShowDropdown(false);
                      }} 
                      disabled={isLoading} 
                      className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/40 text-red-300 border border-red-500/30 transition-all flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-white font-medium text-lg mt-1 tracking-wide">{currentPhone}</p>
                    <button 
                      onClick={() => setIsEditingPhone(true)}
                      className="p-2 bg-white/5 rounded-lg hover:bg-white/10 border border-white/5 text-white/70 hover:text-white transition-all shadow-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mensaje de Éxito */}
            {mensajeExito && (
              <div className="ml-0 md:ml-16 bg-green-500/10 border border-green-500/20 text-green-300 text-sm px-3 py-2 rounded-lg animate-fade-in flex items-center gap-2 backdrop-blur-md">
                <Check className="w-4 h-4" />
                {mensajeExito}
              </div>
            )}
          </div>

        </div>
      </div>
      
      {/* Configuración */}
      {/* CLAVE AQUÍ: relative z-10 mantiene esta sección por debajo del menú desplegable */}
      <div className="space-y-4 relative z-10">
        <h3 className="text-white text-lg px-2 font-medium">Configuración</h3>
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-2 border border-white/20 shadow-lg">
          
          <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-xl transition-all border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="bg-blue-500/20 p-2 rounded-lg">
                <Bell className="w-5 h-5 text-blue-300" />
              </div>
              <span className="text-white">Notificaciones</span>
            </div>
            <ChevronLeft className="w-5 h-5 text-white/40 rotate-180" />
          </button>

          <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-xl transition-all border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="bg-purple-500/20 p-2 rounded-lg">
                <Shield className="w-5 h-5 text-purple-300" />
              </div>
              <span className="text-white">Privacidad</span>
            </div>
            <ChevronLeft className="w-5 h-5 text-white/40 rotate-180" />
          </button>

          <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-xl transition-all">
            <div className="flex items-center gap-4">
              <div className="bg-yellow-500/20 p-2 rounded-lg">
                <Key className="w-5 h-5 text-yellow-300" />
              </div>
              <span className="text-white">Cambiar Contraseña</span>
            </div>
            <ChevronLeft className="w-5 h-5 text-white/40 rotate-180" />
          </button>

        </div>
      </div>
    </div>
  );
}