// src/app/components/DashboardLayout.tsx
import { useState } from 'react';
import { Menu, Bell, User, X, Settings, HelpCircle, FileText, LogOut, Home, Wallet, UsersRound, Users, AlertCircle, Wrench, DollarSign, Vote } from 'lucide-react';
// Asegúrate de que las rutas a tus vistas sean correctas según tu estructura
import { InicioView } from './InicioView';
import { FinanzasView } from './FinanzasView';
import { ComunidadView } from './ComunidadView';
import { UsuariosView } from './UsuariosView';
import { SettingsView } from './SettingsView';
import type { Propietario } from '../../types';

interface DashboardLayoutProps {
  propiedad: Propietario;
  onLogout: () => void;
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
        {/* AQUÍ ES DONDE PASAMOS LA PROPIEDAD A LA VISTA DE USUARIOS */}
        {activeTab === 'usuarios' && <UsuariosView propiedad={propiedad} />}
        {activeTab === 'configuracion' && <SettingsView />}
      </main>

      {/* Bottom Navigation (Floating Pill) */}
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

      {/* Panel de Notificaciones (Minimizado para no hacer el código gigante, mantén el tuyo si le hiciste cambios) */}
      {isNotificationsOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsNotificationsOpen(false)}></div>
          <div className="fixed top-20 right-4 w-96 bg-white rounded-2xl shadow-2xl z-50 max-h-[600px] overflow-hidden">
            <div className="bg-blue-600 text-white p-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">Notificaciones</h3>
                <button onClick={() => setIsNotificationsOpen(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="max-h-[520px] overflow-y-auto text-gray-800 p-4">
              <p className="text-center text-gray-500">No hay notificaciones nuevas</p>
            </div>
          </div>
        </>
      )}

      {/* Side Drawer */}
      {isDrawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setIsDrawerOpen(false)}></div>
          <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col">
            <div className="bg-blue-600 text-white p-6">
              <button onClick={() => setIsDrawerOpen(false)} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors">
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
            <nav className="flex-1 p-4 text-gray-700">
              <button onClick={() => setActiveTab('configuracion')} className="w-full flex items-center gap-3 p-4 hover:bg-gray-100 rounded-lg transition-colors">
                <Settings className="w-5 h-5" />
                <span className="font-medium">Configuración</span>
              </button>
              <button className="w-full flex items-center gap-3 p-4 hover:bg-gray-100 rounded-lg transition-colors">
                <HelpCircle className="w-5 h-5" />
                <span className="font-medium">Ayuda</span>
              </button>
              <button className="w-full flex items-center gap-3 p-4 hover:bg-gray-100 rounded-lg transition-colors">
                <FileText className="w-5 h-5" />
                <span className="font-medium">Términos Legales</span>
              </button>
            </nav>
            <div className="p-4 border-t border-gray-200">
              <button onClick={onLogout} className="w-full flex items-center gap-3 p-4 hover:bg-red-50 rounded-lg transition-colors text-red-600">
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