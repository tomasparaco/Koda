import { useState, useEffect } from 'react';
import {
  DollarSign, Wrench, Clock, CreditCard, Home, Wallet, Users, User,
  Megaphone, Vote, Calendar, CheckCircle, Menu, X, Settings,
  HelpCircle, FileText, LogOut, Bell, ChevronLeft, ChevronRight,
  Download, Search, Filter, Phone, AlertCircle, TrendingUp, Mail,
  Plus, ExternalLink, Building2, Calculator, RefreshCw, Receipt, Upload, Banknote, Lock, Eye, Star, ChevronDown, ChevronUp, Check, CheckCheck, Trash2, Activity
} from 'lucide-react';
import { NotificacionService, Notificacion } from '../../services/notificacion.service';
import type { Propietario } from '../../types';
import { supabase } from '../../lib/supabase';
import { GastoService } from '../../services/gasto.service';
import { PagoService } from '../../services/pago.service';
import { AjusteService, type Ajuste } from '../../services/ajuste.service';
import { MonedaProvider, useMoneda } from '../moneda/MonedaContext';
import { ThemeToggle, ThemeSwitchRow } from '../theme/ThemeContext';
import { ComunidadService, DocumentoCondominio, ContactoEmergencia } from '../../services/comunidad.service';
import { CuentaBancariaService, CuentaBancaria } from '../../services/cuenta_bancaria.service';
import { EncuestaService } from '../../services/encuesta.service';
import UserProfile from './UserProfile';
import ReportPaymentModal from './ReportPaymentModal';
import { LegalTermsModal } from './LegalTermsModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { ReciboService } from '../../services/recibo.service';
import KuotaLogo from '../../assets/LogoKuota4.png';
import { TicketService } from '../../services/ticket.service';
import ReportTicketModal from './ReportTicketModal';
import UserVotacionesModal from './UserVotacionesModal';

interface UserDashboardProps {
  onLogout: () => void;
  userData: Propietario;
  onBackToSelector: () => void;
}

export default function UserDashboard(props: UserDashboardProps) {
  return (
    <MonedaProvider codigoEdificio={props.userData.codigo_edificio}>
      <UserDashboardInner {...props} />
    </MonedaProvider>
  );
}

