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

export default function App() {
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