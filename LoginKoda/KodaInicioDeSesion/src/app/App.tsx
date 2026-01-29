import { useState } from 'react';
import { Mail, Lock } from 'lucide-react'; 
import kodaLogo from '../assets/LogoKoda4.png';
import { AuthService } from '../services/auth.service';
import type { Propietario } from '../types';

export default function App() {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [propiedades, setPropiedades] = useState<Propietario[]>([]); 

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email || !password) {
        setError("Por favor completa ambos campos");
        setLoading(false);
        return;
    }

    const resultado = await AuthService.login(email, password);

    if (resultado.exito && resultado.datos && resultado.datos.length > 0) {
      setPropiedades(resultado.datos); 
    } else {
      setError(resultado.mensaje || 'Error desconocido');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    AuthService.logout(); 
    setPropiedades([]);
    setError('');         
    setPassword('');      
  };


  // Vista 1: Si el usuario ya hizo Login
  if (propiedades.length > 0) {
    const nombreUsuario = propiedades[0].nombre;

    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#2B4A7C] relative overflow-hidden font-sans">
         {/* Fondo Decorativo */}
         <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#1F3A5F] rounded-full opacity-50"></div>
            <div className="absolute bottom-1/3 left-1/4 w-64 h-64 bg-[#4A6FA5] rounded-3xl opacity-30 rotate-45"></div>
         </div>

         {/* Tarjeta de Bienvenida */}
         <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-[2rem] p-8 shadow-2xl text-center max-h-[90vh] overflow-y-auto">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🏢</span>
            </div>
            <h1 className="text-2xl font-bold text-[#2B4A7C] mb-2">¡Hola, {nombreUsuario}!</h1>
            <p className="text-gray-500 mb-6">Tienes {propiedades.length} propiedad(es) registrada(s)</p>

            <div className="space-y-4 mb-6">
                {propiedades.map((prop, index) => (
                    <div key={index} className="bg-gray-50 rounded-xl p-4 text-left border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
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

            <button 
                onClick={handleLogout}
                className="w-full py-3 bg-red-50 text-red-500 font-semibold rounded-xl hover:bg-red-100 transition-colors"
            >
                Cerrar Sesión
            </button>
         </div>
      </div>
    );
  }

  //Vista 2: Login
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#2B4A7C] relative overflow-hidden font-sans">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#1F3A5F] rounded-full opacity-50"></div>
        <div className="absolute top-1/4 -right-32 w-80 h-80 bg-[#3D5A80] rounded-full opacity-40"></div>
        <div className="absolute bottom-1/3 left-1/4 w-64 h-64 bg-[#4A6FA5] rounded-3xl opacity-30 rotate-45"></div>
        <div className="absolute bottom-20 -left-20 w-48 h-48 bg-[#6B8EC7] rounded-full opacity-40"></div>
        <div className="absolute -bottom-20 right-20 w-56 h-56 bg-[#5074A8] rounded-2xl opacity-25 rotate-12"></div>
        
        <div className="absolute bottom-10 right-10">
          <div className="w-16 h-16 relative">
             <div className="absolute inset-0 bg-white opacity-60 rounded-full blur-md"></div>
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="bg-gradient-to-b from-[#6BA3D8] to-[#4A7FDB] rounded-[2.5rem] p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-28 h-28 rounded-3xl bg-white flex items-center justify-center mb-4 shadow-lg p-3">
              <img src={kodaLogo} alt="Koda Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-6">Koda</h1>
            <h2 className="text-xl font-semibold text-white tracking-wide">Inicia Sesión</h2>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-xl">
            <form onSubmit={handleLogin}>
                
                <div className="mb-4">
                <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                    <Mail className="w-5 h-5 text-[#4A7FDB]" />
                    </div>
                    <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-100 rounded-xl border-2 border-transparent focus:border-[#4A7FDB] focus:bg-white outline-none transition-all placeholder:text-gray-400"
                    />
                </div>
                </div>

                <div className="mb-4">
                <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                    <Lock className="w-5 h-5 text-[#4A7FDB]" />
                    </div>
                    <input
                    type="password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-100 rounded-xl border-2 border-transparent focus:border-[#4A7FDB] focus:bg-white outline-none transition-all placeholder:text-gray-400"
                    />
                </div>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-500 text-sm rounded-xl text-center">
                        {error}
                    </div>
                )}

                <button 
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-gradient-to-r from-[#4A7FDB] to-[#5DA9E8] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                {loading ? 'Verificando...' : 'Iniciar Sesión'}
                </button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <p className="text-gray-600 text-sm">
                No tienes cuenta?{' '}
                <button className="text-[#4A7FDB] font-semibold hover:underline">
                  Regístrate
                </button>
              </p>
              <button 
                type="button"
                className="text-[#4A7FDB] text-sm hover:underline font-medium"
              >
                Olvidaste tu contraseña?
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}