function UserDashboardInner({ onLogout, userData, onBackToSelector }: UserDashboardProps) {
  const { fmt, fmtBs, moneda, config, tasa: bcvRate, tasaFecha: bcvDate, cargandoTasa: isLoadingBcv } = useMoneda();
  const etiquetaTasa = `Tasa BCV (${moneda === 'EUR' ? '€' : '$'}): ${bcvRate > 0 ? `Bs. ${bcvRate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'no disponible'}`;

  // La deuda se lee de la base de datos (no del momento del login) para que esté al día
  const [balance, setBalance] = useState<number>(Number(userData?.deuda) || 0);

  const [cuentasBancarias, setCuentasBancarias] = useState<CuentaBancaria[]>([]);
  const [isLoadingBank, setIsLoadingBank] = useState(false);

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false); 
  const [selectedPaymentProof, setSelectedPaymentProof] = useState<string | null>(null);
  const [currentRecibo, setCurrentRecibo] = useState<any>(null);
  const [ajustesRecibo, setAjustesRecibo] = useState<Ajuste[]>([]);

  const [isQuickBankModalOpen, setIsQuickBankModalOpen] = useState(false);

  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null); 
  
  const [isVotacionesModalOpen, setIsVotacionesModalOpen] = useState(false);
  const [votacionesComunidad, setVotacionesComunidad] = useState<any[]>([]);

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
      default: return 'bg-slate-500/20 text-gray-300 border-gray-500/30';
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


  const [activeTab, setActiveTab] = useState('inicio'); 
  const [isMenuOpen, setIsMenuOpen] = useState(false); 
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false); 
  const [isHelpOpen, setIsHelpOpen] = useState(false); 
  const [selectedFaq, setSelectedFaq] = useState<number | null>(null);

  const [supportMessage, setSupportMessage] = useState('');
  const [isSendingSupport, setIsSendingSupport] = useState(false);
  const [supportSuccessMsg, setSupportSuccessMsg] = useState('');
  const [supportErrorMsg, setSupportErrorMsg] = useState('');

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;
    setIsSendingSupport(true);
    setSupportErrorMsg('');
    setSupportSuccessMsg('');
    try {
      const response = await fetch("https://formsubmit.co/ajax/paracoreyestomassta@gmail.com", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
        },
        body: JSON.stringify({
            _subject: `Soporte Técnico Kuota - Apto ${userData?.apartamento}`,
            _template: "table",
            Nombre: userData?.nombre || "Usuario no identificado",
            Apartamento: userData?.apartamento || "Desconocido",
            Edificio: userData?.codigo_edificio || "Desconocido",
            Mensaje: supportMessage
        })
      });
      if (response.ok) {
        setSupportSuccessMsg("¡Mensaje enviado exitosamente! Nos contactaremos pronto.");
        setSupportMessage('');
      } else {
        setSupportErrorMsg("Ocurrió un error al enviar tu mensaje. Intenta de nuevo.");
      }
    } catch (error) {
      console.error(error);
      setSupportErrorMsg("No se pudo conectar con el servidor de correos.");
    } finally {
      setIsSendingSupport(false);
      setTimeout(() => setSupportSuccessMsg(''), 5000);
    }
  };

  const [highlightBank, setHighlightBank] = useState(false);
  const [highlightProfile, setHighlightProfile] = useState(false);
  const [highlightFault, setHighlightFault] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(new Date()); 
  const [paymentFilter, setPaymentFilter] = useState('todos'); 
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isLegalTermsOpen, setIsLegalTermsOpen] = useState(false);

  const isSolvent = balance <= 0;

  useEffect(() => {
    if (!userData?.id_propietario) return;
    supabase
      .from('propietarios')
      .select('deuda')
      .eq('id_propietario', userData.id_propietario)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setBalance(Number(data.deuda) || 0);
      });
  }, [userData?.id_propietario, isPaymentModalOpen, activeTab]);

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

  // --- ESTADOS DE NOTIFICACIONES ---
  const [realNotifications, setRealNotifications] = useState<Notificacion[]>([]);
  const realUnreadCount = realNotifications.filter(n => !n.leido).length;

  useEffect(() => {
    if (!userData?.codigo_edificio) return;

    // 1. Cargar iniciales
    const loadNotifs = async () => {
      const data = await NotificacionService.getNotificaciones(userData.codigo_edificio, ['usuarios', userData.apartamento]);
      setRealNotifications(data);
    };
    loadNotifs();

    // 2. Suscribirse a tiempo real
    const channel = supabase
      .channel(`notificaciones-user-${userData.codigo_edificio}-${userData.apartamento}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notificaciones',
          filter: `codigo_edificio=eq.${userData.codigo_edificio}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNotif = payload.new as Notificacion;
            // Solo si es para 'usuarios' o mi apartamento
            if (newNotif.destinatario === 'usuarios' || newNotif.destinatario === userData.apartamento) {
              setRealNotifications(prev => [newNotif, ...prev].slice(0, 50));
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Notificacion;
            setRealNotifications(prev => prev.map(n => n.id === updated.id ? updated : n));
          } else if (payload.eventType === 'DELETE') {
            setRealNotifications(prev => prev.filter(n => n.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userData?.codigo_edificio, userData?.apartamento]);

  const handleMarkAsRead = async (id: string) => {
    await NotificacionService.marcarLeida(id);
    setRealNotifications(prev => prev.map(n => n.id === id ? { ...n, leido: true } : n));
  };

  const handleMarkAllAsRead = async () => {
    await NotificacionService.marcarTodasLeidas(userData.codigo_edificio, ['usuarios', userData.apartamento]);
    setRealNotifications(prev => prev.map(n => ({ ...n, leido: true })));
  };

  const handleDeleteNotif = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await NotificacionService.eliminar(id);
    setRealNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleDeleteAllNotifs = async () => {
    if (!window.confirm("¿Seguro que deseas vaciar toda tu bandeja de notificaciones? Esta acción borrará inclusive las notificaciones no leídas.")) return;
    await NotificacionService.eliminarTodas(userData.codigo_edificio, ['usuarios', userData.apartamento]);
    setRealNotifications([]);
  };

  const getNotifIcon = (tipo: string) => {
    switch (tipo) {
      case 'pago': return <DollarSign className="w-4 h-4 text-white" />;
      case 'ticket': return <Wrench className="w-4 h-4 text-white" />;
      case 'comunicado': return <Megaphone className="w-4 h-4 text-white" />;
      case 'evento': return <Calendar className="w-4 h-4 text-white" />;
      case 'encuesta': return <Vote className="w-4 h-4 text-white" />;
      case 'cobro': return <Receipt className="w-4 h-4 text-white" />;
      default: return <Bell className="w-4 h-4 text-white" />;
    }
  };

  const getNotifColor = (tipo: string) => {
    switch (tipo) {
      case 'pago': return 'bg-green-500';
      case 'ticket': return 'bg-orange-500';
      case 'comunicado': return 'bg-slate-600';
      case 'evento': return 'bg-purple-500';
      case 'encuesta': return 'bg-indigo-500';
      case 'cobro': return 'bg-cyan-500';
      default: return 'bg-slate-500';
    }
  };

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
      setAjustesRecibo(recibo?.id_recibo ? await AjusteService.getAjustesDeRecibo(recibo.id_recibo) : []);
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
  const [votacionFilter, setVotacionFilter] = useState<'todas' | 'activa' | 'cerrada'>('todas');
  const [selectedVotacion, setSelectedVotacion] = useState<any | null>(null);
  
  const [opcionSeleccionada, setOpcionSeleccionada] = useState<string>('');
  const [enviandoVoto, setEnviandoVoto] = useState(false);

  const handleVotarDirecto = async (encuesta_id: string) => {
    if (!opcionSeleccionada) return;
    setEnviandoVoto(true);
    const res = await EncuestaService.votar(encuesta_id, userData.apartamento, opcionSeleccionada);
    setEnviandoVoto(false);
    if (res.exito) {
      alert("¡Voto registrado y encriptado exitosamente!");
      const updatedVoto = { apartamento: userData.apartamento, opcion_seleccionada: opcionSeleccionada };
      setSelectedVotacion({ ...selectedVotacion, votos: [...(selectedVotacion.votos || []), updatedVoto] });
      setVotacionesComunidad(prev => prev.map(v => v.id === encuesta_id ? { ...v, votos: [...(v.votos || []), updatedVoto] } : v));
    } else {
      alert(res.mensaje || "Error al votar");
    }
  };

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
        
        const resVotos = await EncuestaService.getEncuestas(userData.codigo_edificio);
        if (resVotos) {
          setVotacionesComunidad(resVotos);
        }
      };
      fetchComunidad();
    }
  }, [userData?.codigo_edificio, isVotacionesModalOpen]);

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

  // ── ESTADO Y REALTIME PARA COMUNICADOS ──────────────────────────────────────
  const [comunicados, setComunicados] = useState<any[]>([]);
  // ── ESTADOS PARA LA BÚSQUEDA Y FILTROS ──────────────────────────────────────
  const [comSearchTerm, setComSearchTerm] = useState('');
  const [comFilterTag, setComFilterTag] = useState<'Todos' | 'Mantenimiento' | 'Informativo' | 'Urgente'>('Todos');
  const [comDateFrom, setComDateFrom] = useState('');
  const [comDateTo, setComDateTo] = useState('');
  const [comunicadoLimit, setComunicadoLimit] = useState(5);
  const [selectedComunicado, setSelectedComunicado] = useState<any | null>(null);
  const [expandedComId, setExpandedComId] = useState<string | null>(null);
// --- ESTADOS PARA EL CALENDARIO ---
  const [eventos, setEventos] = useState<any[]>([]);
  const [fechaActual, setFechaActual] = useState(new Date());
  const [eventoSeleccionado, setEventoSeleccionado] = useState<any | null>(null);

  // Lógica para filtrar los comunicados en tiempo real
  const comunicadosFiltrados = comunicados.filter((c) => {
    const coincideBusqueda = c.titulo.toLowerCase().includes(comSearchTerm.toLowerCase()) || 
                             c.cuerpo.toLowerCase().includes(comSearchTerm.toLowerCase());
    const coincideFiltro = comFilterTag === 'Todos' || c.categoria === comFilterTag;
    let coincideFecha = true;
    if (comDateFrom || comDateTo) {
      // Use LOCAL date to avoid UTC timezone shift (e.g. UTC-4 shifts midnight dates)
      const d = new Date(c.creado_en);
      const fechaStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (comDateFrom) coincideFecha = coincideFecha && fechaStr >= comDateFrom;
      if (comDateTo)   coincideFecha = coincideFecha && fechaStr <= comDateTo;
    }
    return coincideBusqueda && coincideFiltro && coincideFecha;
  });
  

  useEffect(() => {
    if (!userData?.codigo_edificio) return;

    // 1. Cargar los comunicados actuales al entrar
    const fetchComunicados = async () => {
      const response = await ComunidadService.getComunicados(userData.codigo_edificio);
      if (response.exito && response.data) {
        setComunicados(response.data);
      }
      const envRes = await ComunidadService.getEventos(userData.codigo_edificio);
      if (envRes.exito && envRes.data) {
        setEventos(envRes.data);
      }
    };
    
    fetchComunicados();

    // 2. MAGIA: Suscribirse a cambios en tiempo real (Supabase Realtime)
    const channel = supabase
      .channel('comunicados-vecinos')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'comunicados',
          filter: `codigo_edificio=eq.${userData.codigo_edificio}` // Solo escucha avisos de SU edificio
        },
        (payload) => {
          // Cuando el admin publica, metemos el nuevo aviso al inicio de la lista
          setComunicados((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    // Limpiar suscripción al salir
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userData?.codigo_edificio]);

  const aliquot = Number(userData?.alicuota) || 0;
  const yourShare = (totalBuildingExpense * aliquot) / 100;
  // Desglose del recibo: si ya se emitió usamos lo facturado; si no, una estimación con los gastos del mes
  // Estimación: su parte (por alícuota) de lo que falta para completar el fondo de reserva
  const fondoEstimado = Math.round(Math.max(0, config.fondo_reserva_meta - config.fondo_reserva_saldo) * aliquot) / 100;
  const desglose = currentRecibo
    ? {
        emitido: true,
        alicuota: Number(currentRecibo.monto_alicuota) || 0,
        fondo: Number(currentRecibo.fondo_reserva) || 0,
        cargos: Number(currentRecibo.monto_cargos) || 0,
        creditos: Number(currentRecibo.monto_creditos) || 0,
        total: Number(currentRecibo.monto_total) || 0,
      }
    : {
        emitido: false,
        alicuota: yourShare,
        fondo: fondoEstimado,
        cargos: 0,
        creditos: 0,
        total: yourShare + fondoEstimado,
      };
  const monthTotal = desglose.total;

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
      default: return 'bg-slate-500/20 text-gray-300 border-gray-500/30';
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
            .Kuota-logo-img {
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
            <img src="${KuotaLogo}" alt="Logo Kuota" class="Kuota-logo-img" />
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
    <div className="min-h-screen bg-kbg pb-32 text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-kbg/90 backdrop-blur-lg border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-white text-3xl font-bold tracking-wide">Kuota</h1>
            <p className="text-white/50 text-sm font-light">tu comunidad</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle className="text-white" />
            <button onClick={() => setIsNotificationsOpen(true)} className="relative hover:opacity-80 transition-opacity">
              <Bell className="w-6 h-6 text-white" />
              {realUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 min-w-[18px] h-[18px] rounded-full border-2 border-blue-900 flex items-center justify-center text-[10px] font-bold text-white px-1">
                  {realUnreadCount > 9 ? '+9' : realUnreadCount}
                </span>
              )}
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
        <div className={`absolute top-20 right-4 md:right-8 w-[400px] max-w-[calc(100vw-2rem)] max-h-[600px] bg-kcard rounded-3xl shadow-lg transition-all duration-300 ${isNotificationsOpen ? 'scale-100 translate-y-0' : 'scale-95 -translate-y-4'} overflow-hidden`}>
          <div className="bg-kbg border-b border-slate-800 px-6 py-5 flex items-center justify-between">
            <div>
              <h3 className="text-white text-xl font-bold">Notificaciones</h3>
              <p className="text-slate-400 text-xs mt-0.5">{realUnreadCount} sin leer</p>
            </div>
            <div className="flex items-center gap-2">
              {realUnreadCount > 0 && (
                <button 
                  onClick={handleMarkAllAsRead}
                  title="Marcar todas como leídas"
                  className="hover:bg-kcard/20 p-2 rounded-xl transition-all"
                >
                  <CheckCheck className="w-5 h-5 text-white" />
                </button>
              )}
              {realNotifications.length > 0 && (
                <button 
                  onClick={handleDeleteAllNotifs}
                  title="Eliminar todas las notificaciones"
                  className="hover:bg-kcard/20 p-2 rounded-xl transition-all text-white/50 hover:text-white"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <button 
                onClick={() => setIsNotificationsOpen(false)} 
                className="hover:bg-kcard/20 p-2 rounded-xl transition-all"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto max-h-[500px] custom-scrollbar">
            {realNotifications.length === 0 ? (
              <div className="p-12 text-center">
                <div className="bg-slate-800/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-10 h-10 text-slate-400" />
                </div>
                <p className="text-slate-500 font-medium italic">No hay nada nuevo por aquí</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {realNotifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={`p-5 hover:bg-kbg/80 transition-all ${notif.leido ? 'bg-kcard' : 'bg-slate-800/40'}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`${getNotifColor(notif.tipo)} p-2.5 rounded-2xl shrink-0 shadow-lg shadow-blue-500/10`}>
                        {getNotifIcon(notif.tipo)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className={`font-bold text-[15px] truncate ${notif.leido ? 'text-slate-200' : 'text-slate-100'}`}>
                            {notif.titulo}
                          </h4>
                          {!notif.leido ? (
                            <button 
                              onClick={() => handleMarkAsRead(notif.id)}
                              className="text-slate-200 hover:text-blue-700 p-1 bg-slate-800/30 rounded-lg transition-colors"
                              title="Marcar como leída"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          ) : (
                            <button 
                              onClick={(e) => handleDeleteNotif(notif.id, e)}
                              className="text-slate-500 hover:text-red-500 p-1 bg-kbg rounded-lg transition-colors"
                              title="Eliminar notificación"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <p className="text-slate-400 text-sm mt-1.5 leading-relaxed line-clamp-2">{notif.mensaje}</p>
                        <div className="flex items-center gap-1.5 mt-3 text-[11px] text-slate-500 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(notif.created_at).toLocaleDateString('es-ES', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {realNotifications.length > 0 && (
            <div className="p-4 bg-kbg/50 border-t border-slate-800/50 text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[2px]">Kuota Security System</p>
            </div>
          )}
        </div>
      </div>

      <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setIsMenuOpen(false); setIsHelpOpen(false); setSelectedFaq(null); }} />
        <div className={`absolute top-0 right-0 h-full w-80 max-w-[85vw] bg-kcard shadow-lg transition-transform duration-300 ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="bg-kbg border-b border-slate-800 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-kcard/20 rounded-full flex items-center justify-center"><User className="w-6 h-6 text-white" /></div>
                <div>
                  <h3 className="text-white">{userData?.nombre || 'Usuario'}</h3>
                  <p className="text-white/70 text-sm">{userData?.apartamento || 'Apto'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {userData?.rol === 'admin' && <div className="px-3 py-1 bg-yellow-400/20 text-yellow-200 rounded-md text-xs">Administrador</div>}
                <button onClick={() => { setIsMenuOpen(false); setIsHelpOpen(false); setSelectedFaq(null); }} className="p-2 rounded-lg hover:bg-kcard/10 transition-all"><X className="w-5 h-5 text-white" /></button>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-2">
            <button onClick={() => { setActiveTab('perfil'); setIsMenuOpen(false); }} className="group w-full flex items-center gap-4 p-3.5 rounded-2xl hover:bg-slate-800 hover:translate-x-1 hover:shadow-lg transition-all duration-300 text-left">
              <div className="bg-kbg p-2.5 rounded-xl group-hover:scale-110 transition-transform"><User className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors" /></div>
              <span className="text-slate-300 group-hover:text-white font-medium transition-colors">Perfil</span>
            </button>
            <button onClick={() => { setActiveTab('ayuda'); setIsMenuOpen(false); }} className="group w-full flex items-center gap-4 p-3.5 rounded-2xl hover:bg-slate-800 hover:translate-x-1 hover:shadow-lg transition-all duration-300 text-left">
              <div className="bg-kbg p-2.5 rounded-xl group-hover:scale-110 transition-transform"><HelpCircle className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors" /></div>
              <span className="text-slate-300 group-hover:text-white font-medium transition-colors">Centro de Ayuda</span>
            </button>

            <button onClick={onBackToSelector} className="group w-full flex items-center gap-4 p-3.5 rounded-2xl hover:bg-slate-800 hover:translate-x-1 hover:shadow-lg transition-all duration-300 text-left">
              <div className="bg-kbg p-2.5 rounded-xl group-hover:scale-110 transition-transform"><Home className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 transition-colors" /></div>
              <span className="text-slate-300 group-hover:text-white font-medium transition-colors">Cambiar de Edificio</span>
            </button>
            
            <ThemeSwitchRow />

            <div className="border-t border-slate-700/50 my-4 mx-2"></div>
            
            <button onClick={onLogout} className="group w-full flex items-center gap-4 p-3.5 rounded-2xl hover:bg-red-500/10 hover:translate-x-1 transition-all duration-300 text-left">
              <div className="bg-kbg group-hover:bg-red-500/20 p-2.5 rounded-xl group-hover:scale-110 transition-all"><LogOut className="w-5 h-5 text-red-500 group-hover:text-red-400 transition-colors" /></div>
              <span className="text-red-500 group-hover:text-red-400 font-medium transition-colors">Cerrar Sesión</span>
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
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className={`relative overflow-hidden rounded-3xl p-8 shadow-md transition-all ${isSolvent ? 'bg-kcard border border-emerald-500/20 bg-gradient-to-b from-emerald-900/10 to-transparent' : 'bg-kcard border border-red-500/20 bg-gradient-to-b from-red-900/10 to-transparent'}`}>
            <div className={`absolute top-0 left-0 w-full h-1.5 ${isSolvent ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`} />
            <div className={`text-sm mb-2 flex items-center gap-2 ${isSolvent ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
              <DollarSign className="w-4 h-4" />
              {isSolvent ? 'Estado de Cuenta' : 'Deuda Pendiente'}
            </div>

            {isSolvent ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="w-12 h-12 text-emerald-400" />
                  <h1 className="text-4xl text-emerald-400 font-bold tracking-tight">Estás Solvente</h1>
                </div>
                {balance < 0 ? (
                  <div className="bg-emerald-900/20 border border-emerald-500/20 rounded-xl p-4 flex justify-between items-center">
                    <span className="text-emerald-400/80 text-sm xl:text-base font-medium">Saldo a favor:</span>
                    <span className="text-emerald-400 font-bold text-2xl">{fmt(Math.abs(balance))}</span>
                  </div>
                ) : (
                  <p className="text-slate-400 text-lg">¡No tienes pagos pendientes!</p>
                )}

                <div className="text-slate-400 text-sm bg-black/20 px-3 py-1.5 rounded-lg border border-slate-800 flex flex-col w-fit">
                  <span>{etiquetaTasa}</span>
                  <span className="text-[10px] text-white/50">{isLoadingBcv ? 'Actualizando...' : `Act: ${bcvDate}`}</span>
                </div>
                
                <button onClick={() => setIsReceiptModalOpen(true)} className="mt-4 w-full bg-emerald-900/30 text-emerald-400 font-semibold py-4 rounded-2xl border border-emerald-500/30 hover:bg-emerald-900/50 transition-all shadow-sm flex items-center justify-center gap-2">
                  <FileText className="w-5 h-5" /> VER RECIBO ACTUAL
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-1 mb-4">
                  <h1 className="text-5xl text-red-400 font-bold tracking-tight">{fmt(balance)}</h1>
                  <p className="text-slate-400 text-xl font-medium">{fmtBs(balance)}</p>
                </div>
                <div className="flex items-center justify-between mb-6">
                  <div className="text-slate-400 text-sm bg-black/20 px-3 py-1.5 rounded-lg border border-slate-800 flex flex-col">
                    <span>{etiquetaTasa}</span>
                    <span className="text-[10px] text-white/50">{isLoadingBcv ? 'Actualizando...' : `Act: ${bcvDate}`}</span>
                  </div>
                  <div className="text-red-400 flex items-center gap-1.5 text-sm bg-red-900/20 px-3 py-1.5 rounded-lg border border-red-500/30 animate-pulse">
                    <AlertCircle className="w-4 h-4" /> Requiere Pago
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={() => setIsPaymentModalOpen(true)} className="flex-1 bg-slate-100 text-slate-900 font-semibold py-4 rounded-2xl border border-slate-200 hover:bg-white transition-all shadow-sm">
                    REPORTAR PAGO
                  </button>
                  <button onClick={() => setIsReceiptModalOpen(true)} className="flex-1 bg-slate-800 text-slate-200 font-semibold py-4 rounded-2xl border border-slate-700 hover:bg-slate-700 transition-all shadow-sm flex items-center justify-center gap-2">
                    <FileText className="w-5 h-5" /> VER RECIBO
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <button onClick={() => setIsTicketModalOpen(true)} className={`bg-kcard/10 backdrop-blur-lg rounded-2xl p-6 hover:bg-kcard/20 transition-all border border-slate-700 shadow-lg ${highlightFault ? 'ring-2 ring-yellow-300 animate-pulse' : ''}`}>
              <div className="flex flex-col items-center gap-3">
                <div className="bg-slate-600 p-4 rounded-full"><Wrench className="w-6 h-6 text-white" /></div>
                <span className="text-white text-sm text-center">Reportar Falla</span>
              </div>
            </button>
            <button onClick={() => { setActiveTab('finanzas'); setHighlightBank(true); setTimeout(() => setHighlightBank(false), 3000); }} className="bg-kcard/10 backdrop-blur-lg rounded-2xl p-6 hover:bg-kcard/20 transition-all border border-slate-700 shadow-lg">
              <div className="flex flex-col items-center gap-3">
                <div className="bg-slate-600 p-4 rounded-full"><Clock className="w-6 h-6 text-white" /></div>
                <span className="text-white text-sm text-center">Historial de Pagos</span>
              </div>
            </button>
            <button onClick={() => setIsQuickBankModalOpen(true)} className="bg-kcard/10 backdrop-blur-lg rounded-2xl p-6 hover:bg-kcard/20 transition-all border border-slate-700 shadow-lg relative">
              <div className="flex flex-col items-center gap-3">
                <div className="bg-slate-600 p-4 rounded-full"><CreditCard className="w-6 h-6 text-white" /></div>
                <span className="text-white text-sm text-center">Datos Bancarios</span>
              </div>
            </button>
          </div>
          
          {isQuickBankModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsQuickBankModalOpen(false)} />
              <div className="relative bg-kcard rounded-3xl w-full max-w-md shadow-lg overflow-hidden animate-in zoom-in-95 fade-in duration-300 flex flex-col max-h-[90vh]">
                
                <div className="bg-kbg border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-slate-400" />
                    <h3 className="text-white text-lg font-semibold">Cuentas del Edificio</h3>
                  </div>
                  <button onClick={() => setIsQuickBankModalOpen(false)} className="p-1 rounded-full hover:bg-slate-800 transition-colors">
                    <X className="w-5 h-5 text-slate-400 hover:text-white" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar relative z-10">
                  {isLoadingBank ? (
                    <p className="text-slate-400 text-sm text-center py-4">Cargando datos...</p>
                  ) : cuentasBancarias.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-4">No hay datos bancarios registrados para este edificio.</p>
                  ) : (
                    <div className="space-y-4 text-sm">
                      {cuentasBancarias.map((cuenta, idx) => (
                        <div key={idx} className="bg-kbg p-5 rounded-2xl border border-slate-700 space-y-3">
                          <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-3">
                            <span className={`font-bold text-base ${cuenta.moneda === '$' ? 'text-green-400' : 'text-slate-200'}`}>
                              {cuenta.banco_nombre}
                            </span>
                            <span className="text-xs px-2.5 py-1 rounded-md bg-kcard border border-slate-700 text-slate-300 font-medium">
                              {cuenta.moneda === '$' ? 'Dólares' : 'Bolívares'}
                            </span>
                          </div>
                          {cuenta.numero_cuenta && (
                            <div>
                              <span className="text-slate-400 block text-xs mb-1 uppercase tracking-wider">{cuenta.moneda === '$' ? 'Correo Zelle:' : 'N° Cuenta:'}</span>
                              <span className="text-slate-200 font-mono text-sm break-all">{cuenta.numero_cuenta}</span>
                            </div>
                          )}
                          {cuenta.telefono && cuenta.moneda !== '$' && (
                            <div>
                              <span className="text-slate-400 block text-xs mb-1 uppercase tracking-wider">Pago Móvil:</span>
                              <span className="text-slate-200 text-sm">{cuenta.telefono}</span>
                            </div>
                          )}
                          {cuenta.rif && cuenta.moneda !== '$' && (
                            <div>
                              <span className="text-slate-400 block text-xs mb-1 uppercase tracking-wider">RIF/Cédula:</span>
                              <span className="text-slate-200 text-sm">{cuenta.rif}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ÚLTIMAS ACTUALIZACIONES */}
          <div className="space-y-4">
            <h2 className="text-white text-xl font-semibold px-2 flex items-center gap-2">
              <Activity className="w-5 h-5 text-slate-400" /> Últimas Actualizaciones
            </h2>
            <div className="space-y-3">
              {/* Comunicados */}
              <div 
                onClick={() => {
                  setActiveTab('comunidad');
                  setTimeout(() => document.getElementById('seccion-comunicados')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                }}
                className="bg-kcard/10 backdrop-blur-lg rounded-2xl p-5 hover:bg-kcard/20 transition-all border border-slate-700 shadow-lg cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-slate-600 p-3 rounded-xl shrink-0 group-hover:scale-110 transition-transform">
                    <Megaphone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-slate-100 font-semibold flex items-center gap-2">
                      Comunicados Oficiales
                    </h3>
                    <p className="text-white/70 text-sm">Anuncios de la administración</p>
                  </div>
                </div>
                <div className="bg-slate-500/20 px-3 py-1 rounded-full border border-blue-500/30">
                  <span className="text-slate-400 font-bold text-sm">
                    {(() => {
                      const nuevos = comunicados.filter(c => new Date(c.creado_en) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length;
                      return nuevos > 0 ? `${nuevos} (Últimos 7 días)` : `${comunicados.length} En total`;
                    })()}
                  </span>
                </div>
              </div>

              {/* Votaciones Pendientes */}
              <div 
                onClick={() => {
                  setActiveTab('comunidad');
                  setTimeout(() => document.getElementById('seccion-votaciones')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                }}
                className="bg-kcard/10 backdrop-blur-lg rounded-2xl p-5 hover:bg-kcard/20 transition-all border border-slate-700 shadow-lg cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-purple-500 p-3 rounded-xl shrink-0 group-hover:scale-110 transition-transform">
                    <Vote className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-slate-100 font-semibold">Votaciones Pendientes</h3>
                    <p className="text-white/70 text-sm">Decisiones requieren tu participación</p>
                  </div>
                </div>
                {(() => {
                  const pendientes = votacionesComunidad.filter(v => 
                    v.activa && !v.votos?.some((vo:any) => vo.apartamento === userData?.apartamento)
                  ).length;
                  return (
                    <div className={`px-3 py-1 rounded-full border ${pendientes > 0 ? 'bg-purple-500/20 border-purple-500/30 text-purple-300' : 'bg-slate-500/20 border-gray-500/30 text-slate-500'}`}>
                      <span className="font-bold text-sm">
                        {pendientes > 0 ? `${pendientes} Por votar` : 'Al día'}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Eventos Próximos */}
              <div 
                onClick={() => {
                  setActiveTab('comunidad');
                  setTimeout(() => document.getElementById('seccion-eventos')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                }}
                className="bg-kcard/10 backdrop-blur-lg rounded-2xl p-5 hover:bg-kcard/20 transition-all border border-slate-700 shadow-lg cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-green-500 p-3 rounded-xl shrink-0 group-hover:scale-110 transition-transform">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-slate-100 font-semibold">Eventos Próximos</h3>
                    <p className="text-white/70 text-sm">Actividades y asambleas</p>
                  </div>
                </div>
                {(() => {
                  const proximos = eventos.filter(e => new Date(e.fecha) >= new Date(new Date().setHours(0,0,0,0))).length;
                  return (
                    <div className={`px-3 py-1 rounded-full border ${proximos > 0 ? 'bg-green-500/20 border-green-500/30 text-green-300' : 'bg-slate-500/20 border-gray-500/30 text-slate-500'}`}>
                      <span className="font-bold text-sm">
                        {proximos > 0 ? `${proximos} Agendado(s)` : 'Ninguno'}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <h2 className="text-white text-xl font-semibold">Mis Gestiones</h2>
              {userTickets.length > 3 && (
                <button onClick={() => setActiveTab('comunidad')} className="group text-slate-400 text-sm hover:text-white transition-colors duration-200 flex items-center gap-1">
                  Ver todas <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
                </button>
              )}
            </div>
            
            {userTickets.length === 0 ? (
              <div className="bg-kcard/10 backdrop-blur-lg rounded-2xl p-5 border border-slate-700 shadow-lg">
                <p className="text-white/60 text-sm text-center py-4">Aún no has reportado ninguna falla.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {userTickets.slice(0, 3).map((ticket) => (
                  <div
                    key={ticket.id_ticket}
                    className="bg-kcard/10 backdrop-blur-lg rounded-2xl p-5 hover:bg-kcard/20 transition-all border border-slate-700 shadow-lg cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                    onClick={() => { setActiveTab('comunidad'); setTimeout(() => setSelectedTicket(ticket), 300); }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-slate-800/30 p-3 rounded-xl shrink-0 group-hover:scale-110 transition-transform">
                        <Wrench className={`w-5 h-5 ${ticket.estado === 'cerrado' ? 'text-emerald-400' : ticket.estado === 'en_proceso' ? 'text-blue-400' : 'text-slate-400'}`} />
                      </div>
                      <div>
                        <h3 className="text-slate-100 font-semibold">{ticket.titulo}</h3>
                        <p className="text-white/70 text-sm">Reportado el {new Date(ticket.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <div className={`px-3 py-1 rounded-full border ${getTicketStatusColor(ticket.estado)}`}>
                        <span className="font-bold text-sm">
                          {getTicketStatusText(ticket.estado)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VISTA FINANZAS */}
      {activeTab === 'finanzas' && (
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-kcard/10 backdrop-blur-lg rounded-2xl p-4 border border-slate-700">
            <div className="flex items-center justify-between">
              <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg hover:bg-kcard/10 transition-all"><ChevronLeft className="w-6 h-6 text-white" /></button>
              <h2 className="text-white text-xl capitalize font-medium">{formatMonth(selectedMonth)}</h2>
              <button onClick={() => changeMonth(1)} disabled={isNextMonthDisabled} className="p-2 rounded-lg hover:bg-kcard/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight className="w-6 h-6 text-white" /></button>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-white text-xl px-2">Desglose del Recibo</h2>
            <div className="bg-kcard/10 backdrop-blur-lg rounded-2xl p-6 border border-slate-700">
              <h3 className="text-slate-100 font-semibold mb-4">Gastos Comunes del Edificio</h3>
              {expenses.length === 0 ? (
                <p className="text-white/60 text-sm mb-6">No hay gastos registrados en este mes.</p>
              ) : (
                <div className="space-y-4 mb-6">
                  {expenses.map((expense, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-4">
                      <span className="text-slate-400 text-sm flex-1">{expense.concept}</span>
                      <div className="w-24 h-2 bg-kcard/10 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-500 rounded-full" style={{ width: `${expense.percentage}%` }} />
                      </div>
                      <span className="text-white font-medium w-24 text-right">{fmt(expense.total)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="bg-kbg/50 text-slate-400 -mx-6 -mb-6 p-6 rounded-b-2xl border-t border-slate-700">
                <h3 className="text-slate-100 font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4" />Cálculo de Tu Cuota</h3>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm"><span className="text-white/80">Gasto Total del Edificio</span><span className="text-white font-medium">{fmt(totalBuildingExpense)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-white/80">Tu Alícuota</span><span className="text-white font-medium">{aliquot.toFixed(2)}%</span></div>
                  <div className="flex justify-between text-sm"><span className="text-white/80">Tu parte de los gastos</span><span className="text-white font-medium">{fmt(desglose.alicuota)}</span></div>
                  {desglose.fondo > 0 && (
                    <div className="flex justify-between text-sm"><span className="text-white/80">Reposición del fondo de reserva</span><span className="text-blue-400 font-medium">+ {fmt(desglose.fondo)}</span></div>
                  )}
                  {desglose.cargos > 0 && (
                    <div className="flex justify-between text-sm"><span className="text-white/80">Multas y cargos extra</span><span className="text-orange-400 font-medium">+ {fmt(desglose.cargos)}</span></div>
                  )}
                  {desglose.creditos > 0 && (
                    <div className="flex justify-between text-sm"><span className="text-white/80">Devoluciones a tu favor</span><span className="text-emerald-400 font-medium">− {fmt(desglose.creditos)}</span></div>
                  )}
                </div>
                <div className="border-t border-slate-700 mt-4 pt-4 flex justify-between items-center">
                  <span className="text-white text-lg">Total del Mes{desglose.emitido ? '' : ' (estimado)'}</span><span className="text-white text-3xl font-bold">{fmt(monthTotal)}</span>
                </div>
                <p className="text-right text-sm text-slate-400 mt-1">{fmtBs(monthTotal)}</p>
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
                      ? 'bg-slate-100 text-slate-900 hover:bg-white shadow-lg'
                      : 'bg-kcard/10 text-white/70 hover:bg-kcard/20'
                  }`}
                >
                  {filter === 'todos' ? 'Todos' : filter === 'aprobado' ? 'Aprobados' : filter === 'pendiente' ? 'Pendientes' : 'Rechazados'}
                </button>
              ))}
            </div>

            <div className="bg-kcard/10 backdrop-blur-lg rounded-2xl p-4 border border-slate-700">
              {isLoadingPayments ? (
                <p className="text-white/60 text-center py-4">Cargando pagos...</p>
              ) : filteredPayments.length === 0 ? (
                <p className="text-white/60 text-center py-4">No hay pagos registrados para este mes.</p>
              ) : (
                <div key={paymentFilter} className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                        className="p-4 rounded-xl border border-slate-800 hover:bg-kcard/5 transition-all cursor-pointer group"
                        onClick={() => {
                          if (pago.comprobante_url) {
                            setSelectedPaymentProof(pago.comprobante_url);
                          }
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-slate-100 font-semibold flex items-center gap-2 group-hover:text-slate-400 transition-colors">
                              {pago.metodo} 
                              {pago.comprobante_url && <FileText className="w-4 h-4 text-white/50" />}
                            </h4>
                            <p className="text-white/50 text-sm mt-1">
                              {fFormat} • Ref: {pago.referencia}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-bold">{fmt(Number(pago.monto))}</p>
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

          <div className={`bg-kcard/10 backdrop-blur-lg rounded-2xl p-5 border border-slate-700 ${highlightBank ? 'ring-2 ring-yellow-300 animate-pulse' : ''}`}>
            <h3 className="text-white mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5" /> Datos Bancarios para Pagos</h3>
            {isLoadingBank ? (
              <p className="text-white/60 text-sm">Cargando datos...</p>
            ) : cuentasBancarias.length === 0 ? (
              <p className="text-white/60 text-sm">No hay datos bancarios registrados para este edificio.</p>
            ) : (
              <div className="space-y-3 text-sm">
                {cuentasBancarias.map((cuenta, idx) => (
                  <div key={cuenta.id || idx} className="bg-black/20 p-3 rounded-xl border border-white/5 space-y-2">
                     <span className={`${cuenta.moneda === '$' ? 'text-green-300' : 'text-slate-400'} font-bold block border-b border-slate-800 pb-1 flex justify-between`}>
                      <span>{cuenta.banco_nombre}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-kcard/10">{cuenta.moneda}</span>
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
          
          {/* VOTACIONES Y ASAMBLEAS – VISTA COMPACTA CON FILTROS */}
          <div id="seccion-votaciones" className="space-y-4">
            <h2 className="text-white text-xl px-2 font-semibold flex items-center gap-2">
              <Vote className="w-5 h-5 text-purple-400" /> Votaciones
            </h2>

            {/* FILTER BUTTONS */}
            <div className="grid grid-cols-3 gap-3">
              <div onClick={() => setVotacionFilter('todas')} className={`cursor-pointer border rounded-2xl p-3 text-center transition-all ${votacionFilter === 'todas' ? 'bg-slate-600/30 border-blue-500' : 'bg-kcard/5 hover:bg-kcard/10 border-slate-800'}`}>
                <div className="text-2xl font-bold text-white">{votacionesComunidad.length}</div>
                <div className="text-[10px] text-white/70 font-medium uppercase tracking-wider mt-1">Todas</div>
              </div>
              <div onClick={() => setVotacionFilter('activa')} className={`cursor-pointer border rounded-2xl p-3 text-center transition-all ${votacionFilter === 'activa' ? 'bg-green-500/40 border-green-500' : 'bg-green-500/10 border-green-500/20 hover:bg-green-500/30'}`}>
                <div className="text-2xl font-bold text-green-400">{votacionesComunidad.filter(v => v.activa).length}</div>
                <div className="text-[10px] text-green-300 font-medium uppercase tracking-wider mt-1">Activas</div>
              </div>
              <div onClick={() => setVotacionFilter('cerrada')} className={`cursor-pointer border rounded-2xl p-3 text-center transition-all ${votacionFilter === 'cerrada' ? 'bg-slate-500/40 border-gray-500' : 'bg-slate-500/10 border-gray-500/20 hover:bg-slate-500/30'}`}>
                <div className="text-2xl font-bold text-slate-500">{votacionesComunidad.filter(v => !v.activa).length}</div>
                <div className="text-[10px] text-gray-300 font-medium uppercase tracking-wider mt-1">Cerradas</div>
              </div>
            </div>

            {/* COMPACT POLL ROWS */}
            <div className="bg-kcard/10 backdrop-blur-lg rounded-2xl p-5 border border-slate-700">
              <div className="space-y-3">
              {(() => {
                const filtered = votacionFilter === 'todas' ? votacionesComunidad
                  : votacionFilter === 'activa' ? votacionesComunidad.filter(v => v.activa)
                  : votacionesComunidad.filter(v => !v.activa);
                
                if (filtered.length === 0) return (
                  <div className="text-center py-6">
                    <p className="text-white/70 font-medium">No se encontraron votaciones en esta categoría.</p>
                  </div>
                );

                return filtered.map(vote => {
                  const totalVotos = vote.votos?.length || 0;
                  const votosSi = vote.votos?.filter((v: any) => v.opcion_seleccionada === vote.opciones[0]).length || 0;
                  const percentageSi = totalVotos === 0 ? 0 : Math.round((votosSi / totalVotos) * 100);
                  const yaVoto = vote.votos?.some((v: any) => v.apartamento === userData?.apartamento);

                  return (
                    <div key={vote.id} className="p-4 bg-black/20 hover:bg-kcard/5 border border-slate-800 rounded-xl cursor-pointer flex flex-col sm:flex-row justify-between sm:items-center gap-3 group" onClick={() => setSelectedVotacion(vote)}>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate pr-4 group-hover:text-purple-300 transition-colors">{vote.pregunta}</h3>
                        <p className="text-white/60 text-xs mt-0.5">Total votos: {totalVotos} • Cierre: {new Date(vote.fecha_cierre).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
                        {vote.activa && (
                          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                            yaVoto
                              ? 'bg-slate-500/10 text-slate-400 border-blue-500/30'
                              : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30 animate-pulse'
                          }`}>
                            {yaVoto ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            {yaVoto ? 'Ya Votaste' : 'Requiere Voto'}
                          </span>
                        )}
                        <span className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold border ${
                          vote.activa
                            ? 'bg-green-500/20 text-green-300 border-green-500/30'
                            : 'bg-slate-500/20 text-slate-500 border-gray-500/30'
                        }`}>{vote.activa ? 'ACTIVA' : 'CERRADA'}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedVotacion(vote); }}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] sm:text-sm font-semibold px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl transition-colors shrink-0"
                        >
                          Ver Detalles
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
              </div>
            </div>
          </div>

          {/* POLL DETAIL DIALOG */}
          <Dialog open={!!selectedVotacion} onOpenChange={() => { setSelectedVotacion(null); setOpcionSeleccionada(''); }}>
            {selectedVotacion && (() => {
              const totalVotos = selectedVotacion.votos?.length || 0;
              const votosSi = selectedVotacion.votos?.filter((v: any) => v.opcion_seleccionada === selectedVotacion.opciones[0]).length || 0;
              const percentageSi = totalVotos === 0 ? 0 : Math.round((votosSi / totalVotos) * 100);
              const result = selectedVotacion.activa ? 'En Curso' : (percentageSi >= 50 ? 'Aprobado' : 'Rechazado');
              const yaVoto = selectedVotacion.votos?.some((v: any) => v.apartamento === userData.apartamento);
              return (
                <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-700 p-0 overflow-hidden">
                  <div className="bg-kbg border-b border-slate-800 px-6 py-4">
                    <DialogTitle className="text-white flex items-center gap-2 text-lg font-semibold">
                      <Vote className="w-5 h-5 text-slate-400" /> Detalle de Votación
                    </DialogTitle>
                  </div>
                  <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-bold text-white pr-4">{selectedVotacion.pregunta}</h3>
                      <span className={`shrink-0 px-3 py-1 rounded-lg text-xs font-bold border ${
                        selectedVotacion.activa
                          ? 'bg-slate-800 text-slate-300 border-slate-700'
                          : result === 'Aprobado'
                            ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/30'
                            : 'bg-red-900/30 text-red-400 border-red-500/30'
                      }`}>{result}</span>
                    </div>
                    <p className="text-white/50 text-sm">Total de votos: {totalVotos} • Cierre: {new Date(selectedVotacion.fecha_cierre).toLocaleString()}</p>

                    {(!selectedVotacion.activa || yaVoto) ? (
                      <div className="space-y-3">
                        {selectedVotacion.documento_url && (
                          <a href={selectedVotacion.documento_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-400 bg-slate-500/10 px-3 py-1.5 rounded-lg text-sm transition-colors mb-2 border border-blue-500/20 w-fit">
                            <FileText className="w-4 h-4" /> Ver documento original
                          </a>
                        )}
                        {selectedVotacion.opciones.map((op: string, idx: number) => {
                          const isYes = idx === 0;
                          const isNo = idx === 1;
                          const color = isYes ? 'bg-green-400' : (isNo ? 'bg-red-400' : 'bg-yellow-400');
                          const textColor = isYes ? 'text-green-400' : (isNo ? 'text-red-400' : 'text-yellow-400');
                          const votosOpcion = selectedVotacion.votos?.filter((v: any) => v.opcion_seleccionada === op).length || 0;
                          const porcentaje = totalVotos === 0 ? 0 : Math.round((votosOpcion / totalVotos) * 100);
                          return (
                            <div key={op}>
                              <div className="flex justify-between text-xs font-medium mb-1">
                                <span className={textColor}>{op}</span>
                                <span className="text-white/80">{votosOpcion} votos <span className="opacity-50">({porcentaje}%)</span></span>
                              </div>
                              <div className="w-full bg-kcard/10 rounded-full h-2.5 overflow-hidden">
                                <div className={`${color} h-full rounded-full transition-all duration-500`} style={{ width: `${porcentaje}%` }} />
                              </div>
                            </div>
                          );
                        })}
                        {selectedVotacion.activa && yaVoto && (
                          <div className="text-center text-xs text-green-400 bg-green-500/10 py-2.5 rounded-lg border border-green-500/20 flex items-center justify-center gap-1.5 font-medium mt-4">
                            <CheckCircle className="w-4 h-4" /> Tu voto anónimo fue registrado
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {selectedVotacion.documento_url && (
                          <a href={selectedVotacion.documento_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-400 bg-slate-500/10 px-3 py-1.5 rounded-lg text-sm transition-colors mb-2 border border-blue-500/20 w-fit">
                            <FileText className="w-4 h-4" /> Ver documento original
                          </a>
                        )}
                        <p className="text-slate-400 text-sm font-medium mb-2 opacity-80">Selecciona tu voto escrutinio oculto (Irreversible)</p>
                        <div className="space-y-2">
                          {selectedVotacion.opciones.map((op: string) => (
                            <div key={op} onClick={() => setOpcionSeleccionada(op)} className={`flex items-center space-x-3 bg-kcard/5 p-3 flex-row rounded-lg border cursor-pointer hover:bg-kcard/10 transition-colors ${opcionSeleccionada === op ? 'border-purple-500 bg-purple-500/10' : 'border-slate-800'}`}>
                               <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${opcionSeleccionada === op ? 'border-purple-500' : 'border-white/30'}`}>
                                  {opcionSeleccionada === op && <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />}
                               </div>
                              <span className="text-white font-medium">{op}</span>
                            </div>
                          ))}
                        </div>
                        <button 
                          onClick={() => handleVotarDirecto(selectedVotacion.id)} 
                          disabled={!opcionSeleccionada || enviandoVoto} 
                          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-bold transition-colors shadow-lg flex items-center justify-center gap-2 mt-4"
                        >
                          <Vote className="w-4 h-4" /> {enviandoVoto ? 'COMPUTANDO...' : 'CONFIRMAR VOTO'}
                        </button>
                      </div>
                    )}
                  </div>
                </DialogContent>
              );
            })()}
          </Dialog>

          <div className="space-y-4">
            <div className="flex justify-between items-center px-2 mt-8">
              <h2 className="text-white text-xl font-semibold flex items-center gap-2">
                <Wrench className="w-5 h-5 text-slate-400" /> Mis Tickets
              </h2>
              <button onClick={() => setIsTicketModalOpen(true)} className="bg-slate-100 hover:bg-white text-slate-900 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors">
                <Plus className="w-4 h-4" /> Nuevo
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 px-2">
               <div onClick={() => setTicketUserFilter('todos')} className={`cursor-pointer border rounded-2xl p-3 text-center transition-all ${ticketUserFilter === 'todos' ? 'bg-slate-800 border-slate-600 shadow-md' : 'bg-kcard/5 hover:bg-kcard/20 border-slate-800'}`}>
                  <div className={`text-2xl font-bold ${ticketUserFilter === 'todos' ? 'text-white' : 'text-slate-300'}`}>{userTickets.length}</div>
                  <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1">Todos</div>
               </div>
               <div onClick={() => setTicketUserFilter('abierto')} className={`cursor-pointer border rounded-2xl p-3 text-center transition-all ${ticketUserFilter === 'abierto' ? 'bg-slate-800 border-slate-600 shadow-md' : 'bg-kcard/5 hover:bg-kcard/20 border-slate-800'}`}>
                 <div className={`text-2xl font-bold ${ticketUserFilter === 'abierto' ? 'text-white' : 'text-slate-300'}`}>{userTickets.filter(t => t.estado === 'abierto').length}</div>
                 <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1">Abiertos</div>
               </div>
               <div onClick={() => setTicketUserFilter('en_proceso')} className={`cursor-pointer border rounded-2xl p-3 text-center transition-all ${ticketUserFilter === 'en_proceso' ? 'bg-slate-800 border-slate-600 shadow-md' : 'bg-kcard/5 hover:bg-kcard/20 border-slate-800'}`}>
                 <div className={`text-2xl font-bold ${ticketUserFilter === 'en_proceso' ? 'text-white' : 'text-slate-300'}`}>{userTickets.filter(t => t.estado === 'en_proceso').length}</div>
                 <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1">En Proceso</div>
               </div>
               <div onClick={() => setTicketUserFilter('cerrado')} className={`cursor-pointer border rounded-2xl p-3 text-center transition-all ${ticketUserFilter === 'cerrado' ? 'bg-slate-800 border-slate-600 shadow-md' : 'bg-kcard/5 hover:bg-kcard/20 border-slate-800'}`}>
                 <div className={`text-2xl font-bold ${ticketUserFilter === 'cerrado' ? 'text-white' : 'text-slate-300'}`}>{userTickets.filter(t => t.estado === 'cerrado').length}</div>
                 <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1">Cerrados</div>
               </div>
               <div onClick={() => setTicketUserFilter('rechazado')} className={`cursor-pointer border rounded-2xl p-3 text-center transition-all ${ticketUserFilter === 'rechazado' ? 'bg-slate-800 border-slate-600 shadow-md' : 'bg-kcard/5 hover:bg-kcard/20 border-slate-800'}`}>
                 <div className={`text-2xl font-bold ${ticketUserFilter === 'rechazado' ? 'text-white' : 'text-slate-300'}`}>{userTickets.filter(t => t.estado === 'rechazado').length}</div>
                 <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1">Rechazados</div>
               </div>
            </div>

            <div className="bg-kcard/10 backdrop-blur-lg rounded-2xl p-5 border border-slate-700">
              {(() => {
                const filteredUserTickets = ticketUserFilter === 'todos' ? userTickets : userTickets.filter(t => t.estado === ticketUserFilter);
                
                if (filteredUserTickets.length === 0) {
                  return (
                    <div className="text-center py-6">
                      <p className="text-white/70 font-medium">No se encontraron fallas reportadas en esta categoría.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {filteredUserTickets.map(ticket => (
                      <div key={ticket.id_ticket} onClick={() => setSelectedTicket(ticket)} className="p-4 bg-black/20 hover:bg-kcard/5 border border-slate-800 rounded-xl cursor-pointer">
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
                );
              })()}
            </div>
          </div>
          
          <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
            {selectedTicket && (
              <DialogContent className="sm:max-w-lg bg-kbg border-slate-700 rounded-3xl p-0 overflow-hidden shadow-2xl">
                <div className="bg-kbg border-b border-slate-800 px-6 py-5 relative">
                  <DialogTitle className="text-white flex items-center gap-2 text-lg font-bold">
                    <Wrench className="w-5 h-5 text-slate-400" /> Detalles del Ticket #{selectedTicket.id_ticket}
                  </DialogTitle>
                </div>
                
                <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar space-y-6">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold text-white pr-4 leading-tight">{selectedTicket.titulo}</h3>
                    <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold border ${getTicketStatusColor(selectedTicket.estado)}`}>
                      {getTicketStatusText(selectedTicket.estado)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm bg-kcard p-4 rounded-2xl border border-slate-700/50">
                    <div>
                      <p className="text-slate-400 mb-1 font-medium text-xs uppercase tracking-wider">Fecha Reporte</p>
                      <p className="text-white font-semibold">{new Date(selectedTicket.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 mb-1 font-medium text-xs uppercase tracking-wider">Ubicación</p>
                      <p className="text-white font-semibold">{selectedTicket.ubicacion || 'No especificada'}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-slate-300 text-sm font-semibold mb-3 flex items-center gap-2">
                       <FileText className="w-4 h-4 text-slate-500" /> Descripción
                    </h4>
                    <div className="bg-kcard/50 p-4 rounded-2xl border border-slate-700/50 text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
                      {selectedTicket.descripcion}
                    </div>
                  </div>

                  {selectedTicket.foto_url && (
                    <div>
                      <h4 className="text-slate-300 text-sm font-semibold mb-3 flex items-center gap-2">
                         <Upload className="w-4 h-4 text-slate-500" /> Evidencia Adjunta
                      </h4>
                      <div className="rounded-2xl overflow-hidden border border-slate-700 bg-black/40 flex justify-center p-2">
                        <img src={selectedTicket.foto_url} alt="Evidencia" className="max-h-60 object-contain rounded-xl" />
                      </div>
                    </div>
                  )}

                  {selectedTicket.nota_admin && (
                    <div className="pt-6 border-t border-slate-800">
                      <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4">
                        <h4 className="text-blue-400 text-sm font-bold mb-2 flex items-center gap-2">
                           <User className="w-4 h-4" /> Respuesta de Administración
                        </h4>
                        <p className="text-slate-200 text-sm italic">{selectedTicket.nota_admin}</p>
                        
                        {selectedTicket.foto_resolucion_url && (
                           <div className="mt-4 pt-4 border-t border-blue-500/10">
                             <a href={selectedTicket.foto_resolucion_url} target="_blank" rel="noreferrer" className="block max-w-xs overflow-hidden rounded-xl border border-blue-500/20 hover:opacity-90 transition-opacity">
                               <img src={selectedTicket.foto_resolucion_url} alt="Evidencia de Resolución" className="w-full h-auto object-cover" />
                             </a>
                             <p className="text-blue-400/50 text-[10px] uppercase tracking-wide mt-2 font-semibold">Evidencia fotográfica adjunta</p>
                           </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedTicket.estado === 'cerrado' && (
                    <div className="pt-6 border-t border-slate-800">
                      <div className="bg-kcard border border-slate-700/50 rounded-2xl p-5">
                        <h4 className="text-slate-200 text-sm font-bold mb-4 flex items-center justify-center gap-2">
                          <Star className="w-4 h-4 text-yellow-500" /> Calificar Atención
                        </h4>
                        
                        {selectedTicket.calificacion ? (
                          <div className="space-y-4">
                            <div className="flex gap-1 justify-center">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star 
                                  key={star} 
                                  className={`w-8 h-8 ${star <= selectedTicket.calificacion ? 'fill-yellow-400 text-yellow-400' : 'text-slate-700'}`} 
                                />
                              ))}
                            </div>
                            {selectedTicket.comentario_calificacion && (
                              <p className="text-slate-300 text-sm text-center italic mt-2 bg-kbg/50 p-3 rounded-xl border border-slate-700/30">
                                "{selectedTicket.comentario_calificacion}"
                              </p>
                            )}
                            <p className="text-center text-xs text-slate-500 mt-2">Gracias por tu retroalimentación.</p>
                          </div>
                        ) : (
                          <div className="space-y-5">
                            <div className="flex justify-center gap-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setTicketRating(star)}
                                  className="transition-transform hover:scale-110 focus:outline-none"
                                >
                                  <Star 
                                    className={`w-9 h-9 ${star <= ticketRating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-700 hover:text-yellow-400/50'}`} 
                                  />
                                </button>
                              ))}
                            </div>
                            
                            {ticketRating > 0 && (
                              <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-3">
                                <textarea
                                  value={ticketRatingComment}
                                  onChange={(e) => setTicketRatingComment(e.target.value)}
                                  placeholder="Deja un comentario opcional sobre el servicio recibido..."
                                  className="w-full bg-kbg border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-slate-500 resize-none transition-colors"
                                  rows={2}
                                />
                                <button
                                  onClick={handleRateTicket}
                                  disabled={isSubmittingRating}
                                  className="w-full bg-slate-100 hover:bg-white text-slate-900 font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50"
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

          {/* CARTELERA DE COMUNICADOS REALES */}
          <div id="seccion-comunicados" className="space-y-4 mb-8">
            <h2 className="text-white text-xl px-2 font-semibold flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-slate-400" /> Cartelera Oficial
            </h2>

            {/* FILTROS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Búsqueda por texto */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <input
                  type="text"
                  placeholder="Buscar por título o contenido..."
                  value={comSearchTerm}
                  onChange={(e) => setComSearchTerm(e.target.value)}
                  className="w-full bg-kcard/10 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              {/* Categoría */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 z-10" />
                <select
                  value={comFilterTag}
                  onChange={(e) => setComFilterTag(e.target.value as any)}
                  className="w-full bg-kcard/10 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="Todos" className="bg-kbg">Todas las categorías</option>
                  <option value="Informativo" className="bg-kbg">Informativo</option>
                  <option value="Mantenimiento" className="bg-kbg">Mantenimiento</option>
                  <option value="Urgente" className="bg-kbg">Urgente</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none z-10" />
              </div>
              {/* Fecha desde */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
                <input
                  type="date"
                  value={comDateFrom}
                  onChange={(e) => setComDateFrom(e.target.value)}
                  className="w-full bg-kcard/10 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 [color-scheme:dark]"
                />
              </div>
              {/* Fecha hasta */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
                <input
                  type="date"
                  value={comDateTo}
                  onChange={(e) => setComDateTo(e.target.value)}
                  className="w-full bg-kcard/10 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Botón reiniciar filtros */}
            {(comSearchTerm || comFilterTag !== 'Todos' || comDateFrom || comDateTo) && (
              <div className="flex justify-end">
                <button
                  onClick={() => { setComSearchTerm(''); setComFilterTag('Todos'); setComDateFrom(''); setComDateTo(''); }}
                  className="flex items-center gap-1.5 text-white/60 hover:text-white text-xs font-medium transition-colors border border-slate-700 hover:border-white/40 px-3 py-1.5 rounded-lg"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reiniciar filtros
                </button>
              </div>
            )}
            <div className="bg-kcard/10 backdrop-blur-lg rounded-2xl p-5 border border-slate-700">
              {comunicadosFiltrados.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-white/70 font-medium">No se encontraron comunicados con esos filtros.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {comunicadosFiltrados.slice(0, comunicadoLimit).map((comunicado) => (
                    <div
                      key={comunicado.id}
                      onClick={() => setSelectedComunicado(comunicado)}
                      className="p-4 bg-black/20 hover:bg-kcard/5 border border-slate-800 rounded-xl cursor-pointer transition-all flex justify-between items-start gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate pr-2">{comunicado.titulo}</h3>
                        <div className="flex items-center gap-1.5 text-white/50 text-xs mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {new Date(comunicado.creado_en).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                        <p className="text-white/60 text-sm mt-1 line-clamp-1">{comunicado.cuerpo}</p>
                      </div>
                      <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold border ${
                        comunicado.categoria === 'Urgente' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                        comunicado.categoria === 'Mantenimiento' ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
                        'bg-slate-500/20 text-slate-400 border-blue-500/30'
                      }`}>{comunicado.categoria}</span>
                    </div>
                  ))}

                  {/* Mostrar más / menos */}
                  {comunicadosFiltrados.length > 5 && (
                    <div className="flex justify-center pt-2">
                      {comunicadoLimit < comunicadosFiltrados.length ? (
                        <button
                          onClick={() => setComunicadoLimit(prev => prev + 5)}
                          className="flex items-center gap-2 text-slate-400 hover:text-slate-400 text-sm font-medium transition-colors"
                        >
                          <ChevronDown className="w-4 h-4" /> Ver más comunicados
                        </button>
                      ) : (
                        <button
                          onClick={() => setComunicadoLimit(5)}
                          className="flex items-center gap-2 text-slate-400 hover:text-slate-400 text-sm font-medium transition-colors"
                        >
                          <ChevronUp className="w-4 h-4" /> Ver menos
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* DETAIL DIALOG FOR COMUNICADO */}
          <Dialog open={!!selectedComunicado} onOpenChange={() => setSelectedComunicado(null)}>
            {selectedComunicado && (
              <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-700 p-0 overflow-hidden">
                <div className={`px-6 py-4 ${
                  selectedComunicado.categoria === 'Urgente' ? 'bg-gradient-to-r from-red-700 to-red-800' :
                  selectedComunicado.categoria === 'Mantenimiento' ? 'bg-gradient-to-r from-orange-700 to-orange-800' :
                  'bg-gradient-to-r from-blue-700 to-blue-800'
                }`}>
                  <DialogTitle className="text-white flex items-center gap-2 text-lg">
                    <Megaphone className="w-5 h-5" /> {selectedComunicado.categoria}
                  </DialogTitle>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{selectedComunicado.titulo}</h3>
                    <div className="flex items-center gap-1.5 text-white/50 text-xs">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(selectedComunicado.creado_en).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                  <div className="bg-black/20 border border-slate-800 rounded-xl p-4 text-white/90 text-sm whitespace-pre-wrap leading-relaxed">
                    {selectedComunicado.cuerpo}
                  </div>
                  {selectedComunicado.imagen_url && (
                    <div className="rounded-xl overflow-hidden border border-slate-800 bg-black/40">
                      <img src={selectedComunicado.imagen_url} alt={selectedComunicado.titulo} className="w-full h-auto object-contain max-h-80" />
                    </div>
                  )}
                </div>
              </DialogContent>
            )}
          </Dialog>
          {/* ─── CALENDARIO DE EVENTOS ─── */}
          <div id="seccion-eventos" className="bg-kcard/5 border border-slate-800 rounded-3xl p-6 backdrop-blur-md mb-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-400" /> Agenda del Edificio
              </h3>
              <div className="flex items-center gap-4 text-white/80 bg-kcard/5 px-4 py-2 rounded-xl border border-white/5">
                <button onClick={() => setFechaActual(new Date(fechaActual.setMonth(fechaActual.getMonth() - 1)))} className="hover:text-slate-400">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-bold min-w-[120px] text-center capitalize">
                  {fechaActual.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={() => setFechaActual(new Date(fechaActual.setMonth(fechaActual.getMonth() + 1)))} className="hover:text-slate-400">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Grilla del Calendario */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'].map(d => (
                <div key={d} className="text-center text-[10px] uppercase tracking-widest text-white/30 font-bold py-2">{d}</div>
              ))}
              
              {Array.from({ length: new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0).getDate() }).map((_, i) => {
                const dia = i + 1;
                const fechaIterada = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), dia);
                const esPasado = fechaIterada.getTime() < new Date().setHours(0,0,0,0);
                
                const eventosDelDia = eventos.filter(e => {
                  const f = new Date(e.fecha);
                  return f.getUTCDate() === dia && f.getUTCMonth() === fechaActual.getMonth() && f.getUTCFullYear() === fechaActual.getFullYear();
                });

                return (
                  <button
                    key={i}
                    onClick={() => eventosDelDia.length > 0 && setEventoSeleccionado(eventosDelDia[0])}
                    className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all relative ${
                      esPasado ? 'opacity-20' : 'hover:bg-kcard/10 active:scale-90'
                    } ${eventosDelDia.length > 0 ? 'bg-kcard/10 border border-slate-700 shadow-lg shadow-black/20' : 'bg-kcard/[0.02]'}`}
                  >
                    <span className={`text-sm font-semibold ${eventosDelDia.length > 0 ? 'text-slate-400' : 'text-white/60'}`}>{dia}</span>
                    <div className="flex gap-0.5">
                      {eventosDelDia.slice(0, 3).map((e, idx) => (
                        <div key={idx} className={`w-1.5 h-1.5 rounded-full ${
                          e.tipo === 'Asamblea' ? 'bg-red-500' : 
                          e.tipo === 'Mantenimiento' ? 'bg-yellow-500' : 'bg-emerald-500'
                        }`} />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Tarjeta de Detalle Dinámica */}
            {eventoSeleccionado && (
              <div className="mt-6 p-5 bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-slate-800 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex justify-between items-start">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md ${
                        eventoSeleccionado.tipo === 'Asamblea' ? 'bg-red-500 text-white' : 
                        eventoSeleccionado.tipo === 'Mantenimiento' ? 'bg-yellow-500 text-black' : 'bg-emerald-500 text-white'
                      }`}>
                        {eventoSeleccionado.tipo}
                      </span>
                      <span className="text-white/40 text-[10px] font-bold">EVENTO CONFIRMADO</span>
                    </div>
                    <h4 className="text-white text-lg font-bold leading-tight">{eventoSeleccionado.titulo}</h4>
                    <div className="flex flex-wrap gap-4 text-white/60 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {eventoSeleccionado.hora_inicio.slice(0,5)} - {eventoSeleccionado.hora_fin.slice(0,5)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(eventoSeleccionado.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    {eventoSeleccionado.descripcion && (
                      <p className="text-slate-400 text-sm bg-black/20 p-3 rounded-xl border border-white/5">{eventoSeleccionado.descripcion}</p>
                    )}
                  </div>
                  <button onClick={() => setEventoSeleccionado(null)} className="bg-kcard/5 hover:bg-kcard/10 p-2 rounded-full transition-colors">
                    <X className="w-5 h-5 text-white/40" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-white text-xl px-2 font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-400" /> Documentos y Normativas
            </h2>

            {previewDoc && (
              <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-8">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewDoc(null)} />
                <div className="relative bg-kbg rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-slate-700 overflow-hidden">
                  <div className="bg-kcard/20 border-b border-slate-800 px-5 py-4 flex items-center justify-between shrink-0">
                    <h3 className="text-slate-100 font-semibold flex items-center gap-2 truncate">
                      <FileText className="w-5 h-5 shrink-0 text-slate-400" /> {previewDoc.titulo}
                    </h3>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <button
                        onClick={() => handleDownload(previewDoc.url_archivo, previewDoc.titulo)}
                        className="flex items-center gap-1.5 bg-kcard/50 hover:bg-kcard text-slate-300 hover:text-white px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors border border-slate-700 hover:border-slate-500"
                      >
                        <Download className="w-4 h-4" /> Descargar
                      </button>
                      <button onClick={() => setPreviewDoc(null)} className="p-1.5 rounded-full hover:bg-slate-800 transition-colors">
                        <X className="w-5 h-5 text-slate-400 hover:text-white" />
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
                          className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-lg"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-kcard/10 backdrop-blur-lg rounded-2xl p-5 border border-slate-700">
              {documents.length === 0 ? (
                <p className="text-white/50 text-sm text-center py-4">No hay documentos disponibles todavía.</p>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-kcard/10 transition-all border border-transparent hover:border-slate-800 group">
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
                          className="flex items-center gap-1.5 bg-kcard/50 hover:bg-kcard text-slate-300 hover:text-white px-3 py-2 rounded-xl text-xs font-semibold transition-colors border border-slate-800 hover:border-slate-600"
                        >
                          <Eye className="w-3.5 h-3.5" /> Ver
                        </button>
                        <button
                          onClick={() => handleDownload(doc.url_archivo, doc.titulo)}
                          className="flex items-center gap-1.5 bg-kcard/50 hover:bg-kcard text-slate-300 hover:text-white px-3 py-2 rounded-xl text-xs font-semibold transition-colors border border-slate-800 hover:border-slate-600"
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
            <div className="bg-kcard/10 backdrop-blur-lg rounded-2xl p-5 border border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {emergencyContacts.map((contact, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-black/20 hover:bg-kcard/5 border border-slate-800 rounded-xl transition-colors">
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
          <div className="bg-kbg border border-slate-800 rounded-3xl p-8 shadow-lg relative overflow-hidden">
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="bg-kcard p-4 rounded-full mb-4 border border-slate-700 shadow-inner">
                <HelpCircle className="w-10 h-10 text-slate-300" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Centro de Ayuda</h2>
              <p className="text-slate-400 max-w-lg mx-auto text-sm">
                Encuentra respuestas rápidas a las dudas más comunes sobre el uso de la plataforma, o contacta a nuestro equipo de soporte técnico.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-white text-xl px-2 font-semibold">Preguntas Frecuentes</h3>
            <div className="bg-kcard/10 backdrop-blur-lg rounded-2xl border border-slate-700 overflow-hidden shadow-lg">
              {[
                {
                  q: "¿Cómo reporto un pago por transferencia?",
                  a: "Dirígete a la pestaña de Inicio y selecciona 'REPORTAR PAGO'. Completa el formulario con la referencia y fecha exacta, y sube el comprobante en formato imagen o PDF."
                },
                {
                  q: "¿Cómo cambio mi clave de acceso a Kuota?",
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
                  <div key={idx} className="border-b border-slate-800 last:border-0 border-opacity-50">
                    <button 
                      onClick={() => setSelectedFaq(isSelected ? null : idx)} 
                      className="w-full flex items-center justify-between p-5 text-left hover:bg-kcard/5 transition-colors focus:outline-none"
                    >
                      <span className="font-semibold text-white pr-4">{faq.q}</span>
                      <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform duration-300 shrink-0 ${isSelected ? 'rotate-90' : ''}`} />
                    </button>
                    <div 
                      className={`overflow-hidden transition-all duration-300 ${isSelected ? 'max-h-48 bg-black/20' : 'max-h-0'}`}
                    >
                      <p className="p-5 text-slate-400 text-sm leading-relaxed border-t border-slate-800">
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
            <div className="bg-kcard/10 backdrop-blur-lg rounded-2xl p-8 border border-slate-700 shadow-lg flex flex-col items-center justify-center max-w-2xl mx-auto">
              <form onSubmit={handleSupportSubmit} className="flex flex-col items-center text-center space-y-4 w-full">
                <h4 className="text-white font-bold text-2xl mb-1">Contacto Kuota</h4>
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
                    className="w-full bg-black/20 border border-slate-800 rounded-xl p-4 text-white placeholder:text-white/40 text-sm min-h-[120px] resize-none focus:outline-none focus:border-blue-500/50"
                  />
                  {supportSuccessMsg && (
                    <div className="w-full bg-green-500/20 border border-green-500/50 text-green-200 text-sm rounded-xl p-3 text-center animate-in fade-in zoom-in-95">
                      {supportSuccessMsg}
                    </div>
                  )}
                  {supportErrorMsg && (
                    <div className="w-full bg-red-500/20 border border-red-500/50 text-red-200 text-sm rounded-xl p-3 text-center animate-in fade-in zoom-in-95">
                      {supportErrorMsg}
                    </div>
                  )}
                  <button 
                    type="submit"
                    disabled={isSendingSupport}
                    className="mx-auto bg-slate-100 text-slate-900 hover:bg-white disabled:bg-slate-800 disabled:text-slate-500 px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 justify-center"
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
          <div className="relative bg-kbg border border-slate-800 rounded-3xl w-full max-w-2xl shadow-lg flex flex-col max-h-full overflow-hidden">
            <div className="bg-kcard/5 border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
              <h3 className="text-slate-100 text-lg font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-400" /> Tu Recibo
              </h3>

              <div className="flex items-center gap-2 bg-kcard/50 border border-slate-700 px-3 py-1.5 rounded-full ml-auto mr-4">
                <button onClick={() => changeMonth(-1)} className="p-1 rounded-full hover:bg-slate-700 transition-all">
                  <ChevronLeft className="w-4 h-4 text-slate-300" />
                </button>
                <span className="text-slate-300 font-medium text-sm capitalize w-28 text-center truncate">
                  {formatMonth(selectedMonth).replace(' (Mes actual)', '')}
                </span>
                <button onClick={() => changeMonth(1)} disabled={isNextMonthDisabled} className="p-1 rounded-full hover:bg-slate-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </button>
              </div>

              <button onClick={() => setIsReceiptModalOpen(false)} className="p-1 rounded-full hover:bg-slate-800 transition-colors">
                <X className="w-5 h-5 text-slate-400 hover:text-slate-200" />
              </button>
            </div>
            
            <div 
              id="recibo-pdf" 
              className="theme-fixed p-8 font-sans w-full max-w-2xl mx-auto overflow-y-auto custom-scrollbar" 
              style={{ backgroundColor: '#ffffff', color: '#1f2937' }}
            >
              <div className="text-center" style={{ marginBottom: '24px' }}>
                <h2 className="text-2xl font-bold uppercase tracking-wider" style={{ color: '#000000' }}>Aviso de Cobro</h2>
                <p className="text-sm" style={{ color: '#4b5563' }}>Condominio {config.descripcion || userData.codigo_edificio}</p>
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
                         <th className="text-right" style={{ padding: '8px 0' }}>Monto ({moneda})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((e, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '8px 0', color: '#374151' }}>{e.concept}</td>
                          <td className="text-right font-medium" style={{ padding: '8px 0', color: '#000000' }}>{fmt(e.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold" style={{ backgroundColor: '#f9fafb', color: '#000000' }}>
                        <td style={{ padding: '8px', borderRadius: '8px 0 0 8px' }}>Total del Edificio</td>
                        <td className="text-right" style={{ padding: '8px', borderRadius: '0 8px 8px 0' }}>{fmt(totalBuildingExpense)}</td>
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
                <div className="flex justify-between text-sm" style={{ color: '#374151', marginBottom: '6px' }}>
                  <span>Cuota de gastos comunes:</span>
                  <span className="font-medium">{fmt(desglose.alicuota)}</span>
                </div>
                {desglose.fondo > 0 && (
                  <div className="flex justify-between text-sm" style={{ color: '#374151', marginBottom: '6px' }}>
                    <span>Reposición del fondo de reserva:</span>
                    <span className="font-medium">{fmt(desglose.fondo)}</span>
                  </div>
                )}
                {ajustesRecibo.map((a) => (
                  <div key={a.id} className="flex justify-between text-sm" style={{ color: a.tipo === 'credito' ? '#047857' : '#9a3412', marginBottom: '6px' }}>
                    <span>{a.tipo === 'credito' ? 'Devolución' : 'Cargo'}: {a.concepto}</span>
                    <span className="font-medium">{a.tipo === 'credito' ? '− ' : '+ '}{fmt(Number(a.monto))}</span>
                  </div>
                ))}
                {ajustesRecibo.length === 0 && desglose.cargos > 0 && (
                  <div className="flex justify-between text-sm" style={{ color: '#9a3412', marginBottom: '6px' }}>
                    <span>Cargos extra:</span>
                    <span className="font-medium">+ {fmt(desglose.cargos)}</span>
                  </div>
                )}
                {ajustesRecibo.length === 0 && desglose.creditos > 0 && (
                  <div className="flex justify-between text-sm" style={{ color: '#047857', marginBottom: '6px' }}>
                    <span>Devoluciones:</span>
                    <span className="font-medium">− {fmt(desglose.creditos)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xl" style={{ borderTop: '1px solid #93c5fd', paddingTop: '12px', marginTop: '8px', color: '#1e3a8a' }}>
                  <span>Total a Pagar ({moneda}){desglose.emitido ? '' : ' estimado'}:</span>
                  <span>{fmt(monthTotal)}</span>
                </div>
                <div className="flex justify-between text-sm mt-2" style={{ color: '#4b5563', marginTop: '8px' }}>
                  <span>Equivalente en Bs (Tasa BCV {moneda}{bcvRate > 0 ? ` ${bcvRate.toLocaleString('es-VE', { minimumFractionDigits: 2 })}` : ''}):</span>
                  <span className="font-medium">{fmtBs(monthTotal)}</span>
                </div>
              </div>
              <p className="text-center text-xs" style={{ color: '#9ca3af', marginTop: '32px' }}>
                Este es un documento generado automáticamente por el sistema Kuota.
              </p>
            </div>

            <div className="p-4 border-t border-slate-700 bg-kbg flex justify-end shrink-0">
              <button 
                onClick={descargarReciboPDF} 
                disabled={isGeneratingPDF}
                className={`font-medium py-2.5 px-6 rounded-xl shadow-md transition-colors flex items-center gap-2 ${isGeneratingPDF ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-slate-100 text-slate-900 hover:bg-white'}`}
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
          <div className="relative bg-kbg rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-700">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-4 flex items-center justify-between shrink-0">
              <h3 className="text-white text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5" /> Comprobante de Pago
              </h3>
              <button onClick={() => setSelectedPaymentProof(null)} className="p-1 rounded-full hover:bg-kcard/20 transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex items-center justify-center bg-black/50 h-full">
              <img src={selectedPaymentProof} alt="Comprobante" className="max-w-full max-h-[70vh] rounded-lg shadow-lg object-contain" />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'perfil' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <UserProfile userData={userData} onBack={() => setActiveTab('inicio')} highlight={highlightProfile} />
        </div>
      )}


      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none px-4 pb-6">
        <div className="max-w-md mx-auto pointer-events-auto">
          <div className="bg-kcard/95 backdrop-blur-xl rounded-3xl shadow-lg border border-slate-700/50 px-6 py-4">
            <div className="grid grid-cols-3 gap-4">
              {['inicio', 'finanzas', 'comunidad'].map((tab) => (
                <button
                  key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex flex-col items-center gap-2 py-3 px-4 rounded-2xl transition-all ${activeTab === tab ? 'bg-slate-100 text-slate-900 hover:bg-white shadow-md scale-105' : 'hover:bg-slate-800/50 text-slate-400'}`}
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
