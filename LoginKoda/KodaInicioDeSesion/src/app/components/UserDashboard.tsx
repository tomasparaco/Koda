import { useState, useEffect } from 'react';
import {
  DollarSign, Wrench, Clock, CreditCard, Home, Wallet, Users, User,
  Megaphone, Vote, Calendar, CheckCircle, Menu, X, Settings,
  HelpCircle, FileText, LogOut, Bell, ChevronLeft, ChevronRight,
  Download, Search, Filter, Phone, AlertCircle, TrendingUp, Mail,
  Plus, ExternalLink, Building2, Calculator, RefreshCw, Receipt, Upload, Banknote, Lock, Eye, Star
} from 'lucide-react';
import type { Propietario } from '../../types';
import { supabase } from '../../lib/supabase';
import { GastoService } from '../../services/gasto.service';
import { PagoService } from '../../services/pago.service';
import { bcvService } from '../../services/bcv.service';
import { ComunidadService, DocumentoCondominio, ContactoEmergencia } from '../../services/comunidad.service';
import { CuentaBancariaService, CuentaBancaria } from '../../services/cuenta_bancaria.service';
import { EncuestaService } from '../../services/encuesta.service'; // <-- IMPORTACIÓN NECESARIA
import UserProfile from './UserProfile';
import ReportPaymentModal from './ReportPaymentModal';
import { LegalTermsModal } from './LegalTermsModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { ReciboService } from '../../services/recibo.service';
import kodaLogo from '../../assets/LogoKoda4.png';
import { TicketService } from '../../services/ticket.service';
import ReportTicketModal from './ReportTicketModal';
import UserVotacionesModal from './UserVotacionesModal'; // <-- IMPORTACIÓN DEL MODAL

interface UserDashboardProps {
  onLogout: () => void;
  userData: Propietario;
  onBackToSelector: () => void;
}

