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
  CheckCircle,
  Menu,
  X,
  Settings,
  HelpCircle,
  FileText,
  LogOut,
  Bell,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Filter,
  Phone,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { Propietario } from '../../types';
import UserProfile from './UserProfile';
interface UserDashboardProps {
  onLogout: () => void;
  userData: Propietario;
}



export default function UserDashboard({ onLogout, userData }: UserDashboardProps) {
  const [balance] = useState(250.00); // Monto en dólares a pagar
  const [bcvRate] = useState(45.50); // Tasa BCV del día
  const [activeTab, setActiveTab] = useState('inicio'); // Estado para la navegación
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Estado para el menú lateral
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false); // Estado para notificaciones
  const [selectedMonth, setSelectedMonth] = useState(new Date(2026, 1)); // Febrero 2026
  const [paymentFilter, setPaymentFilter] = useState('todos'); // Estado para filtros de pagos
  const bolivares = balance * bcvRate;

  const isSolvent = balance === 0;

  // Data de ejemplo para notificaciones
  const notifications = [
    { id: 1, type: 'payment', title: 'Pagos Pendientes', description: '3 pagos requieren tu aprobación', time: 'Hace 2 horas', icon: DollarSign, color: 'red', bgColor: 'bg-red-500' },
    { id: 2, type: 'ticket', title: 'Nuevo Ticket', description: 'Reporte de filtración en Apto 304', time: 'Hace 5 horas', icon: Wrench, color: 'orange', bgColor: 'bg-orange-500' },
    { id: 3, type: 'payment', title: 'Pago Confirmado', description: 'Apto 201 completó su pago mensual', time: 'Hace 1 día', icon: CheckCircle, color: 'green', bgColor: 'bg-green-500' },
    { id: 4, type: 'vote', title: 'Votación Activa', description: '15 vecinos han votado en la encuesta', time: 'Hace 2 días', icon: Vote, color: 'blue', bgColor: 'bg-blue-500' },
    { id: 5, type: 'community', title: 'Nuevo Vecino', description: 'Se registró un nuevo copropietario en Apto 506', time: 'Hace 3 días', icon: Users, color: 'purple', bgColor: 'bg-purple-500' },
  ];

  const unreadCount = 3; // Número de notificaciones sin leer

  // Data de ejemplo para finanzas
  const expenses = [
    { concept: 'Vigilancia', total: 2500, percentage: 50 },
    { concept: 'Agua', total: 800, percentage: 16 },
    { concept: 'Luz Áreas Comunes', total: 600, percentage: 12 },
    { concept: 'Mantenimiento', total: 700, percentage: 14 },
    { concept: 'Limpieza', total: 400, percentage: 8 },
  ];

  const paymentsHistory = [
    { id: 1, date: '15 Feb 2026', amount: 250, status: 'approved', method: 'Zelle', reference: 'ZL-12345' },
    { id: 2, date: '10 Ene 2026', amount: 250, status: 'approved', method: 'Transferencia', reference: 'TR-98765' },
    { id: 3, date: '5 Ene 2026', amount: 100, status: 'pending', method: 'Zelle', reference: 'ZL-54321' },
    { id: 4, date: '15 Dic 2025', amount: 250, status: 'rejected', method: 'Pago Móvil', reference: 'PM-11111' },
    { id: 5, date: '10 Nov 2025', amount: 250, status: 'approved', method: 'Zelle', reference: 'ZL-22222' },
  ];

  // Data de ejemplo para comunidad
  const documents = [
    { id: 1, title: 'Reglamento de Condominio', type: 'PDF', size: '2.4 MB', date: '15 Ene 2024' },
    { id: 2, title: 'Normas de la Piscina', type: 'PDF', size: '450 KB', date: '20 Mar 2024' },
    { id: 3, title: 'Horarios de Mudanza', type: 'PDF', size: '120 KB', date: '5 Feb 2025' },
    { id: 4, title: 'Reglamento de Mascotas', type: 'PDF', size: '890 KB', date: '10 Ago 2024' },
  ];

  const closedVotes = [
    { id: 1, title: 'Pintura de Fachada', closedDate: 'Hace 1 mes', result: 'Aprobado', percentage: 70, votes: { yes: 28, no: 12 } },
    { id: 2, title: 'Instalación de Gimnasio', closedDate: 'Hace 2 meses', result: 'Rechazado', percentage: 35, votes: { yes: 14, no: 26 } },
    { id: 3, title: 'Aumento de Cuota Mensual', closedDate: 'Hace 3 meses', result: 'Aprobado', percentage: 65, votes: { yes: 26, no: 14 } },
  ];

  const oldCommuniques = [
    { id: 1, title: 'Fumigación Programada', date: '10 Ene 2026', category: 'Mantenimiento' },
    { id: 2, title: 'Cambio de Empresa de Ascensores', date: '5 Dic 2025', category: 'Servicios' },
    { id: 3, title: 'Cierre de Piscina por Mantenimiento', date: '20 Nov 2025', category: 'Áreas Comunes' },
    { id: 4, title: 'Nueva Empresa de Vigilancia', date: '15 Oct 2025', category: 'Seguridad' },
  ];

  const emergencyContacts = [
    { name: 'Conserjería', phone: '+58 412-1234567' },
    { name: 'Vigilancia', phone: '+58 412-7654321' },
    { name: 'Administración', phone: '+58 212-9876543' },
    { name: 'Emergencias Edificio', phone: '+58 424-5556666' },
  ];

  const aliquot = 1.5; // Porcentaje de alícuota del apartamento
  const totalBuildingExpense = 5000;
  const yourShare = (totalBuildingExpense * aliquot) / 100;
  const reserveFund = 25;
  const previousDebt = 0;
  const monthTotal = yourShare + reserveFund + previousDebt;

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  const changeMonth = (direction: number) => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedMonth(newDate);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'rejected': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Aprobado';
      case 'pending': return 'Pendiente';
      case 'rejected': return 'Rechazado';
      default: return status;
    }
  };

  const filteredPayments = paymentFilter === 'todos' 
    ? paymentsHistory 
    : paymentsHistory.filter(p => p.status === paymentFilter);

  const getNotificationColor = (color: string) => {
    const colors: { [key: string]: string } = {
      red: 'bg-red-500',
      orange: 'bg-orange-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      blue: 'bg-blue-500',
    };
    return colors[color] || 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 pb-32">
      {/* Header con degradado suave */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-blue-950/95 to-blue-900/85 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-white text-3xl font-bold tracking-wide">Koda</h1>
            <p className="text-white/50 text-sm font-light">tu comunidad</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Botón de Notificaciones con punto rojo */}
            <button 
              onClick={() => setIsNotificationsOpen(true)}
              className="relative hover:opacity-80 transition-opacity"
            >
              <Bell className="w-6 h-6 text-white" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 w-2.5 h-2.5 rounded-full border-2 border-blue-900" />
              )}
            </button>
            
            {/* Botón de Menú */}
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="hover:opacity-80 transition-opacity"
            >
              <Menu className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Panel de Notificaciones - Modal Flotante */}
      <div 
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          isNotificationsOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Overlay */}
        <div 
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsNotificationsOpen(false)}
        />
        
        {/* Notifications Modal - Flotante y más pequeño */}
        <div 
          className={`absolute top-20 right-4 md:right-8 w-[400px] max-w-[calc(100vw-2rem)] max-h-[600px] bg-white rounded-2xl shadow-2xl transition-all duration-300 ${
            isNotificationsOpen ? 'scale-100 translate-y-0' : 'scale-95 -translate-y-4'
          }`}
        >
          {/* Header del Modal */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-4 rounded-t-2xl flex items-center justify-between">
            <h3 className="text-white text-lg font-semibold">Notificaciones</h3>
            <button 
              onClick={() => setIsNotificationsOpen(false)}
              className="hover:bg-white/20 p-1 rounded-lg transition-all"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Lista de Notificaciones */}
          <div className="overflow-y-auto max-h-[520px]">
            {notifications.map((notif, index) => (
              <div 
                key={notif.id} 
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-all ${
                  index !== notifications.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`${notif.bgColor} p-2 rounded-full shrink-0 mt-1`}>
                    <notif.icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-gray-900 font-semibold text-sm">{notif.title}</h4>
                    <p className="text-gray-600 text-sm mt-1 leading-relaxed">{notif.description}</p>
                    <p className="text-gray-400 text-xs mt-2">{notif.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Menú Lateral (Drawer) */}
      <div 
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Overlay */}
        <div 
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsMenuOpen(false)}
        />
        
        {/* Drawer Panel */}
        <div 
          className={`absolute top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl transition-transform duration-300 ${
            isMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Header del Drawer */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white">{userData?.nombre || 'Usuario'}</h3>
                    <p className="text-white/70 text-sm">{userData?.apartamento || 'Apto'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {userData?.rol === 'admin' && (
                    <div className="px-3 py-1 bg-yellow-400/20 text-yellow-200 rounded-md text-xs">Administrador</div>
                  )}
                  <button 
                    onClick={() => setIsMenuOpen(false)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-all"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </div>

          {/* Opciones del Menú */}
          <div className="p-4 space-y-2">
            <button onClick={() => { setActiveTab('perfil'); setIsMenuOpen(false); }} className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-100 transition-all text-left">
              <User className="w-5 h-5 text-gray-600" />
              <span className="text-gray-700">Perfil</span>
            </button>

            <button className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-100 transition-all text-left">
              <Settings className="w-5 h-5 text-gray-600" />
              <span className="text-gray-700">Configuración</span>
            </button>

            <button className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-100 transition-all text-left">
              <HelpCircle className="w-5 h-5 text-gray-600" />
              <span className="text-gray-700">Ayuda</span>
            </button>

            <button className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-100 transition-all text-left">
              <FileText className="w-5 h-5 text-gray-600" />
              <span className="text-gray-700">Términos Legales</span>
            </button>

            <div className="border-t border-gray-200 my-4"></div>

            <button 
          onClick={onLogout} // <--- AQUÍ CONECTAMOS LA LÓGICA DE LOGOUT
          className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-red-50 transition-all text-left"
       >
          <LogOut className="w-5 h-5 text-red-600" />
          <span className="text-red-600">Cerrar Sesión</span>
       </button>
          </div>

          {/* Footer del Drawer */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500 text-center">Koda Dashboard v1.0</p>
          </div>
        </div>
      </div>

      {/* Main Content - Conditional Rendering */}
      {activeTab === 'inicio' && (
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
      )}

      {activeTab === 'finanzas' && (
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* Selector de Período */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => changeMonth(-1)}
                className="p-2 rounded-lg hover:bg-white/10 transition-all"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <h2 className="text-white text-xl capitalize">{formatMonth(selectedMonth)}</h2>
              <button 
                onClick={() => changeMonth(1)}
                className="p-2 rounded-lg hover:bg-white/10 transition-all"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          {/* Desglose del Recibo */}
          <div className="space-y-4">
            <h2 className="text-white text-xl px-2">Desglose del Recibo</h2>
            
            {/* Tabla de Gastos */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20">
              <h3 className="text-white mb-4">Gastos Comunes del Edificio</h3>
              <div className="space-y-3">
                {expenses.map((expense, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-white/80 text-sm">{expense.concept}</span>
                    <div className="flex items-center gap-4">
                      <div className="w-24 bg-white/20 rounded-full h-2">
                        <div 
                          className="bg-blue-400 h-2 rounded-full" 
                          style={{ width: `${expense.percentage}%` }}
                        />
                      </div>
                      <span className="text-white font-medium w-20 text-right">${expense.total.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cálculo de Tu Cuota */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 shadow-xl">
              <h3 className="text-white/90 text-sm mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Cálculo de Tu Cuota
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/80 text-sm">Gasto Total del Edificio</span>
                  <span className="text-white font-medium">${totalBuildingExpense.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/80 text-sm">Tu Alícuota</span>
                  <span className="text-white font-medium">{aliquot}%</span>
                </div>
                <div className="border-t border-white/20 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white/80 text-sm">Tu Cuota Base</span>
                    <span className="text-white font-medium">${yourShare.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/80 text-sm">+ Fondo de Reserva</span>
                  <span className="text-white font-medium">${reserveFund.toFixed(2)}</span>
                </div>
                {previousDebt > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-white/80 text-sm">+ Deuda Anterior</span>
                    <span className="text-white font-medium">${previousDebt.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-white/30 pt-3 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white text-lg">Total del Mes</span>
                    <span className="text-white text-2xl font-bold">${monthTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Historial de Pagos */}
          <div className="space-y-4">
            <h2 className="text-white text-xl px-2">Historial de Pagos</h2>
            
            {/* Filtros */}
            <div className="flex gap-2 px-2 overflow-x-auto">
              <button 
                onClick={() => setPaymentFilter('todos')}
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
                  paymentFilter === 'todos' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                Todos
              </button>
              <button 
                onClick={() => setPaymentFilter('approved')}
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
                  paymentFilter === 'approved' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                Aprobados
              </button>
              <button 
                onClick={() => setPaymentFilter('pending')}
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
                  paymentFilter === 'pending' 
                    ? 'bg-yellow-600 text-white' 
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                Pendientes
              </button>
              <button 
                onClick={() => setPaymentFilter('rejected')}
                className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
                  paymentFilter === 'rejected' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                Rechazados
              </button>
            </div>

            {/* Lista de Pagos */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20">
              <div className="space-y-4">
                {filteredPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between border-b border-white/10 pb-4 last:border-0 last:pb-0">
                    <div className="flex-1">
                      <h4 className="text-white text-sm">{payment.method}</h4>
                      <p className="text-white/60 text-xs mt-1">{payment.date} • Ref: {payment.reference}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium">${payment.amount.toFixed(2)}</span>
                      <span className={`px-3 py-1 rounded-full text-xs border ${getStatusColor(payment.status)}`}>
                        {getStatusText(payment.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Datos Bancarios */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20">
            <h3 className="text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Datos Bancarios para Pagos
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-white/60 block">Zelle:</span>
                <span className="text-white">pagos@edificiokoda.com</span>
              </div>
              <div>
                <span className="text-white/60 block">Banco:</span>
                <span className="text-white">Banco de Venezuela • 0102-0123-45-6789012345</span>
              </div>
              <div>
                <span className="text-white/60 block">Pago Móvil:</span>
                <span className="text-white">0424-1234567 • V-12345678 • Banco de Venezuela</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'comunidad' && (
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* Documentos y Normativas */}
          <div className="space-y-4">
            <h2 className="text-white text-xl px-2">Documentos y Normativas</h2>
            
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20">
              <div className="space-y-3">
                {documents.map((doc) => (
                  <button 
                    key={doc.id}
                    className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-white/10 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-red-500 p-3 rounded-lg">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-white text-sm">{doc.title}</h4>
                        <p className="text-white/60 text-xs mt-1">{doc.size} • {doc.date}</p>
                      </div>
                    </div>
                    <Download className="w-5 h-5 text-white/60" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Votaciones Cerradas */}
          <div className="space-y-4">
            <h2 className="text-white text-xl px-2">Votaciones Cerradas</h2>
            
            {closedVotes.map((vote) => (
              <div key={vote.id} className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20">
                <div className="flex items-start gap-4 mb-4">
                  <div className="bg-purple-500 p-3 rounded-xl">
                    <Vote className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white mb-1">{vote.title}</h3>
                    <p className="text-white/60 text-sm">{vote.closedDate}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs ${
                    vote.result === 'Aprobado' 
                      ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                      : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}>
                    {vote.result}
                  </span>
                </div>
                
                {/* Barra de Resultados */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/80">A favor: {vote.votes.yes}</span>
                    <span className="text-white/80">En contra: {vote.votes.no}</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-green-500 h-3 rounded-full transition-all" 
                      style={{ width: `${vote.percentage}%` }}
                    />
                  </div>
                  <p className="text-white/60 text-xs text-center">{vote.percentage}% a favor</p>
                </div>
              </div>
            ))}
          </div>

          {/* Archivo de Comunicados */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-white text-xl">Archivo de Comunicados</h2>
              <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all">
                <Search className="w-5 h-5 text-white" />
              </button>
            </div>
            
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20">
              <div className="space-y-3">
                {oldCommuniques.map((comm) => (
                  <button 
                    key={comm.id}
                    className="w-full flex items-start justify-between p-4 rounded-xl hover:bg-white/10 transition-all text-left"
                  >
                    <div className="flex items-start gap-3">
                      <div className="bg-orange-500 p-2 rounded-lg shrink-0">
                        <Megaphone className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h4 className="text-white text-sm">{comm.title}</h4>
                        <p className="text-white/60 text-xs mt-1">{comm.date}</p>
                      </div>
                    </div>
                    <span className="bg-white/10 px-2 py-1 rounded-md text-white/70 text-xs">
                      {comm.category}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Directorio de Emergencias */}
          <div className="space-y-4">
            <h2 className="text-white text-xl px-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Contactos de Emergencia
            </h2>
            
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20">
              <div className="space-y-3">
                {emergencyContacts.map((contact, idx) => (
                  <a 
                    key={idx}
                    href={`tel:${contact.phone}`}
                    className="flex items-center justify-between p-4 rounded-xl hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-500 p-2 rounded-lg">
                        <Phone className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-white text-sm">{contact.name}</span>
                    </div>
                    <span className="text-white/70 text-sm">{contact.phone}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'perfil' && (
        <UserProfile userData={userData} onBack={() => setActiveTab('inicio')} />
      )}

      {/* 5. Barra de Navegación Inferior Flotante (Isla) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none px-4 pb-6">
        <div className="max-w-md mx-auto pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 px-6 py-4">
            <div className="grid grid-cols-3 gap-4">
              <button 
                onClick={() => setActiveTab('inicio')}
                className={`flex flex-col items-center gap-2 py-3 px-4 rounded-2xl transition-all ${
                  activeTab === 'inicio' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <Home className="w-6 h-6" />
                <span className="text-xs font-medium">Inicio</span>
              </button>

              <button 
                onClick={() => setActiveTab('finanzas')}
                className={`flex flex-col items-center gap-2 py-3 px-4 rounded-2xl transition-all ${
                  activeTab === 'finanzas' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <Wallet className="w-6 h-6" />
                <span className="text-xs font-medium">Finanzas</span>
              </button>

              <button 
                onClick={() => setActiveTab('comunidad')}
                className={`flex flex-col items-center gap-2 py-3 px-4 rounded-2xl transition-all ${
                  activeTab === 'comunidad' 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <Users className="w-6 h-6" />
                <span className="text-xs font-medium">Comunidad</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};