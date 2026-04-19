import { useState, useEffect } from 'react';
import { 
  Menu, Bell, User, X, Settings, HelpCircle, FileText, LogOut, Home, Wallet, 
  UsersRound, Users, AlertCircle, Wrench, DollarSign, Vote, Check, CheckCheck,
  Megaphone, Calendar, Receipt, Clock, Trash2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { NotificacionService, Notificacion } from '../../services/notificacion.service';
// Asegúrate de que las rutas a tus vistas sean correctas según tu estructura
import { InicioView } from './InicioView';
import { FinanzasView } from './FinanzasView';
import { ComunidadView } from './ComunidadView';
import { UsuariosView } from './UsuariosView';
import { SettingsView } from './SettingsView';
import AdminVotaciones from './AdminVotaciones'; // <--- IMPORTACIÓN DE LA NUEVA VISTA
import { AyudaView } from './AyudaView';
import { LegalTermsModal } from '../components/LegalTermsModal';
import type { Propietario } from '../../types';

interface DashboardLayoutProps {
  propiedad: Propietario;
  onLogout: () => void;
  onBackToSelector: () => void;
}

export default function DashboardLayout({ propiedad, onLogout, onBackToSelector }: DashboardLayoutProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLegalTermsOpen, setIsLegalTermsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('inicio');
  const [initialComunidadAction, setInitialComunidadAction] = useState<'comunicado' | 'evento' | null>(null);

  // --- ESTADOS DE NOTIFICACIONES ---
  const [notifications, setNotifications] = useState<Notificacion[]>([]);
  const unreadCount = notifications.filter(n => !n.leido).length;

  useEffect(() => {
    if (!propiedad.codigo_edificio) return;

    // 1. Cargar iniciales
    const loadNotifs = async () => {
      const data = await NotificacionService.getNotificaciones(propiedad.codigo_edificio, ['admin']);
      setNotifications(data);
    };
    loadNotifs();

    // 2. Suscribirse a tiempo real
    const channel = supabase
      .channel(`notificaciones-admin-${propiedad.codigo_edificio}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notificaciones',
          filter: `codigo_edificio=eq.${propiedad.codigo_edificio}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNotif = payload.new as Notificacion;
            // Solo si es para admin
            if (newNotif.destinatario === 'admin') {
              setNotifications(prev => [newNotif, ...prev].slice(0, 50));
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Notificacion;
            setNotifications(prev => prev.map(n => n.id === updated.id ? updated : n));
          } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [propiedad.codigo_edificio]);

  const handleMarkAsRead = async (id: string) => {
    await NotificacionService.marcarLeida(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, leido: true } : n));
  };

  const handleMarkAllAsRead = async () => {
    await NotificacionService.marcarTodasLeidas(propiedad.codigo_edificio, ['admin']);
    setNotifications(prev => prev.map(n => ({ ...n, leido: true })));
  };

  const handleDeleteNotif = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await NotificacionService.eliminar(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleDeleteAllNotifs = async () => {
    if (!window.confirm("¿Seguro que deseas vaciar toda tu bandeja de notificaciones?")) return;
    await NotificacionService.eliminarTodas(propiedad.codigo_edificio, ['admin']);
    setNotifications([]);
  };

  const getNotifIcon = (tipo: string) => {
    switch (tipo) {
      case 'pago': return <DollarSign className="w-5 h-5 text-green-500" />;
      case 'ticket': return <Wrench className="w-5 h-5 text-orange-500" />;
      case 'comunicado': return <Megaphone className="w-5 h-5 text-blue-500" />;
      case 'evento': return <Calendar className="w-5 h-5 text-purple-500" />;
      case 'encuesta': return <Vote className="w-5 h-5 text-indigo-500" />;
      case 'cobro': return <Receipt className="w-5 h-5 text-cyan-500" />;
      default: return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotifColor = (tipo: string) => {
    switch (tipo) {
      case 'pago': return 'bg-green-100';
      case 'ticket': return 'bg-orange-100';
      case 'comunicado': return 'bg-blue-100';
      case 'evento': return 'bg-purple-100';
      case 'encuesta': return 'bg-indigo-100';
      case 'cobro': return 'bg-cyan-100';
      default: return 'bg-gray-100';
    }
  };

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
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-[#1e3a8a]">
                  {unreadCount > 9 ? '+9' : unreadCount}
                </span>
              )}
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
        {/* AQUI PASAMOS LAS RUTAS A LOS BOTONES DEL INICIO */}
        {activeTab === 'inicio' && (
          <InicioView 
            propiedad={propiedad} 
            onNavigateToConciliacion={() => setActiveTab('finanzas')} 
            onNavigateToTickets={() => setActiveTab('comunidad')} 
            onNavigateToVotaciones={() => setActiveTab('votaciones')} 
            onNavigateToCrearComunicado={() => { setInitialComunidadAction('comunicado'); setActiveTab('comunidad'); }}
            onNavigateToAgendarEvento={() => { setInitialComunidadAction('evento'); setActiveTab('comunidad'); }}
          />
        )}
        {activeTab === 'finanzas' && <FinanzasView propiedad={propiedad} />}
        {activeTab === 'comunidad' && <ComunidadView propiedad={propiedad} initialAction={initialComunidadAction} onActionConsumed={() => setInitialComunidadAction(null)} />}
        {activeTab === 'usuarios' && <UsuariosView propiedad={propiedad} />}
        {activeTab === 'votaciones' && <AdminVotaciones />}
        {activeTab === 'configuracion' && <SettingsView />}
        {activeTab === 'ayuda' && <AyudaView propiedad={propiedad} />}
      </main>

      {/* Bottom Navigation (Floating Pill) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <div className="bg-white/95 backdrop-blur-md rounded-full shadow-2xl px-2 py-2 flex gap-1">
          <button
            onClick={() => setActiveTab('inicio')}
            className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-full transition-all ${activeTab === 'inicio' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">Inicio</span>
          </button>

          <button
            onClick={() => setActiveTab('finanzas')}
            className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-full transition-all ${activeTab === 'finanzas' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-[10px] font-medium">Finanzas</span>
          </button>

          <button
            onClick={() => setActiveTab('comunidad')}
            className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-full transition-all ${activeTab === 'comunidad' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            <UsersRound className="w-5 h-5" />
            <span className="text-[10px] font-medium">Comunidad</span>
          </button>

          <button
            onClick={() => setActiveTab('usuarios')}
            className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-full transition-all ${activeTab === 'usuarios' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
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
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsNotificationsOpen(false)}></div>
          <div className="fixed top-20 right-4 w-96 bg-white rounded-2xl shadow-2xl z-50 max-h-[600px] overflow-hidden">
            <div className="bg-blue-600 text-white p-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">Notificaciones</h3>
                  <p className="text-xs text-blue-100">{unreadCount} sin leer</p>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button 
                      onClick={handleMarkAllAsRead}
                      title="Marcar todas como leídas"
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <CheckCheck className="w-5 h-5" />
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button 
                      onClick={handleDeleteAllNotifs}
                      title="Eliminar todas las notificaciones"
                      className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/50 hover:text-white"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  <button onClick={() => setIsNotificationsOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
            <div className="max-h-[520px] overflow-y-auto text-gray-800 custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium">No tienes notificaciones</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`p-4 flex gap-4 transition-colors ${notif.leido ? 'bg-white' : 'bg-blue-50/50'}`}
                    >
                      <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${getNotifColor(notif.tipo)}`}>
                        {getNotifIcon(notif.tipo)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                          <h4 className={`font-bold text-sm truncate ${notif.leido ? 'text-gray-700' : 'text-blue-900'}`}>{notif.titulo}</h4>
                          {!notif.leido ? (
                            <button 
                              onClick={() => handleMarkAsRead(notif.id)}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title="Marcar como leída"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          ) : (
                            <button 
                              onClick={(e) => handleDeleteNotif(notif.id, e)}
                              className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                              title="Eliminar notificación"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2 leading-relaxed">
                          {notif.mensaje}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
                          <Clock className="w-3 h-3" />
                          {new Date(notif.created_at).toLocaleDateString('es-ES', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {notifications.length > 0 && (
              <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Centro de Notificaciones Koda</p>
              </div>
            )}
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
              {/* Eliminado el botón lateral de votaciones como pediste */}
              <button onClick={() => { setActiveTab('configuracion'); setIsDrawerOpen(false); }} className="w-full flex items-center gap-3 p-4 hover:bg-gray-100 rounded-lg transition-colors">
                <Settings className="w-5 h-5" />
                <span className="font-medium">Configuración</span>
              </button>
              <button onClick={() => { setActiveTab('ayuda'); setIsDrawerOpen(false); }} className="w-full flex items-center gap-3 p-4 hover:bg-gray-100 rounded-lg transition-colors">
                <HelpCircle className="w-5 h-5" />
                <span className="font-medium">Ayuda</span>
              </button>
              <button onClick={() => { setIsLegalTermsOpen(true); setIsDrawerOpen(false); }} className="w-full flex items-center gap-3 p-4 hover:bg-gray-100 rounded-lg transition-colors">
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

      {/* Modal de Términos Legales */}
      <LegalTermsModal
        isOpen={isLegalTermsOpen}
        onClose={() => setIsLegalTermsOpen(false)}
      />
    </div>
  );
}