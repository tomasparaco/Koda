import { Mail, Lock, Wallet } from 'lucide-react';
import kodaLogo from '../assets/LogoKoda4.png';

export default function App() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#2B4A7C] relative overflow-hidden">
      {/* Fondo con patrón geométrico abstracto */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Círculo grande azul oscuro */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#1F3A5F] rounded-full opacity-50"></div>
        
        {/* Círculo mediano azul medio */}
        <div className="absolute top-1/4 -right-32 w-80 h-80 bg-[#3D5A80] rounded-full opacity-40"></div>
        
        {/* Rombo rotado */}
        <div className="absolute bottom-1/3 left-1/4 w-64 h-64 bg-[#4A6FA5] rounded-3xl opacity-30 rotate-45"></div>
        
        {/* Círculo pequeño azul claro */}
        <div className="absolute bottom-20 -left-20 w-48 h-48 bg-[#6B8EC7] rounded-full opacity-40"></div>
        
        {/* Rombo decorativo inferior derecho */}
        <div className="absolute -bottom-20 right-20 w-56 h-56 bg-[#5074A8] rounded-2xl opacity-25 rotate-12"></div>
        
        {/* Estrella decorativa */}
        <div className="absolute bottom-10 right-10">
          <div className="w-16 h-16 relative">
            <div className="absolute inset-0 bg-white opacity-60 rounded-full blur-md"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-4 h-4 bg-white rounded-full"></div>
              <div className="absolute top-0 left-1/2 w-1 h-8 bg-white transform -translate-x-1/2 -translate-y-3"></div>
              <div className="absolute top-1/2 left-0 w-8 h-1 bg-white transform -translate-y-1/2 -translate-x-3"></div>
              <div className="absolute top-0 right-0 w-1 h-6 bg-white transform rotate-45 origin-top-right translate-x-1 -translate-y-2"></div>
              <div className="absolute bottom-0 right-0 w-1 h-6 bg-white transform -rotate-45 origin-bottom-right translate-x-1 translate-y-2"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjeta de login con fondo degradado azul */}
      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="bg-gradient-to-b from-[#6BA3D8] to-[#4A7FDB] rounded-[2.5rem] p-8 shadow-2xl">
          {/* Logo y título en la parte superior con fondo azul */}
          <div className="flex flex-col items-center mb-8">
            {/* Logo circular */}
            <div className="w-28 h-28 rounded-3xl bg-white flex items-center justify-center mb-4 shadow-lg p-3">
              <img src={kodaLogo} alt="Koda Logo" className="w-full h-full object-contain" />
            </div>
            
            {/* Nombre de la aplicación */}
            <h1 className="text-3xl font-bold text-white mb-6">Koda</h1>
            
            {/* Título LOGIN */}
            <h2 className="text-xl font-semibold text-white tracking-wide">Inicia Sesión</h2>
          </div>

          {/* Formulario en tarjeta blanca */}
          <div className="bg-white rounded-3xl p-6 shadow-xl">
            {/* Campo de Email */}
            <div className="mb-4">
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <Mail className="w-5 h-5 text-[#4A7FDB]" />
                </div>
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-100 rounded-xl border-2 border-transparent focus:border-[#4A7FDB] focus:bg-white outline-none transition-all placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Campo de Password */}
            <div className="mb-6">
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <Lock className="w-5 h-5 text-[#4A7FDB]" />
                </div>
                <input
                  type="password"
                  placeholder="Contraseña"
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-100 rounded-xl border-2 border-transparent focus:border-[#4A7FDB] focus:bg-white outline-none transition-all placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Botón LOG IN */}
            <button className="w-full py-3.5 bg-gradient-to-r from-[#4A7FDB] to-[#5DA9E8] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
              Iniciar Sesión
            </button>

            {/* Enlaces inferiores */}
            <div className="mt-6 text-center space-y-2">
              <p className="text-gray-600 text-sm">
                No tienes cuenta?{' '}
                <button className="text-[#4A7FDB] font-semibold hover:underline">
                  Regístrate
                </button>
              </p>
              <button className="text-[#4A7FDB] text-sm hover:underline font-medium">
                Olvidaste tu contraseña?
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}