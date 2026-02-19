// src/app/components/DashboardLayout.tsx
import { useState } from 'react';
import { Menu, Bell, User, X, Settings, HelpCircle, FileText, LogOut, Home, Wallet, UsersRound, Users, AlertCircle, Wrench, DollarSign, Vote } from 'lucide-react';
// Asegúrate de que las rutas a tus vistas sean correctas según tu estructura
import { InicioView } from './InicioView';
import { FinanzasView } from './FinanzasView';
import { ComunidadView } from './ComunidadView';
import { UsuariosView } from './UsuariosView';
import type { Propietario } from '../../types'; // Ajusta la ruta a tus types

interface DashboardLayoutProps {
  propiedad: Propietario; // Recibimos la data real
  onLogout: () => void;   // Recibimos la función para cerrar sesión
}

export default function DashboardLayout({ propiedad, onLogout }: DashboardLayoutProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('inicio');

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1e3a8a] to-[#1e40af] text-white">
      {/* Header - Sticky con sombreado */}
      <header className="sticky top-0 z-30 bg-gradient-to-b from-[#172c5f] to-[#1e3a8a] shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between p-4 max-w-4xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold">Koda</h1>
            <p className="text-sm text-blue-200">tu comunidad</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Botón de Notificaciones */}
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Bell className="w-6 h-6" />
              {/* Badge de notificaciones pendientes */}
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#1e3a8a]"></span>
            </button>
            
            {/* Botón del menú */}
            <button 
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 pb-32 max-w-4xl mx-auto pt-6">
        {activeTab === 'inicio' && <InicioView />}
        {activeTab === 'finanzas' && <FinanzasView />}
        {activeTab === 'comunidad' && <ComunidadView />}
        {activeTab === 'usuarios' && <UsuariosView />}
      </main>

      {/* Bottom Navigation (Floating Pill) - Más redondo y pequeño */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <div className="bg-white/95 backdrop-blur-md rounded-full shadow-2xl px-2 py-2 flex gap-1">
          <button 
            onClick={() => setActiveTab('inicio')}
            className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-full transition-all ${
              activeTab === 'inicio' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">Inicio</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('finanzas')}
            className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-full transition-all ${
              activeTab === 'finanzas' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-[10px] font-medium">Finanzas</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('comunidad')}
            className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-full transition-all ${
              activeTab === 'comunidad' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <UsersRound className="w-5 h-5" />
            <span className="text-[10px] font-medium">Comunidad</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('usuarios')}
            className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-full transition-all ${
              activeTab === 'usuarios' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-medium">Usuarios</span>
          </button>
        </div>
      </div>

      {/* Panel de Notificaciones */}
      {isNotificationsOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsNotificationsOpen(false)}
          ></div>
          
          {/* Panel de Notificaciones */}
          <div className="fixed top-20 right-4 w-96 bg-white rounded-2xl shadow-2xl z-50 max-h-[600px] overflow-hidden">
            <div className="bg-blue-600 text-white p-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">Notificaciones</h3>
                <button 
                  onClick={() => setIsNotificationsOpen(false)}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="max-h-[520px] overflow-y-auto">
              {/* Notificación 1 */}
              <div className="p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex gap-3">
                  <div className="bg-red-100 p-2 rounded-full h-fit">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">Pagos Pendientes</h4>
                    <p className="text-sm text-gray-600 mt-1">3 pagos requieren tu aprobación</p>
                    <span className="text-xs text-gray-400 mt-2 block">Hace 2 horas</span>
                  </div>
                </div>
              </div>

              {/* Notificación 2 */}
              <div className="p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex gap-3">
                  <div className="bg-orange-100 p-2 rounded-full h-fit">
                    <Wrench className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">Nuevo Ticket</h4>
                    <p className="text-sm text-gray-600 mt-1">Reporte de filtración en Apto 304</p>
                    <span className="text-xs text-gray-400 mt-2 block">Hace 5 horas</span>
                  </div>
                </div>
              </div>

              {/* Notificación 3 */}
              <div className="p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex gap-3">
                  <div className="bg-green-100 p-2 rounded-full h-fit">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">Pago Confirmado</h4>
                    <p className="text-sm text-gray-600 mt-1">Apto 201 completó su pago mensual</p>
                    <span className="text-xs text-gray-400 mt-2 block">Hace 1 día</span>
                  </div>
                </div>
              </div>

              {/* Notificación 4 */}
              <div className="p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex gap-3">
                  <div className="bg-blue-100 p-2 rounded-full h-fit">
                    <Vote className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">Votación Activa</h4>
                    <p className="text-sm text-gray-600 mt-1">15 vecinos han votado en la encuesta</p>
                    <span className="text-xs text-gray-400 mt-2 block">Hace 2 días</span>
                  </div>
                </div>
              </div>

              {/* Notificación 5 */}
              <div className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex gap-3">
                  <div className="bg-purple-100 p-2 rounded-full h-fit">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">Nuevo Vecino</h4>
                    <p className="text-sm text-gray-600 mt-1">Se registró un nuevo copropietario en Apto 506</p>
                    <span className="text-xs text-gray-400 mt-2 block">Hace 3 días</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Side Drawer */}
      {isDrawerOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setIsDrawerOpen(false)}
          ></div>
          
          {/* Drawer */}
          <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col">
            {/* Header del Drawer */}
            <div className="bg-blue-600 text-white p-6">
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3 mt-4">
                <div className="bg-white/20 p-3 rounded-full">
                  <User className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Usuario</h3>
                  <p className="text-sm text-blue-100">Junta de Condominio</p>
                </div>
              </div>
            </div>

            {/* Menu Options */}
            <nav className="flex-1 p-4">
              <button className="w-full flex items-center gap-3 p-4 hover:bg-gray-100 rounded-lg transition-colors text-gray-700">
                <Settings className="w-5 h-5" />
                <span className="font-medium">Configuración</span>
              </button>
              
              <button className="w-full flex items-center gap-3 p-4 hover:bg-gray-100 rounded-lg transition-colors text-gray-700">
                <HelpCircle className="w-5 h-5" />
                <span className="font-medium">Ayuda</span>
              </button>
              
              <button className="w-full flex items-center gap-3 p-4 hover:bg-gray-100 rounded-lg transition-colors text-gray-700">
                <FileText className="w-5 h-5" />
                <span className="font-medium">Términos Legales</span>
              </button>
            </nav>

            {/* Footer */}
<div className="p-4 border-t border-gray-200">
  <button 
    onClick={onLogout}  // <--- AGREGA ESTA LÍNEA AQUÍ
    className="w-full flex items-center gap-3 p-4 hover:bg-red-50 rounded-lg transition-colors text-red-600"
  >
    <LogOut className="w-5 h-5" />
    <span className="font-medium">Cerrar Sesión</span>
  </button>
  <p className="text-center text-xs text-gray-400 mt-4">Koda Dashboard v1.0</p>
</div>
          </div>
        </>
      )}
    </div>
  );
}