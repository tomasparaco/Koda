import { useState, useEffect } from 'react';
import {
  DollarSign, Wrench, Clock, CreditCard, Home, Wallet, Users, User,
  Megaphone, Vote, Calendar, CheckCircle, Menu, X, Settings,
  HelpCircle, FileText, LogOut, Bell, ChevronLeft, ChevronRight,
  Download, Search, Filter, Phone, AlertCircle, TrendingUp
} from 'lucide-react';
import type { Propietario } from '../../types'; // Ajusta la ruta a tu archivo de tipos
import UserProfile from './UserProfile';
import ReportPaymentModal from './ReportPaymentModal';
import { LegalTermsModal } from './LegalTermsModal';
import { PagoService } from '../../services/pago.service';
import { GastoService } from '../../services/gasto.service';
import { bcvService } from '../../services/bcv.service';

interface UserDashboardProps {
  onLogout: () => void;
  userData: Propietario;
  onBackToSelector: () => void;
}

export default function UserDashboard({ onLogout, userData, onBackToSelector }: UserDashboardProps) {
  // --- CONEXIÓN DE DEUDA CON SUPABASE ---
  const balance = Number(userData?.deuda) || 0;
  // --------------------------------------

  const [bcvRate, setBcvRate] = useState(45.50); // Tasa BCV por defecto
  const [bcvDate, setBcvDate] = useState('Cargando...');
  const [isLoadingBcv, setIsLoadingBcv] = useState(true);

  useEffect(() => {
    const fetchBcv = async () => {
      const data = await bcvService.getLatestRate();
      setBcvRate(data.rate);
      setBcvDate(data.lastUpdate);
      setIsLoadingBcv(false);
    };
    fetchBcv();
  }, []);
  const [activeTab, setActiveTab] = useState('inicio'); // Estado para la navegación
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Estado para el menú lateral
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false); // Estado para notificaciones
  const [isHelpOpen, setIsHelpOpen] = useState(false); // Estado para sección de ayuda en el menú
  const [selectedFaq, setSelectedFaq] = useState<number | null>(null); // índice de FAQ seleccionada

  // highlights para secciones navegables
  const [highlightBank, setHighlightBank] = useState(false);
  const [highlightProfile, setHighlightProfile] = useState(false);
  const [highlightFault, setHighlightFault] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(new Date()); // Mes Actual
  const [paymentFilter, setPaymentFilter] = useState('todos'); // Estado para filtros de pagos
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isLegalTermsOpen, setIsLegalTermsOpen] = useState(false);

  const bolivares = balance * bcvRate;
  const isSolvent = balance <= 0;

  // Preguntas frecuentes para el apartado de ayuda (algunas tienen destino)
  const faqs = [
    {
      question: '¿Cómo hacer un pago?',
      answer: 'Para realizar un pago, vaya a la sección "Finanzas" desde el menú inferior, seleccione el mes que desea pagar y pulse "REPORTAR PAGO". Siga las instrucciones para subir el comprobante o los datos de la transacción.'
    },
    {
      question: '¿Cómo puedo reportar una falla?',
      answer: 'En la página principal, utilice el botón "Reportar Falla" en Accesos Rápidos. Complete el formulario con la descripción y, si lo desea, adjunte una foto. Nuestro equipo revisará el reporte lo antes posible.',
      target: 'fault'
    },
    {
      question: '¿Dónde encuentro mis datos bancarios?',
      answer: 'Los datos bancarios están disponibles en la pestaña "Finanzas" dentro de la sección "Datos Bancarios para Pagos".',
      target: 'bank'
    },
    {
      question: '¿Cómo cambio mi información personal?',
      answer: 'Acceda a "Perfil" desde el menú lateral y allí podrá editar su nombre, teléfono, correo y demás información personal.',
      target: 'profile'
    },
  ];

  // Data de ejemplo para notificaciones
  const notifications = [
    { id: 1, type: 'payment', title: 'Pagos Pendientes', description: '3 pagos requieren tu aprobación', time: 'Hace 2 horas', icon: DollarSign, color: 'red', bgColor: 'bg-red-500' },
    { id: 2, type: 'ticket', title: 'Nuevo Ticket', description: 'Reporte de filtración en Apto 304', time: 'Hace 5 horas', icon: Wrench, color: 'orange', bgColor: 'bg-orange-500' },
    { id: 3, type: 'payment', title: 'Pago Confirmado', description: 'Apto 201 completó su pago mensual', time: 'Hace 1 día', icon: CheckCircle, color: 'green', bgColor: 'bg-green-500' },
    { id: 4, type: 'vote', title: 'Votación Activa', description: '15 vecinos han votado en la encuesta', time: 'Hace 2 días', icon: Vote, color: 'blue', bgColor: 'bg-blue-500' },
    { id: 5, type: 'community', title: 'Nuevo Vecino', description: 'Se registró un nuevo copropietario en Apto 506', time: 'Hace 3 días', icon: Users, color: 'purple', bgColor: 'bg-purple-500' },
  ];

  const unreadCount = 3;

  // Data de estado para finanzas reales
  const [expenses, setExpenses] = useState<{ concept: string; total: number; percentage: number }[]>([]);
  const [totalBuildingExpense, setTotalBuildingExpense] = useState(0);

  useEffect(() => {
    const fetchGastos = async () => {
      if (!userData?.codigo_edificio) return;

      const gastosData = await GastoService.getGastos(userData.codigo_edificio);
      if (!Array.isArray(gastosData)) return;

      const gastosPorMes = gastosData.filter(g => {
        // g.fecha_gasto viene como 'YYYY-MM-DD' de la DB (normalmente). Lo parseamos localmente:
        const [year, month] = g.fecha_gasto.split('-');
        return parseInt(month) - 1 === selectedMonth.getMonth() && parseInt(year) === selectedMonth.getFullYear();
      });

      let subtotalMes = 0;
      const gastosAgrupados: Record<string, number> = {};

      gastosPorMes.forEach((g: any) => {
        const monto = Number(g.monto);
        subtotalMes += monto;
        gastosAgrupados[g.categoria] = (gastosAgrupados[g.categoria] || 0) + monto;
      });

      setTotalBuildingExpense(subtotalMes);

      // Calcular porcentajes
      const expensesList = Object.keys(gastosAgrupados).map(cat => {
        const total = gastosAgrupados[cat];
        return {
          concept: cat,
          total: total,
          percentage: subtotalMes > 0 ? (total / subtotalMes) * 100 : 0
        };
      }).sort((a, b) => b.total - a.total);

      setExpenses(expensesList);
    };

    fetchGastos();
  }, [userData?.codigo_edificio, selectedMonth]);

  const [paymentsHistory, setPaymentsHistory] = useState<any[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);

  useEffect(() => {
    if (userData?.id_propietario) {
      const fetchPayments = async () => {
        setIsLoadingPayments(true);
        const { exito, data } = await PagoService.getPagosUsuario(userData.id_propietario);
        if (exito && data) {
          setPaymentsHistory(data);
        }
        setIsLoadingPayments(false);
      };
      fetchPayments();
    }
  }, [userData?.id_propietario, activeTab, isPaymentModalOpen]);

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

  const aliquot = Number(userData?.alicuota) || 0;
  const yourShare = (totalBuildingExpense * aliquot) / 100;
  const previousDebt = 0; // Assuming no separate previous debt calculation unless specified
  const monthTotal = yourShare + previousDebt;

  const formatMonth = (date: Date) => {
    const monthName = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const now = new Date();
    const isCurrentMonth = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    return isCurrentMonth ? `${monthName} (Mes actual)` : monthName;
  };

  const changeMonth = (direction: number) => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    const now = new Date();

    // Evitar ir a meses futuros
    if (newDate.getFullYear() > now.getFullYear() || (newDate.getFullYear() === now.getFullYear() && newDate.getMonth() > now.getMonth())) {
      return;
    }

    setSelectedMonth(newDate);
  };

  const now = new Date();
  const isNextMonthDisabled = selectedMonth.getFullYear() === now.getFullYear() && selectedMonth.getMonth() === now.getMonth();

  // maneja navegación/iluminado a partir de FAQs con destino
  const handleFaqClick = (idx: number) => {
    const faq = faqs[idx] as any;
    setSelectedFaq(idx);
    if (faq.target) {
      switch (faq.target) {
        case 'bank':
          setActiveTab('finanzas');
          setHighlightBank(true);
          setTimeout(() => setHighlightBank(false), 3000);
          break;
        case 'profile':
          setActiveTab('perfil');
          setHighlightProfile(true);
          setTimeout(() => setHighlightProfile(false), 3000);
          break;
        case 'fault':
          setActiveTab('inicio');
          setHighlightFault(true);
          setTimeout(() => setHighlightFault(false), 3000);
          break;
      }
      // cerrar menú y ayuda
      setIsMenuOpen(false);
      setIsHelpOpen(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprobado': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'pendiente': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'rechazado': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'aprobado': return 'Aprobado';
      case 'pendiente': return 'Pendiente';
      case 'rechazado': return 'Rechazado';
      default: return status;
    }
  };

  const filteredPaymentsByStatus = paymentFilter === 'todos'
    ? paymentsHistory
    : paymentsHistory.filter(p => p.estado === paymentFilter);

  const filteredPayments = filteredPaymentsByStatus.filter(p => {
    if (!p.fecha_pago) return false;
    // p.fecha_pago suele venir como 'YYYY-MM-DD' si es date, o ISO si es timestamp.
    const dateStr = p.fecha_pago.split('T')[0];
    const [year, month] = dateStr.split('-');
    return parseInt(month) - 1 === selectedMonth.getMonth() && parseInt(year) === selectedMonth.getFullYear();
  });

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
            <button
              onClick={() => setIsNotificationsOpen(true)}
              className="relative hover:opacity-80 transition-opacity"
            >
              <Bell className="w-6 h-6 text-white" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 w-2.5 h-2.5 rounded-full border-2 border-blue-900" />
              )}
            </button>
            <button
              onClick={() => setIsMenuOpen(true)}
              className="hover:opacity-80 transition-opacity"
            >
              <Menu className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Panel de Notificaciones */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${isNotificationsOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsNotificationsOpen(false)} />
        <div className={`absolute top-20 right-4 md:right-8 w-[400px] max-w-[calc(100vw-2rem)] max-h-[600px] bg-white rounded-2xl shadow-2xl transition-all duration-300 ${isNotificationsOpen ? 'scale-100 translate-y-0' : 'scale-95 -translate-y-4'}`}>
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-4 rounded-t-2xl flex items-center justify-between">
            <h3 className="text-white text-lg font-semibold">Notificaciones</h3>
            <button onClick={() => setIsNotificationsOpen(false)} className="hover:bg-white/20 p-1 rounded-lg transition-all">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="overflow-y-auto max-h-[520px]">
            {notifications.map((notif, index) => (
              <div key={notif.id} className={`p-4 hover:bg-gray-50 cursor-pointer transition-all ${index !== notifications.length - 1 ? 'border-b border-gray-100' : ''}`}>
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
      <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setIsMenuOpen(false); setIsHelpOpen(false); setSelectedFaq(null); }} />
        <div className={`absolute top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl transition-transform duration-300 ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
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
                <button onClick={() => { setIsMenuOpen(false); setIsHelpOpen(false); setSelectedFaq(null); }} className="p-2 rounded-lg hover:bg-white/10 transition-all">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-2">
            <button onClick={() => { setActiveTab('perfil'); setIsMenuOpen(false); }} className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-100 transition-all text-left">
              <User className="w-5 h-5 text-gray-600" />
              <span className="text-gray-700">Perfil</span>
            </button>
            <button className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-100 transition-all text-left">
              <Settings className="w-5 h-5 text-gray-600" />
              <span className="text-gray-700">Configuración</span>
            </button>
            <button onClick={onBackToSelector} className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-blue-50 transition-all text-left">
              <Home className="w-5 h-5 text-blue-600" />
              <span className="text-blue-600 font-medium">Cambiar de Edificio/Apartamento</span>
            </button>
            <button
              onClick={() => {
                setIsHelpOpen(prev => !prev);
                setSelectedFaq(null); // reset any answer when toggling
              }}
              className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-100 transition-all text-left"
            >
              <HelpCircle className="w-5 h-5 text-gray-600" />
              <span className="text-gray-700">Ayuda</span>
            </button>
            {isHelpOpen && (
              <div className="ml-8 space-y-1">
                {faqs.map((faq, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleFaqClick(idx)}
                    className="w-full text-left text-gray-600 text-sm py-1 hover:underline"
                  >
                    {faq.question}
                  </button>
                ))}
                {selectedFaq !== null && (
                  <div className="mt-2 p-3 bg-white/10 text-white rounded-lg text-sm">
                    {faqs[selectedFaq].answer}
                  </div>
                )}
              </div>
            )}
            <button onClick={() => setIsLegalTermsOpen(true)} className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-100 transition-all text-left">
              <FileText className="w-5 h-5 text-gray-600" />
              <span className="text-gray-700">Términos Legales</span>
            </button>
            <div className="border-t border-gray-200 my-4"></div>
            <button onClick={onLogout} className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-red-50 transition-all text-left">
              <LogOut className="w-5 h-5 text-red-600" />
              <span className="text-red-600">Cerrar Sesión</span>
            </button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500 text-center">Koda Dashboard v1.0</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {activeTab === 'inicio' && (
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* 1. Estado de Cuenta / Deuda */}
          <div className={`rounded-3xl p-8 shadow-2xl transition-all ${isSolvent ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-red-600 to-red-700'}`}>
            <div className="text-white/80 text-sm mb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              {isSolvent ? 'Estado de Cuenta' : 'Deuda Pendiente'}
            </div>

            {isSolvent ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="w-12 h-12 text-white" />
                  <h1 className="text-4xl text-white">Estás Solvente</h1>
                </div>
                {balance < 0 ? (
                  <div className="bg-white/20 border border-white/30 rounded-xl p-4 flex justify-between items-center shadow-inner">
                    <span className="text-white/90 text-sm xl:text-base font-medium">Saldo a favor (Fondo):</span>
                    <span className="text-white font-bold text-2xl">${Math.abs(balance).toFixed(2)}</span>
                  </div>
                ) : (
                  <p className="text-white/90 text-lg">¡No tienes pagos pendientes!</p>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-1 mb-4">
                  <h1 className="text-5xl text-white font-bold">${balance.toFixed(2)}</h1>
                  <p className="text-white/90 text-xl font-medium">
                    Bs. {bolivares.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="flex items-center justify-between mb-6">
                  <div className="text-white/80 text-sm bg-black/20 px-3 py-1.5 rounded-lg border border-white/10 flex flex-col">
                    <span>Tasa BCV: Bs. {bcvRate.toFixed(2)}</span>
                    <span className="text-[10px] text-white/50">{isLoadingBcv ? 'Actualizando...' : `Act: ${bcvDate}`}</span>
                  </div>
                  <div className="text-white flex items-center gap-1.5 text-sm bg-black/20 px-3 py-1.5 rounded-lg border border-white/10 animate-pulse">
                    <AlertCircle className="w-4 h-4" />
                    Requiere Pago
                  </div>
                </div>
                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="w-full bg-white text-red-700 font-bold py-4 rounded-2xl hover:bg-red-50 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  REPORTAR PAGO
                </button>
              </>
            )}
          </div>

          {/* Agrega el modal aquí */}
          <ReportPaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            userData={userData}
          />

          {/* 2. Botonera de Accesos Rápidos */}
          <div className="grid grid-cols-3 gap-4">
            <button className={`bg-white/10 backdrop-blur-lg rounded-2xl p-6 hover:bg-white/20 transition-all border border-white/20 shadow-lg ${highlightFault ? 'ring-2 ring-yellow-300 animate-pulse' : ''}`}>
              <div className="flex flex-col items-center gap-3">
                <div className="bg-blue-500 p-4 rounded-full">
                  <Wrench className="w-6 h-6 text-white" />
                </div>
                <span className="text-white text-sm text-center">Reportar Falla</span>
              </div>
            </button>
            <button onClick={() => setActiveTab('finanzas')} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 hover:bg-white/20 transition-all border border-white/20 shadow-lg">
              <div className="flex flex-col items-center gap-3">
                <div className="bg-blue-500 p-4 rounded-full">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <span className="text-white text-sm text-center">Historial de Pagos</span>
              </div>
            </button>
            <button onClick={() => setActiveTab('finanzas')} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 hover:bg-white/20 transition-all border border-white/20 shadow-lg">
              <div className="flex flex-col items-center gap-3">
                <div className="bg-blue-500 p-4 rounded-full">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <span className="text-white text-sm text-center">Datos Bancarios</span>
              </div>
            </button>
          </div>

          {/* 3. Lo que está pasando */}
          <div className="space-y-4">
            <h2 className="text-white text-xl px-2">Lo que está pasando</h2>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 hover:bg-white/20 transition-all border border-white/20 shadow-lg cursor-pointer">
              <div className="flex items-start gap-4">
                <div className="bg-orange-500 p-3 rounded-xl shrink-0">
                  <Megaphone className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white mb-1">Mantenimiento de Ascensor</h3>
                  <p className="text-white/70 text-sm">Se realizará mantenimiento preventivo el próximo lunes 10 de febrero.</p>
                  <p className="text-white/50 text-xs mt-2">Hace 2 horas</p>
                </div>
              </div>
            </div>
            {/* ... Votación y Asamblea omitidas visualmente aquí por brevedad, pero presentes en la estructura ... */}
          </div>

          {/* 4. Mis Gestiones */}
          <div className="space-y-4">
            <h2 className="text-white text-xl px-2">Mis Gestiones</h2>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20 shadow-lg">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-white text-sm">Filtración en el techo</h4>
                    <p className="text-white/60 text-xs mt-1">Reportado el 28 de enero</p>
                  </div>
                  <span className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-xs border border-yellow-500/30">En Proceso</span>
                </div>
                <div className="border-t border-white/10 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-white text-sm">Luz del pasillo no funciona</h4>
                      <p className="text-white/60 text-xs mt-1">Reportado el 20 de enero</p>
                    </div>
                    <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-xs border border-green-500/30">Resuelto</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pestaña Finanzas */}
      {activeTab === 'finanzas' && (
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg hover:bg-white/10 transition-all"><ChevronLeft className="w-6 h-6 text-white" /></button>
              <h2 className="text-white text-xl capitalize font-medium">{formatMonth(selectedMonth)}</h2>
              <button
                onClick={() => changeMonth(1)}
                disabled={isNextMonthDisabled}
                className="p-2 rounded-lg hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          {/* Desglose del Recibo */}
          <div className="space-y-4">
            <h2 className="text-white text-xl px-2">Desglose del Recibo</h2>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-white font-semibold mb-4">Gastos Comunes del Edificio</h3>
              {expenses.length === 0 ? (
                <p className="text-white/60 text-sm mb-6">No hay gastos registrados en este mes.</p>
              ) : (
                <div className="space-y-4 mb-6">
                  {expenses.map((expense, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-4">
                      <span className="text-white/80 text-sm flex-1">{expense.concept}</span>
                      <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-400 rounded-full" style={{ width: `${expense.percentage}%` }} />
                      </div>
                      <span className="text-white font-medium w-20 text-right">${expense.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-blue-600/30 -mx-6 -mb-6 p-6 rounded-b-2xl border-t border-blue-500/30">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Cálculo de Tu Cuota
                </h3>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/80">Gasto Total del Edificio</span>
                    <span className="text-white font-medium">${totalBuildingExpense.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/80">Tu Alícuota</span>
                    <span className="text-white font-medium">{aliquot.toFixed(2)}%</span>
                  </div>
                </div>

                <div className="border-t border-blue-500/30 pt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/90">Tu Cuota</span>
                    <span className="text-white font-semibold">${yourShare.toFixed(2)}</span>
                  </div>
                </div>

                <div className="border-t border-blue-500/30 mt-4 pt-4 flex justify-between items-center">
                  <span className="text-white text-lg">Total del Mes</span>
                  <span className="text-white text-3xl font-bold">${monthTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-white text-xl px-2">Historial de Pagos</h2>
            <div className="flex gap-2 px-2 overflow-x-auto">
              {['todos', 'aprobado', 'pendiente', 'rechazado'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setPaymentFilter(filter)}
                  className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${paymentFilter === filter ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                >
                  {filter === 'todos' ? 'Todos' : getStatusText(filter)}
                </button>
              ))}
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20">
              <div className="space-y-4">
                {isLoadingPayments ? (
                  <div className="text-white text-center py-4">Cargando pagos...</div>
                ) : filteredPayments.length === 0 ? (
                  <div className="text-white/60 text-center py-4">No hay pagos registrados.</div>
                ) : (
                  filteredPayments.map((payment) => (
                    <div key={payment.d_pago} className="flex items-center justify-between border-b border-white/10 pb-4 last:border-0 last:pb-0">
                      <div className="flex-1">
                        <h4 className="text-white text-sm">{payment.metodo}</h4>
                        <p className="text-white/60 text-xs mt-1">{new Date(payment.fecha_pago).toLocaleDateString('es-ES')} • Ref: {payment.referencia}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-white font-medium">${Number(payment.monto).toFixed(2)}</span>
                        <span className={`px-3 py-1 rounded-full text-xs border ${getStatusColor(payment.estado)}`}>
                          {getStatusText(payment.estado)}
                        </span>
                      </div>
                      {payment.estado === 'rechazado' && payment.motivo_rechazo && (
                        <div className="w-full mt-3 bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-red-200 text-sm">
                          <strong>Motivo del rechazo:</strong> {payment.motivo_rechazo}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Datos Bancarios */}
          <div className={`bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20 ${highlightBank ? 'ring-2 ring-yellow-300 animate-pulse' : ''}`}>
            <h3 className="text-white mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5" /> Datos Bancarios para Pagos</h3>
            <div className="space-y-3 text-sm">
              <div><span className="text-white/60 block">Zelle:</span><span className="text-white">pagos@edificiokoda.com</span></div>
              <div><span className="text-white/60 block">Banco:</span><span className="text-white">Banco de Venezuela • 0102-0123-45-6789012345</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Pestaña Comunidad */}
      {activeTab === 'comunidad' && (
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* Documentos */}
          <div className="space-y-4">
            <h2 className="text-white text-xl px-2">Documentos y Normativas</h2>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20">
              <div className="space-y-3">
                {documents.map((doc) => (
                  <button key={doc.id} className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-white/10 transition-all text-left">
                    <div className="flex items-center gap-3">
                      <div className="bg-red-500 p-3 rounded-lg"><FileText className="w-5 h-5 text-white" /></div>
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
        </div>
      )}

      {activeTab === 'perfil' && (
        <UserProfile userData={userData} onBack={() => setActiveTab('inicio')} highlight={highlightProfile} />
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none px-4 pb-6">
        <div className="max-w-md mx-auto pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 px-6 py-4">
            <div className="grid grid-cols-3 gap-4">
              {['inicio', 'finanzas', 'comunidad'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex flex-col items-center gap-2 py-3 px-4 rounded-2xl transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105' : 'hover:bg-gray-100 text-gray-600'
                    }`}
                >
                  {tab === 'inicio' && <Home className="w-6 h-6" />}
                  {tab === 'finanzas' && <Wallet className="w-6 h-6" />}
                  {tab === 'comunidad' && <Users className="w-6 h-6" />}
                  <span className="text-xs font-medium capitalize">{tab}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <LegalTermsModal
        isOpen={isLegalTermsOpen}
        onClose={() => setIsLegalTermsOpen(false)}
      />
    </div>
  );
}