export default function UserDashboard({ onLogout, userData, onBackToSelector }: UserDashboardProps) {
  const balance = Number(userData?.deuda) || 0;

  const [bcvRate, setBcvRate] = useState(45.50); 
  const [bcvDate, setBcvDate] = useState('Cargando...');
  const [isLoadingBcv, setIsLoadingBcv] = useState(true);

  const [cuentasBancarias, setCuentasBancarias] = useState<CuentaBancaria[]>([]);
  const [isLoadingBank, setIsLoadingBank] = useState(false);

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false); 
  const [selectedPaymentProof, setSelectedPaymentProof] = useState<string | null>(null);
  const [currentRecibo, setCurrentRecibo] = useState<any>(null);

  const [isQuickBankModalOpen, setIsQuickBankModalOpen] = useState(false);

  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null); 
  
  // NUEVO ESTADO: Controla el Modal de Votaciones Activas
  const [isVotacionesModalOpen, setIsVotacionesModalOpen] = useState(false);

  // NUEVO ESTADO: Guarda las votaciones cerradas para dibujarlas con tu diseño
  const [votacionesCerradas, setVotacionesCerradas] = useState<any[]>([]);

  const [ticketRating, setTicketRating] = useState<number>(0);
  const [ticketRatingComment, setTicketRatingComment] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  useEffect(() => {
    if (selectedTicket) {
      setTicketRating(selectedTicket.calificacion || 0);
      setTicketRatingComment(selectedTicket.comentario_calificacion || '');
    }
  }, [selectedTicket]);

  const handleRateTicket = async () => {
    if (!selectedTicket || ticketRating === 0) return;
    setIsSubmittingRating(true);
    const result = await TicketService.rateTicket(selectedTicket.id_ticket, ticketRating, ticketRatingComment);
    setIsSubmittingRating(false);
    
    if (result.exito) {
      setSelectedTicket({ ...selectedTicket, calificacion: ticketRating, comentario_calificacion: ticketRatingComment });
      setUserTickets(prev => prev.map(t => 
        t.id_ticket === selectedTicket.id_ticket 
          ? { ...t, calificacion: ticketRating, comentario_calificacion: ticketRatingComment }
          : t
      ));
      alert('¡Gracias por calificar la atención!');
    } else {
      alert('Error al enviar la calificación: ' + result.mensaje);
    }
  };

  const getTicketStatusColor = (estado: string) => {
    switch (estado) {
      case 'abierto': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'en_proceso': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'cerrado': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'rechazado': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getTicketStatusText = (estado: string) => {
    switch (estado) {
      case 'abierto': return 'Abierto';
      case 'en_proceso': return 'En Proceso';
      case 'cerrado': return 'Completado';
      case 'rechazado': return 'Rechazado';
      default: return 'Desconocido';
    }
  };

  useEffect(() => {
    const fetchBcv = async () => {
      const data = await bcvService.getLatestRate();
      setBcvRate(data.rate);
      setBcvDate(data.lastUpdate);
      setIsLoadingBcv(false);
    };
    fetchBcv();
  }, []);

  const [activeTab, setActiveTab] = useState('inicio'); 
  const [isMenuOpen, setIsMenuOpen] = useState(false); 
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false); 
  const [isHelpOpen, setIsHelpOpen] = useState(false); 
  const [selectedFaq, setSelectedFaq] = useState<number | null>(null);

  const [supportMessage, setSupportMessage] = useState('');
  const [isSendingSupport, setIsSendingSupport] = useState(false);

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;
    setIsSendingSupport(true);
    try {
      const response = await fetch("https://formsubmit.co/ajax/paracoreyestomassta@gmail.com", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
        },
        body: JSON.stringify({
            _subject: `Soporte Técnico Koda - Apto ${userData?.apartamento}`,
            _template: "table",
            Nombre: userData?.nombre || "Usuario no identificado",
            Apartamento: userData?.apartamento || "Desconocido",
            Edificio: userData?.codigo_edificio || "Desconocido",
            Mensaje: supportMessage
        })
      });
      if (response.ok) {
        alert("¡Mensaje enviado exitosamente a Soporte Koda! Te contactaremos pronto.");
        setSupportMessage('');
      } else {
        alert("Ocurrió un error al enviar tu mensaje. Intenta de nuevo.");
      }
    } catch (error) {
      console.error(error);
      alert("No se pudo conectar con el servidor de correos.");
    } finally {
      setIsSendingSupport(false);
    }
  };

  const [highlightBank, setHighlightBank] = useState(false);
  const [highlightProfile, setHighlightProfile] = useState(false);
  const [highlightFault, setHighlightFault] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(new Date()); 
  const [paymentFilter, setPaymentFilter] = useState('todos'); 
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isLegalTermsOpen, setIsLegalTermsOpen] = useState(false);

  const roundedBcvRate = Math.round(bcvRate * 100) / 100;
  const roundedBalance = Math.round(balance * 100) / 100;
  const bolivares = roundedBalance * roundedBcvRate;
  
  const isSolvent = balance <= 0;

  useEffect(() => {
    const fetchBankData = async () => {
      if (activeTab === 'finanzas' || (activeTab === 'inicio' && userData?.codigo_edificio)) {
        setIsLoadingBank(true);
        try {
          const res = await CuentaBancariaService.getCuentas(userData.codigo_edificio);
          if (res.exito && res.data) {
            setCuentasBancarias(res.data);
          }
        } catch (err) {
          console.error("Error al obtener datos bancarios:", err);
        } finally {
          setIsLoadingBank(false);
        }
      }
    };
    fetchBankData();
  }, [activeTab, userData?.codigo_edificio]);

  const faqs = [
    { question: '¿Cómo hacer un pago?', answer: 'Vaya a "Finanzas", seleccione el mes y pulse "REPORTAR PAGO".' },
    { question: '¿Cómo puedo reportar una falla?', answer: 'Utilice el botón "Reportar Falla" en Accesos Rápidos.', target: 'fault' },
    { question: '¿Dónde encuentro mis datos bancarios?', answer: 'Están disponibles en la pestaña "Finanzas".', target: 'bank' },
    { question: '¿Cómo cambio mi información personal?', answer: 'Acceda a "Perfil" desde el menú lateral.', target: 'profile' },
  ];

  const notifications = [
    { id: 1, type: 'payment', title: 'Pagos Pendientes', description: '3 pagos requieren tu aprobación', time: 'Hace 2 horas', icon: DollarSign, color: 'red', bgColor: 'bg-red-500' },
    { id: 2, type: 'ticket', title: 'Nuevo Ticket', description: 'Reporte de filtración en Apto 304', time: 'Hace 5 horas', icon: Wrench, color: 'orange', bgColor: 'bg-orange-500' },
    { id: 3, type: 'payment', title: 'Pago Confirmado', description: 'Apto 201 completó su pago mensual', time: 'Hace 1 día', icon: CheckCircle, color: 'green', bgColor: 'bg-green-500' },
    { id: 4, type: 'vote', title: 'Votación Activa', description: '15 vecinos han votado en la encuesta', time: 'Hace 2 días', icon: Vote, color: 'blue', bgColor: 'bg-blue-500' },
    { id: 5, type: 'community', title: 'Nuevo Vecino', description: 'Se registró un nuevo copropietario en Apto 506', time: 'Hace 3 días', icon: Users, color: 'purple', bgColor: 'bg-purple-500' },
  ];

  const unreadCount = 3;

  const [expenses, setExpenses] = useState<{ concept: string; total: number; percentage: number }[]>([]);
  const [totalBuildingExpense, setTotalBuildingExpense] = useState(0);

  useEffect(() => {
    const fetchGastos = async () => {
      if (!userData?.codigo_edificio) return;

      const gastosData = await GastoService.getGastos(userData.codigo_edificio);
      if (!Array.isArray(gastosData)) return;

      const gastosPorMes = gastosData.filter(g => {
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

  useEffect(() => {
    const fetchRecibo = async () => {
      if (!userData?.id_propietario) return;
      const year = selectedMonth.getFullYear();
      const month = String(selectedMonth.getMonth() + 1).padStart(2, '0');
      const periodo = `${year}-${month}-01`;
      const recibo = await ReciboService.getReciboUsuario(userData.id_propietario, periodo);
      setCurrentRecibo(recibo);
    };
    fetchRecibo();
  }, [userData?.id_propietario, selectedMonth]);

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

  const [documents, setDocuments] = useState<DocumentoCondominio[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<ContactoEmergencia[]>([]);
  const [previewDoc, setPreviewDoc] = useState<DocumentoCondominio | null>(null);

  const [userTickets, setUserTickets] = useState<any[]>([]);
  const [ticketUserFilter, setTicketUserFilter] = useState<'todos' | 'abierto' | 'en_proceso' | 'cerrado' | 'rechazado'>('todos');

  const handleDownload = async (url: string, titulo: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = titulo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      window.open(url, '_blank');
    }
  };

  useEffect(() => {
    if (userData?.codigo_edificio) {
      const fetchComunidad = async () => {
        const resDocs = await ComunidadService.getDocumentos(userData.codigo_edificio);
        if (resDocs.exito) setDocuments(resDocs.data);

        const resContacts = await ComunidadService.getContactos(userData.codigo_edificio);
        if (resContacts.exito) setEmergencyContacts(resContacts.data);
        
        // Cargar Votaciones Cerradas reales
        const resVotos = await EncuestaService.getEncuestas(userData.codigo_edificio);
        if (resVotos) {
          setVotacionesCerradas(resVotos.filter(enc => !enc.activa));
        }
      };
      fetchComunidad();
    }
  }, [userData?.codigo_edificio, isVotacionesModalOpen]); // Se actualiza si cierra el modal de votar

  useEffect(() => {
    if (userData?.id_propietario) {
      const fetchTickets = async () => {
        const res = await TicketService.getTicketsByPropietario(userData.id_propietario);
        if (res.exito && res.data) {
          setUserTickets(res.data);
        }
      };
      fetchTickets();
    }
  }, [userData?.id_propietario, isTicketModalOpen, activeTab]);

  const oldCommuniques = [
    { id: 1, title: 'Fumigación Programada', date: '10 Ene 2026', category: 'Mantenimiento' },
    { id: 2, title: 'Cambio de Empresa de Ascensores', date: '5 Dic 2025', category: 'Servicios' },
    { id: 3, title: 'Cierre de Piscina por Mantenimiento', date: '20 Nov 2025', category: 'Áreas Comunes' },
    { id: 4, title: 'Nueva Empresa de Vigilancia', date: '15 Oct 2025', category: 'Seguridad' },
  ];

  const aliquot = Number(userData?.alicuota) || 0;
  const yourShare = (totalBuildingExpense * aliquot) / 100;
  const previousDebt = 0; 
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
    if (newDate.getFullYear() > now.getFullYear() || (newDate.getFullYear() === now.getFullYear() && newDate.getMonth() > now.getMonth())) return;
    setSelectedMonth(newDate);
  };

  const now = new Date();
  const isNextMonthDisabled = selectedMonth.getFullYear() === now.getFullYear() && selectedMonth.getMonth() === now.getMonth();

  const handleFaqClick = (idx: number) => {
    const faq = faqs[idx] as any;
    setSelectedFaq(idx);
    if (faq.target) {
      switch (faq.target) {
        case 'bank': setActiveTab('finanzas'); setHighlightBank(true); setTimeout(() => setHighlightBank(false), 3000); break;
        case 'profile': setActiveTab('perfil'); setHighlightProfile(true); setTimeout(() => setHighlightProfile(false), 3000); break;
        case 'fault': setActiveTab('inicio'); setHighlightFault(true); setTimeout(() => setHighlightFault(false), 3000); break;
      }
      setIsMenuOpen(false); setIsHelpOpen(false);
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

  const filteredPaymentsByStatus = paymentFilter === 'todos' ? paymentsHistory : paymentsHistory.filter(p => p.estado === paymentFilter);

  const filteredPayments = filteredPaymentsByStatus.filter(p => {
    const targetDateStr = p.recibos?.periodo || p.fecha_pago;
    if (!targetDateStr) return false;
    const dateStr = targetDateStr.split('T')[0];
    const [year, month] = dateStr.split('-');
    return parseInt(month) - 1 === selectedMonth.getMonth() && parseInt(year) === selectedMonth.getFullYear();
  });

  const descargarReciboPDF = () => {
    const elemento = document.getElementById('recibo-pdf');
    if (!elemento) return;

    const printWindow = window.open('', '', 'width=800,height=900');
    if (!printWindow) {
      alert("Por favor, permite las ventanas emergentes (pop-ups) en tu navegador para descargar el recibo.");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Recibo_Condominio_Apto_${userData?.apartamento}_${formatMonth(selectedMonth)}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; margin: 0; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .items-center { align-items: center; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .w-full { width: 100%; }
            .max-w-2xl { max-width: 42rem; }
            .mx-auto { margin-left: auto; margin-right: auto; }
            .font-bold { font-weight: 700; }
            .font-medium { font-weight: 500; }
            .uppercase { text-transform: uppercase; }
            .tracking-wider { letter-spacing: 0.05em; }
            .text-xs { font-size: 0.75rem; }
            .text-sm { font-size: 0.875rem; }
            .text-base { font-size: 1rem; }
            .text-xl { font-size: 1.25rem; }
            .text-2xl { font-size: 1.5rem; }
            table { width: 100%; border-collapse: collapse; }
            * { box-sizing: border-box; }
            
            .logo-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #e5e7eb;
            }
            .koda-logo-img {
              max-height: 60px; 
              width: auto;
              object-fit: contain;
            }
            .header-text {
              text-align: right;
              color: #4b5563;
              font-size: 12px;
            }

            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="logo-header">
            <img src="${kodaLogo}" alt="Logo Koda" class="koda-logo-img" />
            <div class="header-text">
              <strong>Recibo de Condominio</strong><br/>
              Apto ${userData?.apartamento}
            </div>
          </div>
          
          ${elemento.outerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500); 
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 pb-32">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-blue-950/95 to-blue-900/85 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-white text-3xl font-bold tracking-wide">Koda</h1>
            <p className="text-white/50 text-sm font-light">tu comunidad</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsNotificationsOpen(true)} className="relative hover:opacity-80 transition-opacity">
              <Bell className="w-6 h-6 text-white" />
              {unreadCount > 0 && <span className="absolute top-0 right-0 bg-red-500 w-2.5 h-2.5 rounded-full border-2 border-blue-900" />}
            </button>
            <button onClick={() => setIsMenuOpen(true)} className="hover:opacity-80 transition-opacity">
              <Menu className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Menús y Notificaciones */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${isNotificationsOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsNotificationsOpen(false)} />
        <div className={`absolute top-20 right-4 md:right-8 w-[400px] max-w-[calc(100vw-2rem)] max-h-[600px] bg-white rounded-2xl shadow-2xl transition-all duration-300 ${isNotificationsOpen ? 'scale-100 translate-y-0' : 'scale-95 -translate-y-4'}`}>
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-4 rounded-t-2xl flex items-center justify-between">
            <h3 className="text-white text-lg font-semibold">Notificaciones</h3>
            <button onClick={() => setIsNotificationsOpen(false)} className="hover:bg-white/20 p-1 rounded-lg transition-all"><X className="w-5 h-5 text-white" /></button>
          </div>
          <div className="overflow-y-auto max-h-[520px]">
            {notifications.map((notif, index) => (
              <div key={notif.id} className={`p-4 hover:bg-gray-50 cursor-pointer transition-all ${index !== notifications.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className={`${notif.bgColor} p-2 rounded-full shrink-0 mt-1`}><notif.icon className="w-4 h-4 text-white" /></div>
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

      <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setIsMenuOpen(false); setIsHelpOpen(false); setSelectedFaq(null); }} />
        <div className={`absolute top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl transition-transform duration-300 ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center"><User className="w-6 h-6 text-white" /></div>
                <div>
                  <h3 className="text-white">{userData?.nombre || 'Usuario'}</h3>
                  <p className="text-white/70 text-sm">{userData?.apartamento || 'Apto'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {userData?.rol === 'admin' && <div className="px-3 py-1 bg-yellow-400/20 text-yellow-200 rounded-md text-xs">Administrador</div>}
                <button onClick={() => { setIsMenuOpen(false); setIsHelpOpen(false); setSelectedFaq(null); }} className="p-2 rounded-lg hover:bg-white/10 transition-all"><X className="w-5 h-5 text-white" /></button>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-2">
            <button onClick={() => { setActiveTab('perfil'); setIsMenuOpen(false); }} className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-100 transition-all text-left">
              <User className="w-5 h-5 text-gray-600" /><span className="text-gray-700">Perfil</span>
            </button>
            <button onClick={() => { setActiveTab('ayuda'); setIsMenuOpen(false); }} className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-100 transition-all text-left">
              <HelpCircle className="w-5 h-5 text-gray-600" /><span className="text-gray-700">Centro de Ayuda</span>
            </button>
            <button className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-100 transition-all text-left">
              <Settings className="w-5 h-5 text-gray-600" /><span className="text-gray-700">Configuración</span>
            </button>
            <button onClick={onBackToSelector} className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-blue-50 transition-all text-left">
              <Home className="w-5 h-5 text-blue-600" /><span className="text-blue-600 font-medium">Cambiar de Edificio</span>
            </button>
            <div className="border-t border-gray-200 my-4"></div>
            <button onClick={onLogout} className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-red-50 transition-all text-left">
              <LogOut className="w-5 h-5 text-red-600" /><span className="text-red-600">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODALES GLOBALES */}
      <ReportPaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} userData={userData} />
      <ReportTicketModal isOpen={isTicketModalOpen} onClose={() => setIsTicketModalOpen(false)} userData={userData} onSuccess={() => {
        setActiveTab('comunidad'); 
      }} />
      <UserVotacionesModal isOpen={isVotacionesModalOpen} onClose={() => setIsVotacionesModalOpen(false)} userData={userData} />

      {/* VISTA PRINCIPAL (INICIO) */}
      {activeTab === 'inicio' && (
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
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
                    <span className="text-white/90 text-sm xl:text-base font-medium">Saldo a favor:</span>
                    <span className="text-white font-bold text-2xl">${Math.abs(balance).toFixed(2)}</span>
                  </div>
                ) : (
                  <p className="text-white/90 text-lg">¡No tienes pagos pendientes!</p>
                )}
                
                <button onClick={() => setIsReceiptModalOpen(true)} className="mt-4 w-full bg-green-700 text-white font-bold py-4 rounded-2xl border border-green-500 hover:bg-green-800 transition-all shadow-lg flex items-center justify-center gap-2">
                  <FileText className="w-5 h-5" /> VER RECIBO ACTUAL
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-1 mb-4">
                  <h1 className="text-5xl text-white font-bold">${balance.toFixed(2)}</h1>
                  <p className="text-white/90 text-xl font-medium">Bs. {bolivares.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="flex items-center justify-between mb-6">
                  <div className="text-white/80 text-sm bg-black/20 px-3 py-1.5 rounded-lg border border-white/10 flex flex-col">
                    <span>Tasa BCV: Bs. {bcvRate.toFixed(2)}</span>
                    <span className="text-[10px] text-white/50">{isLoadingBcv ? 'Actualizando...' : `Act: ${bcvDate}`}</span>
                  </div>
                  <div className="text-white flex items-center gap-1.5 text-sm bg-black/20 px-3 py-1.5 rounded-lg border border-white/10 animate-pulse">
                    <AlertCircle className="w-4 h-4" /> Requiere Pago
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={() => setIsPaymentModalOpen(true)} className="flex-1 bg-white text-red-700 font-bold py-4 rounded-2xl hover:bg-red-50 transition-all shadow-lg transform hover:scale-[1.02] active:scale-[0.98]">
                    REPORTAR PAGO
                  </button>
                  <button onClick={() => setIsReceiptModalOpen(true)} className="flex-1 bg-red-800 text-white font-bold py-4 rounded-2xl border border-red-500 hover:bg-red-900 transition-all shadow-lg flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]">
                    <FileText className="w-5 h-5" /> VER RECIBO
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <button onClick={() => setIsTicketModalOpen(true)} className={`bg-white/10 backdrop-blur-lg rounded-2xl p-6 hover:bg-white/20 transition-all border border-white/20 shadow-lg ${highlightFault ? 'ring-2 ring-yellow-300 animate-pulse' : ''}`}>
              <div className="flex flex-col items-center gap-3">
                <div className="bg-blue-500 p-4 rounded-full"><Wrench className="w-6 h-6 text-white" /></div>
                <span className="text-white text-sm text-center">Reportar Falla</span>
              </div>
            </button>
            <button onClick={() => { setActiveTab('finanzas'); setHighlightBank(true); setTimeout(() => setHighlightBank(false), 3000); }} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 hover:bg-white/20 transition-all border border-white/20 shadow-lg">
              <div className="flex flex-col items-center gap-3">
                <div className="bg-blue-500 p-4 rounded-full"><Clock className="w-6 h-6 text-white" /></div>
                <span className="text-white text-sm text-center">Historial de Pagos</span>
              </div>
            </button>
            <button onClick={() => setIsQuickBankModalOpen(true)} className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 hover:bg-white/20 transition-all border border-white/20 shadow-lg relative">
              <div className="flex flex-col items-center gap-3">
                <div className="bg-blue-500 p-4 rounded-full"><CreditCard className="w-6 h-6 text-white" /></div>
                <span className="text-white text-sm text-center">Datos Bancarios</span>
              </div>
            </button>
          </div>
          
          <Dialog open={isQuickBankModalOpen} onOpenChange={setIsQuickBankModalOpen}>
            <DialogContent className="sm:max-w-md bg-slate-900 border-white/10">
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                  Cuentas del Edificio
                </DialogTitle>
              </DialogHeader>
              <div className="mt-4 max-h-[60vh] overflow-y-auto pr-2 pb-4">
                {isLoadingBank ? (
                  <p className="text-white/60 text-sm text-center py-4">Cargando datos...</p>
                ) : cuentasBancarias.length === 0 ? (
                  <p className="text-white/60 text-sm text-center py-4">No hay datos bancarios registrados para este edificio.</p>
                ) : (
                  <div className="space-y-3 text-sm">
                    {cuentasBancarias.map((cuenta, idx) => (
                      <div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2">
                        <div className="flex justify-between border-b border-white/10 pb-2 mb-2">
                          <span className={`font-bold ${cuenta.moneda === '$' ? 'text-green-300' : 'text-blue-300'}`}>
                            {cuenta.banco_nombre}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/80">{cuenta.moneda}</span>
                        </div>
                        {cuenta.numero_cuenta && (
                          <div className="mt-1">
                            <span className="text-white/60 block text-xs">{cuenta.moneda === '$' ? 'Correo Zelle:' : 'N° Cuenta:'}</span>
                            <span className="text-white font-mono break-all">{cuenta.numero_cuenta}</span>
                          </div>
                        )}
                        {cuenta.telefono && cuenta.moneda !== '$' && (
                          <div className="mt-2 text-xs">
                            <span className="text-white/60 block">Pago Móvil:</span>
                            <span className="text-white">{cuenta.telefono}</span>
                          </div>
                        )}
                        {cuenta.rif && cuenta.moneda !== '$' && (
                          <div className="mt-2 text-xs">
                            <span className="text-white/60 block">RIF/Cédula:</span>
                            <span className="text-white">{cuenta.rif}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <div className="space-y-4">
            <h2 className="text-white text-xl font-semibold px-2">Lo que está pasando</h2>
            <div className="space-y-3">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 hover:bg-white/20 transition-all border border-white/20 shadow-lg cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="bg-orange-500 p-3 rounded-xl shrink-0"><Megaphone className="w-5 h-5 text-white" /></div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-1">Mantenimiento de Ascensor</h3>
                    <p className="text-white/70 text-sm">Se realizará mantenimiento preventivo el próximo lunes 10 de febrero. Se estima una duración de 4 horas.</p>
                    <p className="text-white/50 text-xs mt-2">Hace 2 horas</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 hover:bg-white/20 transition-all border border-white/20 shadow-lg cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="bg-purple-500 p-3 rounded-xl shrink-0"><Vote className="w-5 h-5 text-white" /></div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-1">Votación Activa</h3>
                    <p className="text-white/70 text-sm mb-3">Toma de decisiones de la asamblea en curso.</p>
                    <button onClick={() => setIsVotacionesModalOpen(true)} className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold py-2 px-6 rounded-lg transition-colors">
                      VOTAR AHORA
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 hover:bg-white/20 transition-all border border-white/20 shadow-lg cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="bg-green-500 p-3 rounded-xl shrink-0"><Calendar className="w-5 h-5 text-white" /></div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-1">Próxima Asamblea</h3>
                    <p className="text-white/70 text-sm">Domingo 15 de febrero, 2026 - 10:00 AM</p>
                    <p className="text-white/50 text-xs mt-2">Salón de eventos del edificio</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <h2 className="text-white text-xl font-semibold">Mis Gestiones</h2>
              {userTickets.length > 3 && (
                <button onClick={() => setActiveTab('comunidad')} className="text-blue-400 text-sm hover:text-blue-300 transition-colors flex items-center gap-1">
                  Ver todas <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20 shadow-lg">
              {userTickets.length === 0 ? (
                <p className="text-white/60 text-sm text-center py-4">Aún no has reportado ninguna falla.</p>
              ) : (
                <div className="space-y-4">
                  {userTickets.slice(0, 3).map((ticket) => (
                    <div key={ticket.id_ticket} className="flex justify-between items-center border-b border-white/10 pb-4 last:border-0 last:pb-0" onClick={() => { setActiveTab('comunidad'); setTimeout(() => setSelectedTicket(ticket), 300); }}>
                      <div className="flex gap-3 items-center">
                        <div className={`p-2 rounded-xl shrink-0 ${ticket.estado === 'cerrado' ? 'bg-green-500/20' : ticket.estado === 'en_proceso' ? 'bg-yellow-500/20' : 'bg-orange-500/20'}`}>
                          <Wrench className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-white font-semibold truncate max-w-[180px] sm:max-w-[250px]">{ticket.titulo}</h3>
                          <p className="text-white/60 text-xs mt-0.5">Reportado el {new Date(ticket.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getTicketStatusColor(ticket.estado)}`}>
                        {getTicketStatusText(ticket.estado)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VISTA FINANZAS */}
      {activeTab === 'finanzas' && (
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg hover:bg-white/10 transition-all"><ChevronLeft className="w-6 h-6 text-white" /></button>
              <h2 className="text-white text-xl capitalize font-medium">{formatMonth(selectedMonth)}</h2>
              <button onClick={() => changeMonth(1)} disabled={isNextMonthDisabled} className="p-2 rounded-lg hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight className="w-6 h-6 text-white" /></button>
            </div>
          </div>

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
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4" />Cálculo de Tu Cuota</h3>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm"><span className="text-white/80">Gasto Total del Edificio</span><span className="text-white font-medium">${totalBuildingExpense.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-white/80">Tu Alícuota</span><span className="text-white font-medium">{aliquot.toFixed(2)}%</span></div>
                </div>
                <div className="border-t border-blue-500/30 mt-4 pt-4 flex justify-between items-center">
                  <span className="text-white text-lg">Total del Mes</span><span className="text-white text-3xl font-bold">${monthTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-white text-xl px-2">Historial de Pagos</h2>
            <div className="flex flex-wrap gap-2 px-2">
              {['todos', 'aprobado', 'pendiente', 'rechazado'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setPaymentFilter(filter)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all capitalize ${
                    paymentFilter === filter
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {filter === 'todos' ? 'Todos' : filter === 'aprobado' ? 'Aprobados' : filter === 'pendiente' ? 'Pendientes' : 'Rechazados'}
                </button>
              ))}
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
              {isLoadingPayments ? (
                <p className="text-white/60 text-center py-4">Cargando pagos...</p>
              ) : filteredPayments.length === 0 ? (
                <p className="text-white/60 text-center py-4">No hay pagos registrados para este mes.</p>
              ) : (
                <div className="space-y-3">
                  {filteredPayments.map((pago: any) => {
                    const statusClass = getStatusColor(pago.estado);
                    const statusText = getStatusText(pago.estado);
                    let fFormat = '';
                    if (pago.fecha_pago) {
                      const [y, m, d] = pago.fecha_pago.split('T')[0].split('-');
                      const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                      fFormat = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
                    }
                    
                    return (
                      <div 
                        key={pago.d_pago} 
                        className="p-4 rounded-xl border border-white/10 hover:bg-white/5 transition-all cursor-pointer group"
                        onClick={() => {
                          if (pago.comprobante_url) {
                            setSelectedPaymentProof(pago.comprobante_url);
                          }
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-white font-semibold flex items-center gap-2 group-hover:text-blue-300 transition-colors">
                              {pago.metodo} 
                              {pago.comprobante_url && <FileText className="w-4 h-4 text-white/50" />}
                            </h4>
                            <p className="text-white/50 text-sm mt-1">
                              {fFormat} • Ref: {pago.referencia}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-bold">${Number(pago.monto).toFixed(2)}</p>
                            <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold border ${statusClass}`}>
                              {statusText}
                            </span>
                          </div>
                        </div>

                        {pago.estado === 'rechazado' && pago.motivo_rechazo && (
                          <div className="mt-3 bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <p className="text-red-300 text-sm">
                              <span className="font-semibold">Motivo del rechazo:</span> {pago.motivo_rechazo}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className={`bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20 ${highlightBank ? 'ring-2 ring-yellow-300 animate-pulse' : ''}`}>
            <h3 className="text-white mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5" /> Datos Bancarios para Pagos</h3>
            {isLoadingBank ? (
              <p className="text-white/60 text-sm">Cargando datos...</p>
            ) : cuentasBancarias.length === 0 ? (
              <p className="text-white/60 text-sm">No hay datos bancarios registrados para este edificio.</p>
            ) : (
              <div className="space-y-3 text-sm">
                {cuentasBancarias.map((cuenta, idx) => (
                  <div key={cuenta.id || idx} className="bg-black/20 p-3 rounded-xl border border-white/5 space-y-2">
                     <span className={`${cuenta.moneda === '$' ? 'text-green-300' : 'text-blue-300'} font-bold block border-b border-white/10 pb-1 flex justify-between`}>
                      <span>{cuenta.banco_nombre}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-white/10">{cuenta.moneda}</span>
                    </span>
                    {cuenta.numero_cuenta && (
                      <div>
                        <span className="text-white/60 block text-xs">{cuenta.moneda === '$' ? 'Correo Zelle:' : 'N° Cuenta:'}</span>
                        <span className="text-white tracking-wider">{cuenta.numero_cuenta}</span>
                      </div>
                    )}
                    {cuenta.telefono && cuenta.moneda !== '$' && (
                      <div>
                        <span className="text-white/60 block text-xs mt-1">Pago Móvil (Teléfono):</span>
                        <span className="text-white">{cuenta.telefono}</span>
                      </div>
                    )}
                    {cuenta.rif && cuenta.moneda !== '$' && (
                      <div>
                        <span className="text-white/60 block text-xs mt-1">RIF:</span>
                        <span className="text-white">{cuenta.rif}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* VISTA COMUNIDAD */}
      {activeTab === 'comunidad' && (
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
          
          {/* VOTACIONES CERRADAS CON DATOS REALES DE LA BDD (¡Diseño Original Mantenido!) */}
          <div className="space-y-4">
            <h2 className="text-white text-xl px-2 font-semibold flex items-center gap-2">
              <Vote className="w-5 h-5 text-purple-400" /> Votaciones Cerradas
            </h2>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20">
              <div className="space-y-4">
                {votacionesCerradas.length === 0 ? (
                  <p className="text-white/50 text-sm text-center py-4">No hay votaciones cerradas en este momento.</p>
                ) : (
                  votacionesCerradas.map(vote => {
                    // Adaptamos los datos reales al diseño de la foto
                    const totalVotos = vote.votos?.length || 0;
                    
                    // Contamos los votos 'Sí' (o la primera opción si no hay 'Sí') para definir si se aprobó
                    const votosSi = vote.votos?.filter((v: any) => v.opcion_seleccionada.toLowerCase() === 'sí' || v.opcion_seleccionada.toLowerCase() === 'si').length || 0;
                    const percentage = totalVotos === 0 ? 0 : Math.round((votosSi / totalVotos) * 100);
                    const result = percentage >= 50 ? 'Aprobado' : 'Rechazado';

                    return (
                      <div key={vote.id} className="p-4 border border-white/10 rounded-xl bg-black/20">
                        <div className="flex justify-between items-start mb-3">
                          <p className="font-semibold text-white pr-4">{vote.pregunta}</p>
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold border shrink-0 ${
                            result === 'Aprobado' 
                              ? 'bg-green-500/20 text-green-300 border-green-500/30' 
                              : 'bg-red-500/20 text-red-300 border-red-500/30'
                          }`}>
                            {result}
                          </span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2.5 mb-2 overflow-hidden border border-white/5">
                          <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                        </div>
                        <div className="flex justify-between text-xs text-white/60 font-medium px-1">
                          <span>{votosSi} a favor</span>
                          <span>{percentage}%</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center px-2 mt-8">
              <h2 className="text-white text-xl font-semibold flex items-center gap-2">
                <Wrench className="w-5 h-5 text-orange-400" /> Mis Tickets
              </h2>
              <button onClick={() => setIsTicketModalOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-lg">
                <Plus className="w-4 h-4" /> Nuevo
              </button>
            </div>
            
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20">
               {userTickets.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-white/70 font-medium">No has reportado ninguna falla aún.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userTickets.map(ticket => (
                    <div key={ticket.id_ticket} onClick={() => setSelectedTicket(ticket)} className="p-4 bg-black/20 hover:bg-white/5 border border-white/10 rounded-xl cursor-pointer">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-white pr-4">{ticket.titulo}</h3>
                        <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold border ${getTicketStatusColor(ticket.estado)}`}>
                          {getTicketStatusText(ticket.estado)}
                        </span>
                      </div>
                      <p className="text-white/60 text-sm line-clamp-2 mb-3">{ticket.descripcion}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
            {selectedTicket && (
              <DialogContent className="sm:max-w-lg bg-slate-900 border-white/20 p-0 overflow-hidden">
                <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4">
                  <DialogTitle className="text-white flex items-center gap-2 text-lg">
                    <Wrench className="w-5 h-5" /> Detalles del Ticket #{selectedTicket.id_ticket}
                  </DialogTitle>
                </div>
                
                <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar space-y-5">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-white pr-4">{selectedTicket.titulo}</h3>
                    <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold border ${getTicketStatusColor(selectedTicket.estado)}`}>
                      {getTicketStatusText(selectedTicket.estado)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm bg-black/20 p-3 rounded-xl border border-white/5">
                    <div>
                      <p className="text-white/50 mb-0.5">Fecha Reporte</p>
                      <p className="text-white font-medium">{new Date(selectedTicket.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-white/50 mb-0.5">Ubicación</p>
                      <p className="text-white font-medium">{selectedTicket.ubicacion || 'No especificada'}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-white/70 text-sm font-semibold mb-2 flex items-center gap-2">
                       <FileText className="w-4 h-4" /> Descripción
                    </h4>
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-white/90 text-sm whitespace-pre-wrap leading-relaxed">
                      {selectedTicket.descripcion}
                    </div>
                  </div>

                  {selectedTicket.foto_url && (
                    <div>
                      <h4 className="text-white/70 text-sm font-semibold mb-2 flex items-center gap-2">
                         <Upload className="w-4 h-4" /> Evidencia Adjunta
                      </h4>
                      <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40 flex justify-center p-2">
                        <img src={selectedTicket.foto_url} alt="Evidencia" className="max-h-60 object-contain rounded-lg" />
                      </div>
                    </div>
                  )}

                  {selectedTicket.nota_admin && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                        <h4 className="text-blue-300 text-sm font-bold mb-2 flex items-center gap-2">
                           <User className="w-4 h-4" /> Respuesta de Administración
                        </h4>
                        <p className="text-white/90 text-sm italic">{selectedTicket.nota_admin}</p>
                        
                        {selectedTicket.foto_resolucion_url && (
                           <div className="mt-3 pt-3 border-t border-blue-500/20">
                             <a href={selectedTicket.foto_resolucion_url} target="_blank" rel="noreferrer" className="block max-w-xs overflow-hidden rounded-lg border border-blue-500/30 hover:opacity-90 transition-opacity">
                               <img src={selectedTicket.foto_resolucion_url} alt="Evidencia de Resolución" className="w-full h-auto object-cover" />
                             </a>
                             <p className="text-blue-200/50 text-[10px] uppercase tracking-wide mt-1 font-semibold">Evidencia fotográfica adjunta</p>
                           </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedTicket.estado === 'cerrado' && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-xl p-5">
                        <h4 className="text-orange-300 text-sm font-bold mb-3 flex items-center gap-2">
                          <Star className="w-4 h-4" /> Calificar Atención
                        </h4>
                        
                        {selectedTicket.calificacion ? (
                          <div className="space-y-3">
                            <div className="flex gap-1 justify-center">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star 
                                  key={star} 
                                  className={`w-8 h-8 ${star <= selectedTicket.calificacion ? 'fill-yellow-400 text-yellow-400' : 'text-white/20'}`} 
                                />
                              ))}
                            </div>
                            {selectedTicket.comentario_calificacion && (
                              <p className="text-white/70 text-sm text-center italic mt-2">
                                "{selectedTicket.comentario_calificacion}"
                              </p>
                            )}
                            <p className="text-center text-xs text-orange-200 mt-2">Gracias por tu retroalimentación.</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex justify-center gap-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setTicketRating(star)}
                                  className="transition-transform hover:scale-110 focus:outline-none"
                                >
                                  <Star 
                                    className={`w-9 h-9 ${star <= ticketRating ? 'fill-yellow-400 text-yellow-400' : 'text-white/20 hover:text-yellow-400/50'}`} 
                                  />
                                </button>
                              ))}
                            </div>
                            
                            {ticketRating > 0 && (
                              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                <textarea
                                  value={ticketRatingComment}
                                  onChange={(e) => setTicketRatingComment(e.target.value)}
                                  placeholder="Deja un comentario opcional sobre el servicio recibido..."
                                  className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-orange-500/50 resize-none"
                                  rows={2}
                                />
                                <button
                                  onClick={handleRateTicket}
                                  disabled={isSubmittingRating}
                                  className="w-full mt-3 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 rounded-xl transition-colors disabled:opacity-50"
                                >
                                  {isSubmittingRating ? 'Enviando...' : 'Enviar Calificación'}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </DialogContent>
            )}
          </Dialog>

          <div className="space-y-4">
            <h2 className="text-white text-xl px-2 font-semibold flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-blue-400" /> Comunicados
            </h2>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20">
              <div className="space-y-3">
                {oldCommuniques.map(comm => (
                  <div key={comm.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/10">
                    <div>
                      <p className="font-semibold text-white">{comm.title}</p>
                      <p className="text-sm text-blue-300 font-medium mt-1">{comm.category}</p>
                    </div>
                    <span className="text-xs text-white/60 mt-2 sm:mt-0 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 self-start sm:self-center">
                      {comm.date}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-white text-xl px-2 font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-400" /> Documentos y Normativas
            </h2>

            {previewDoc && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-8">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewDoc(null)} />
                <div className="relative bg-[#0f172a] rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-white/20 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-5 py-4 flex items-center justify-between shrink-0">
                    <h3 className="text-white font-semibold flex items-center gap-2 truncate">
                      <FileText className="w-5 h-5 shrink-0" /> {previewDoc.titulo}
                    </h3>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <button
                        onClick={() => handleDownload(previewDoc.url_archivo, previewDoc.titulo)}
                        className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors"
                      >
                        <Download className="w-4 h-4" /> Descargar
                      </button>
                      <button onClick={() => setPreviewDoc(null)} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
                        <X className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden bg-black/40 min-h-[60vh]">
                    {previewDoc.formato === 'PDF' ? (
                      <iframe
                        src={previewDoc.url_archivo}
                        title={previewDoc.titulo}
                        className="w-full h-full min-h-[60vh]"
                        style={{ border: 'none' }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full p-4">
                        <img
                          src={previewDoc.url_archivo}
                          alt={previewDoc.titulo}
                          className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-2xl"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20">
              {documents.length === 0 ? (
                <p className="text-white/50 text-sm text-center py-4">No hay documentos disponibles todavía.</p>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 transition-all border border-transparent hover:border-white/10 group">
                      <div className="bg-red-500/80 p-3 rounded-xl shadow-inner border border-red-400/50 shrink-0">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium truncate">{doc.titulo}</h4>
                        <div className="text-white/60 text-xs mt-0.5 flex gap-2 flex-wrap items-center">
                          <span>{doc.tamano_archivo}</span>
                          <span>•</span>
                          <span>{doc.formato}</span>
                          {doc.created_at && (
                            <>
                              <span>•</span>
                              <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-xs font-semibold transition-colors border border-white/10"
                        >
                          <Eye className="w-3.5 h-3.5" /> Ver
                        </button>
                        <button
                          onClick={() => handleDownload(doc.url_archivo, doc.titulo)}
                          className="flex items-center gap-1.5 bg-blue-500/80 hover:bg-blue-500 text-white px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" /> Descargar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-white text-xl px-2 font-semibold flex items-center gap-2">
              <Phone className="w-5 h-5 text-green-400" /> Contactos de Emergencia
            </h2>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {emergencyContacts.map((contact, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-black/20 hover:bg-white/5 border border-white/10 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-500/20 p-2 rounded-lg border border-green-500/30">
                        <Phone className="w-4 h-4 text-green-300" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-white">{contact.nombre}</span>
                        <span className="text-white/60 text-sm">{contact.telefono}</span>
                      </div>
                    </div>
                    <a 
                      href={`tel:${contact.telefono.replace(/\s+/g, '')}`} 
                      className="text-green-300 hover:text-green-200 bg-green-500/20 hover:bg-green-500/30 p-2.5 rounded-lg transition-colors border border-green-500/30"
                      title={`Llamar a ${contact.nombre}`}
                    >
                      <Phone className="w-5 h-5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'ayuda' && (
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="bg-white/20 p-4 rounded-full mb-4 backdrop-blur-sm border border-white/30">
                <HelpCircle className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Centro de Ayuda</h2>
              <p className="text-blue-100 max-w-lg mx-auto text-sm">
                Encuentra respuestas rápidas a las dudas más comunes sobre el uso de la plataforma, o contacta a nuestro equipo de soporte técnico.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-white text-xl px-2 font-semibold">Preguntas Frecuentes</h3>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden shadow-lg">
              {[
                {
                  q: "¿Cómo reporto un pago por transferencia?",
                  a: "Dirígete a la pestaña de Inicio y selecciona 'REPORTAR PAGO'. Completa el formulario con la referencia y fecha exacta, y sube el comprobante en formato imagen o PDF."
                },
                {
                  q: "¿Cómo cambio mi clave de acceso a Koda?",
                  a: "Puedes cambiar tu contraseña desde la pantalla de Perfil (accesible en el menú superior derecho). Busca la sección de acceso e ingresa tus nuevos datos."
                },
                {
                  q: "¿Qué sucede si mi pago fue rechazado?",
                  a: "Recibirás una notificación y el estado de tu pago cambiará a 'Rechazado' en la pestaña Finanzas. Puedes enviar un nuevo reporte o contactar a tu administrador directamente."
                },
                {
                  q: "¿Dónde veo el detalle de los gastos del edificio?",
                  a: "En la pestaña 'Finanzas', dentro de 'Desglose del Recibo' podrás ver en qué se utilizaron los fondos del mes y el importe correspondiente según tu alícuota."
                }
              ].map((faq, idx) => {
                const isSelected = selectedFaq === idx;
                return (
                  <div key={idx} className="border-b border-white/10 last:border-0 border-opacity-50">
                    <button 
                      onClick={() => setSelectedFaq(isSelected ? null : idx)} 
                      className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors focus:outline-none"
                    >
                      <span className="font-semibold text-white pr-4">{faq.q}</span>
                      <ChevronRight className={`w-5 h-5 text-blue-300 transition-transform duration-300 shrink-0 ${isSelected ? 'rotate-90' : ''}`} />
                    </button>
                    <div 
                      className={`overflow-hidden transition-all duration-300 ${isSelected ? 'max-h-48 bg-black/20' : 'max-h-0'}`}
                    >
                      <p className="p-5 text-white/80 text-sm leading-relaxed border-t border-white/10">
                        {faq.a}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="text-white text-xl px-2 font-semibold text-center">Soporte Técnico Especializado</h3>
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-lg flex flex-col items-center justify-center max-w-2xl mx-auto">
              <form onSubmit={handleSupportSubmit} className="flex flex-col items-center text-center space-y-4 w-full">
                <h4 className="text-white font-bold text-2xl mb-1">Contacto Koda</h4>
                <p className="text-white/70 text-sm mb-4 max-w-md">
                  Si experimentas problemas técnicos con la aplicación, errores al iniciar sesión o fallos de conexión, nuestro equipo de ingenieros está para asistirte.
                </p>
                <div className="flex flex-col gap-4 w-full">
                  <textarea 
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    required
                    maxLength={500}
                    placeholder="Describe tu problema con la plataforma de forma detallada..."
                    className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/40 text-sm min-h-[120px] resize-none focus:outline-none focus:border-blue-500/50"
                  />
                  <button 
                    type="submit"
                    disabled={isSendingSupport}
                    className="mx-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 justify-center"
                  >
                    {isSendingSupport ? 'Enviando...' : <><Mail className="w-5 h-5" /> Enviar Correo a Soporte</>}
                  </button>
                </div>
              </form>
            </div>
            <p className="text-center text-xs text-white/50 px-4 mt-6">
              Nota: Para dudas relacionadas a deudas de condominio o pagos, por favor contacta a la administración de tu edificio en lugar del soporte informático.
            </p>
          </div>
        </div>
      )}

      {isReceiptModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsReceiptModalOpen(false)} />
          <div className="relative bg-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-full overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between shrink-0">
              <h3 className="text-white text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5" /> Tu Recibo
              </h3>

              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full ml-auto mr-4">
                <button onClick={() => changeMonth(-1)} className="p-1 rounded-full hover:bg-white/20 transition-all">
                  <ChevronLeft className="w-4 h-4 text-white" />
                </button>
                <span className="text-white font-medium text-sm capitalize w-28 text-center truncate">
                  {formatMonth(selectedMonth).replace(' (Mes actual)', '')}
                </span>
                <button onClick={() => changeMonth(1)} disabled={isNextMonthDisabled} className="p-1 rounded-full hover:bg-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
              </div>

              <button onClick={() => setIsReceiptModalOpen(false)} className="p-1 rounded-full hover:bg-white/20 transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            
            <div 
              id="recibo-pdf" 
              className="p-8 font-sans w-full max-w-2xl mx-auto overflow-y-auto custom-scrollbar" 
              style={{ backgroundColor: '#ffffff', color: '#1f2937' }}
            >
              <div className="text-center" style={{ marginBottom: '24px' }}>
                <h2 className="text-2xl font-bold uppercase tracking-wider" style={{ color: '#000000' }}>Aviso de Cobro</h2>
                <p className="text-sm" style={{ color: '#4b5563' }}>Condominio {userData.codigo_edificio}</p>
              </div>
              
              <div className="flex justify-between text-sm" style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '16px', marginBottom: '16px' }}>
                <div>
                  <p><strong style={{ color: '#000000' }}>Apto:</strong> {userData.apartamento}</p>
                  <p><strong style={{ color: '#000000' }}>Propietario:</strong> {userData.nombre}</p>
                </div>
                <div className="text-right">
                  <p><strong style={{ color: '#000000' }}>Fecha de Emisión:</strong> {currentRecibo?.fecha_emision ? new Date(currentRecibo.fecha_emision + 'T00:00:00').toLocaleDateString() : 'Pendiente por emisión'}</p>
                  <p><strong style={{ color: '#000000' }}>Mes facturado:</strong> {formatMonth(selectedMonth).replace(' (Mes actual)', '')}</p>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h3 className="font-bold text-base" style={{ color: '#111827', borderBottom: '2px solid #bfdbfe', paddingBottom: '4px', marginBottom: '12px' }}>
                  Desglose de Gastos del Edificio
                </h3>
                {expenses.length === 0 ? (
                  <p className="text-sm italic" style={{ color: '#6b7280' }}>No hay gastos registrados en este mes.</p>
                ) : (
                  <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr className="text-left uppercase text-xs" style={{ borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>
                         <th style={{ padding: '8px 0' }}>Descripción del Gasto</th>
                         <th className="text-right" style={{ padding: '8px 0' }}>Monto ($)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((e, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '8px 0', color: '#374151' }}>{e.concept}</td>
                          <td className="text-right font-medium" style={{ padding: '8px 0', color: '#000000' }}>${e.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold" style={{ backgroundColor: '#f9fafb', color: '#000000' }}>
                        <td style={{ padding: '8px', borderRadius: '8px 0 0 8px' }}>Total del Edificio</td>
                        <td className="text-right" style={{ padding: '8px', borderRadius: '0 8px 8px 0' }}>${totalBuildingExpense.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>

              <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '20px', marginBottom: '8px' }}>
                <div className="flex justify-between text-sm" style={{ color: '#374151', marginBottom: '8px' }}>
                  <span>Su Alícuota correspondiente:</span>
                  <span className="font-bold">{aliquot.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between font-bold text-xl" style={{ borderTop: '1px solid #93c5fd', paddingTop: '12px', marginTop: '8px', color: '#1e3a8a' }}>
                  <span>Total a Pagar (USD):</span>
                  <span>${monthTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mt-2" style={{ color: '#4b5563', marginTop: '8px' }}>
                  <span>Equivalente en Bs (Tasa BCV {bcvRate.toFixed(2)}):</span>
                  <span className="font-medium">Bs. {(monthTotal * bcvRate).toLocaleString('es-VE', {minimumFractionDigits: 2})}</span>
                </div>
              </div>
              <p className="text-center text-xs" style={{ color: '#9ca3af', marginTop: '32px' }}>
                Este es un documento generado automáticamente por el sistema Koda.
              </p>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end shrink-0">
              <button 
                onClick={descargarReciboPDF} 
                disabled={isGeneratingPDF}
                className={`font-medium py-2.5 px-6 rounded-xl shadow-md transition-colors flex items-center gap-2 ${isGeneratingPDF ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              >
                {isGeneratingPDF ? (
                  <>⏳ Generando PDF...</>
                ) : (
                  <><Download className="w-5 h-5" /> Descargar en PDF</>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {selectedPaymentProof && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-8">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedPaymentProof(null)} />
          <div className="relative bg-[#0f172a] rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-white/20">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-4 flex items-center justify-between shrink-0">
              <h3 className="text-white text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5" /> Comprobante de Pago
              </h3>
              <button onClick={() => setSelectedPaymentProof(null)} className="p-1 rounded-full hover:bg-white/20 transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex items-center justify-center bg-black/50 h-full">
              <img src={selectedPaymentProof} alt="Comprobante" className="max-w-full max-h-[70vh] rounded-lg shadow-2xl object-contain" />
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
                  key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex flex-col items-center gap-2 py-3 px-4 rounded-2xl transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105' : 'hover:bg-gray-100 text-gray-600'}`}
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

      <LegalTermsModal isOpen={isLegalTermsOpen} onClose={() => setIsLegalTermsOpen(false)} />
    </div>
  );
}