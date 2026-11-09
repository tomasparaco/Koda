import { useState, useEffect } from 'react';
import { 
  Menu, Bell, User, X, Settings, HelpCircle, FileText, LogOut, Home, Wallet, 
  UsersRound, Users, AlertCircle, Wrench, DollarSign, Vote, Check, CheckCheck,
  Megaphone, Calendar, Receipt, Clock, Trash2, Building2
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
import { MonedaProvider, useMoneda } from '../moneda/MonedaContext';
import { ThemeToggle, ThemeSwitchRow } from '../theme/ThemeContext';

interface DashboardLayoutProps {
  propiedad: Propietario;
  onLogout: () => void;
  onBackToSelector: () => void;
  /** true cuando entra la administradora (gestiona varios edificios) */
  esAdministradora?: boolean;
}

export default function DashboardLayout(props: DashboardLayoutProps) {
  return (
    <MonedaProvider codigoEdificio={props.propiedad.codigo_edificio}>
      <DashboardLayoutInner {...props} />
    </MonedaProvider>
  );
}

function DashboardLayoutInner({ propiedad, onLogout, onBackToSelector, esAdministradora = false }: DashboardLayoutProps) {
  const { config } = useMoneda();
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
    <div className="min-h-screen bg-kbg text-slate-100 font-sans">
      {/* Header - Sticky con sombreado */}
      <header className="sticky top-0 z-30 bg-kbg/90 backdrop-blur-md border-b border-slate-800 shadow-sm">
        <div className="flex items-center justify-between p-4 max-w-4xl mx-auto">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Kuota</h1>
            <p className="text-xs font-medium text-slate-400 truncate max-w-[55vw]">
              {config.descripcion && config.descripcion !== propiedad.codigo_edificio ? config.descripcion : 'tu comunidad'}
              {esAdministradora && ' · Administración'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {/* Botón de Notificaciones */}
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-[16px] bg-white text-slate-900 text-[9px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-kcard">
                  {unreadCount > 9 ? '+9' : unreadCount}
                </span>
              )}
            </button>

            {/* Botón del menú */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 sm:px-6 pb-32 max-w-4xl mx-auto pt-6 text-white">
        {activeTab === 'inicio' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <InicioView 
              propiedad={propiedad} 
              onNavigateToConciliacion={() => setActiveTab('finanzas')} 
              onNavigateToTickets={() => setActiveTab('comunidad')} 
              onNavigateToVotaciones={() => setActiveTab('votaciones')} 
              onNavigateToCrearComunicado={() => { setInitialComunidadAction('comunicado'); setActiveTab('comunidad'); }}
              onNavigateToAgendarEvento={() => { setInitialComunidadAction('evento'); setActiveTab('comunidad'); }}
            />
          </div>
        )}
        {activeTab === 'finanzas' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <FinanzasView propiedad={propiedad} />
          </div>
        )}
        {activeTab === 'comunidad' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ComunidadView propiedad={propiedad} initialAction={initialComunidadAction} onActionConsumed={() => setInitialComunidadAction(null)} />
          </div>
        )}
        {activeTab === 'usuarios' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <UsuariosView propiedad={propiedad} />
          </div>
        )}
        {activeTab === 'votaciones' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <AdminVotaciones codigoEdificio={propiedad.codigo_edificio} />
          </div>
        )}
        {activeTab === 'configuracion' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SettingsView codigoEdificio={propiedad.codigo_edificio} />
          </div>
        )}
        {activeTab === 'ayuda' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <AyudaView propiedad={propiedad} />
          </div>
        )}
      </main>

      {/* Bottom Navigation (Floating Pill) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <div className="bg-kcard/95 backdrop-blur-md rounded-full shadow-2xl border border-slate-700/50 px-2 py-2 flex gap-1">
          <button
            onClick={() => setActiveTab('inicio')}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-full transition-all ${activeTab === 'inicio' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">Inicio</span>
          </button>

          <button
            onClick={() => setActiveTab('finanzas')}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-full transition-all ${activeTab === 'finanzas' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-[10px] font-medium">Finanzas</span>
          </button>

          <button
            onClick={() => setActiveTab('comunidad')}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-full transition-all ${activeTab === 'comunidad' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
          >
            <UsersRound className="w-5 h-5" />
            <span className="text-[10px] font-medium">Comunidad</span>
          </button>

          <button
            onClick={() => setActiveTab('usuarios')}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-full transition-all ${activeTab === 'usuarios' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
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
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40" onClick={() => setIsNotificationsOpen(false)}></div>
          <div className="fixed top-20 right-4 w-96 bg-kcard border border-slate-800 rounded-2xl shadow-2xl z-50 max-h-[600px] overflow-hidden">
            <div className="bg-kbg border-b border-slate-800 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg text-slate-100">Notificaciones</h3>
                  <p className="text-xs text-slate-400">{unreadCount} sin leer</p>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button 
                      onClick={handleMarkAllAsRead}
                      title="Marcar todas como leídas"
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <CheckCheck className="w-5 h-5" />
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button 
                      onClick={handleDeleteAllNotifs}
                      title="Eliminar todas las notificaciones"
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  <button onClick={() => setIsNotificationsOpen(false)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
            <div className="max-h-[520px] overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="bg-kbg border border-slate-800 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-8 h-8 text-slate-600" />
                  </div>
                  <p className="text-slate-400 font-medium text-sm">No tienes notificaciones</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/50">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`p-4 flex gap-4 transition-colors ${notif.leido ? 'bg-kcard' : 'bg-kbg'}`}
                    >
                      <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-kcard border border-slate-700/50`}>
                        {/* We use slate-400 for all icons to maintain minimalism */}
                        <Bell className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                          <h4 className={`font-semibold text-sm truncate ${notif.leido ? 'text-slate-300' : 'text-white'}`}>{notif.titulo}</h4>
                          {!notif.leido ? (
                            <button 
                              onClick={() => handleMarkAsRead(notif.id)}
                              className="text-slate-400 hover:text-white p-1"
                              title="Marcar como leída"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          ) : (
                            <button 
                              onClick={(e) => handleDeleteNotif(notif.id, e)}
                              className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                              title="Eliminar notificación"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 mb-2 leading-relaxed">
                          {notif.mensaje}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
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
              <div className="p-3 bg-kbg border-t border-slate-800 text-center">
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Centro de Notificaciones</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Side Drawer */}
      {isDrawerOpen && (
        <>
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50" onClick={() => setIsDrawerOpen(false)}></div>
          <div className="fixed top-0 right-0 h-full w-80 bg-kcard border-l border-slate-800 shadow-2xl z-50 flex flex-col">
            <div className="bg-kbg border-b border-slate-800 p-6 relative">
              <button onClick={() => setIsDrawerOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 mt-4">
                <div className="bg-kcard border border-slate-700 p-3 rounded-2xl">
                  <User className="w-6 h-6 text-slate-300" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">{esAdministradora ? 'Administradora' : propiedad.nombre || 'Usuario'}</h3>
                  <p className="text-xs font-medium text-slate-400">{esAdministradora ? config.descripcion : 'Junta de Condominio'}</p>
                </div>
              </div>
            </div>
            <nav className="flex-1 p-4 text-slate-300 space-y-2 overflow-y-auto">
              <button onClick={() => { setIsDrawerOpen(false); onBackToSelector(); }} className="group w-full flex items-center gap-4 p-3.5 hover:bg-slate-800 hover:translate-x-1 hover:shadow-lg rounded-2xl transition-all duration-300">
                <div className="bg-kbg p-2.5 rounded-xl group-hover:scale-110 transition-transform"><Building2 className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 transition-colors" /></div>
                <span className="font-medium text-slate-300 group-hover:text-white transition-colors">{esAdministradora ? 'Volver a mis edificios' : 'Cambiar de edificio'}</span>
              </button>
              <button onClick={() => { setActiveTab('configuracion'); setIsDrawerOpen(false); }} className="group w-full flex items-center gap-4 p-3.5 hover:bg-slate-800 hover:translate-x-1 hover:shadow-lg rounded-2xl transition-all duration-300">
                <div className="bg-kbg p-2.5 rounded-xl group-hover:scale-110 transition-transform"><Settings className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors" /></div>
                <span className="font-medium text-slate-300 group-hover:text-white transition-colors">Configuración</span>
              </button>
              <button onClick={() => { setActiveTab('ayuda'); setIsDrawerOpen(false); }} className="group w-full flex items-center gap-4 p-3.5 hover:bg-slate-800 hover:translate-x-1 hover:shadow-lg rounded-2xl transition-all duration-300">
                <div className="bg-kbg p-2.5 rounded-xl group-hover:scale-110 transition-transform"><HelpCircle className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors" /></div>
                <span className="font-medium text-slate-300 group-hover:text-white transition-colors">Ayuda</span>
              </button>
              <button onClick={() => { setIsLegalTermsOpen(true); setIsDrawerOpen(false); }} className="group w-full flex items-center gap-4 p-3.5 hover:bg-slate-800 hover:translate-x-1 hover:shadow-lg rounded-2xl transition-all duration-300">
                <div className="bg-kbg p-2.5 rounded-xl group-hover:scale-110 transition-transform"><FileText className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors" /></div>
                <span className="font-medium text-slate-300 group-hover:text-white transition-colors">Términos Legales</span>
              </button>
            </nav>
            <div className="p-4 border-t border-slate-800/50 space-y-3">
              <ThemeSwitchRow />
              <button onClick={onLogout} className="group w-full flex items-center gap-4 p-3.5 hover:bg-red-500/10 hover:translate-x-1 rounded-2xl transition-all duration-300">
                <div className="bg-kbg group-hover:bg-red-500/20 p-2.5 rounded-xl group-hover:scale-110 transition-all"><LogOut className="w-5 h-5 text-red-500 group-hover:text-red-400 transition-colors" /></div>
                <span className="font-medium text-red-500 group-hover:text-red-400 transition-colors">Cerrar Sesión</span>
              </button>
              <p className="text-center text-[10px] text-slate-600 font-medium mt-4">Kuota Dashboard v1.0</p>
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
