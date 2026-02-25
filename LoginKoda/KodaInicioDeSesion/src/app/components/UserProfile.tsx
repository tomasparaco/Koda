import { User, Mail, Phone, Home, ChevronLeft, Shield, Bell, Key, LogOut } from 'lucide-react';
import type { Propietario } from '../../types'; // Asegúrate de que la ruta sea correcta

interface UserProfileProps {
  userData: Propietario;
  onBack: () => void;
}

export default function UserProfile({ userData, onBack }: UserProfileProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-fade-in pb-32">
      {/* Cabecera con botón de retroceso */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={onBack}
          className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all backdrop-blur-lg"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <h2 className="text-white text-2xl font-bold">Mi Perfil</h2>
      </div>

      {/* Tarjeta Principal de Perfil */}
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
      <div className="space-y-4">
        <h3 className="text-white text-lg px-2 font-medium">Información Personal</h3>
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-2 border border-white/20 shadow-lg">
          
          <div className="flex items-center gap-4 p-4 border-b border-white/10">
            <div className="bg-white/10 p-3 rounded-xl">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Correo Electrónico</p>
              <p className="text-white font-medium">{userData?.correo || 'No registrado'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4">
            <div className="bg-white/10 p-3 rounded-xl">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Teléfono</p>
              <p className="text-white font-medium">{userData?.celular || 'No registrado'}</p>
            </div>
          </div>

        </div>
      </div>

      {/* Configuración de la Cuenta */}
      <div className="space-y-4">
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