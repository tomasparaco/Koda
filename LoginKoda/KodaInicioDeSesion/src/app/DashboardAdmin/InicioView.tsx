import { useState, useEffect } from 'react';
import { AlertCircle, Wrench, DollarSign, TrendingUp, Bell, Users, Vote, FileEdit, UserPlus, Upload, FileText, Mail, ArrowLeft, Filter, CheckCircle, Plus, X, MessageSquare, Calendar, Image as ImageIcon, Send } from 'lucide-react';
import type { Propietario } from '../../types';
import { ComunidadService } from '../../services/comunidad.service';
import { GastoService } from '../../services/gasto.service';
import { PagoService } from '../../services/pago.service';
import { ReciboService } from '../../services/recibo.service';
import { NotificacionService } from '../../services/notificacion.service';
import { useMoneda } from '../moneda/MonedaContext';
import { EmisionRecibosModal } from './EmisionRecibosModal';
import { supabase } from '../../lib/supabase';
import { EncuestaService } from '../../services/encuesta.service';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';

interface InicioViewProps {
  propiedad: Propietario;
  onNavigateToConciliacion?: () => void;
  onNavigateToTickets?: () => void;
  onNavigateToVotaciones?: () => void; // <--- NUEVA PROPIEDAD
  onNavigateToCrearComunicado?: () => void;
  onNavigateToAgendarEvento?: () => void;
}

export function InicioView({ propiedad, onNavigateToConciliacion, onNavigateToTickets, onNavigateToVotaciones, onNavigateToCrearComunicado, onNavigateToAgendarEvento }: InicioViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [topMorosos, setTopMorosos] = useState<any[]>([]);
  
  const [todosMorosos, setTodosMorosos] = useState<any[]>([]);
  const [viewState, setViewState] = useState<'dashboard' | 'morosos'>('dashboard');
  const [filterMinDebt, setFilterMinDebt] = useState<number>(0);
  const [filterMinMonths, setFilterMinMonths] = useState<number>(0);
  const [sendingEmails, setSendingEmails] = useState<Record<number, boolean>>({});
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // Survey creation state
  const [showEncuestaModal, setShowEncuestaModal] = useState(false);
  const [encuestaPregunta, setEncuestaPregunta] = useState('');
  const [encuestaOpciones, setEncuestaOpciones] = useState(['Sí', 'No', 'Abstención']);
  const [encuestaFechaCierre, setEncuestaFechaCierre] = useState('');
  const [encuestaArchivo, setEncuestaArchivo] = useState<File | null>(null);
  const [encuestaArchivoPreview, setEncuestaArchivoPreview] = useState<string | null>(null);
  const [isCreandoEncuesta, setIsCreandoEncuesta] = useState(false);
  const [codigoEdificio, setCodigoEdificio] = useState<string>(propiedad.codigo_edificio || '');
  const [showSelectorModal, setShowSelectorModal] = useState(false);

  // ── ESTADOS PARA COMUNICADOS (Inicio)
  const [isComModalOpen, setIsComModalOpen] = useState(false);
  const [comTitulo, setComTitulo] = useState('');
  const [comCuerpo, setComCuerpo] = useState('');
  const [comCategoria, setComCategoria] = useState<'Mantenimiento' | 'Informativo' | 'Urgente'>('Informativo');
  const [comImagen, setComImagen] = useState<File | null>(null);
  const [isSubmittingCom, setIsSubmittingCom] = useState(false);
  const [comNotificar, setComNotificar] = useState(false);

  // ── ESTADOS PARA EVENTOS (Inicio)
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({
    titulo: '',
    descripcion: '',
    fecha: '',
    fecha_fin: '',
    hora_inicio: '',
    hora_fin: '',
    tipo: 'Asamblea' as 'Asamblea' | 'Mantenimiento' | 'Social',
    notificar_ahora: false
  });

  const handlePublicarComunicado = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCom(true);
    try {
      const response = await ComunidadService.crearComunicado({
        codigo_edificio: propiedad.codigo_edificio,
        titulo: comTitulo,
        cuerpo: comCuerpo,
        categoria: comCategoria
      }, comImagen);
      if (!response.exito) throw new Error(response.mensaje);

      setNotification({ message: '¡Comunicado publicado con éxito!', type: 'success' });
      setTimeout(() => setNotification(null), 4000);
      setIsComModalOpen(false);

      await NotificacionService.crear({
        codigo_edificio: propiedad.codigo_edificio,
        tipo: 'comunicado',
        titulo: 'Nuevo Comunicado',
        mensaje: `"${comTitulo}" — ${comCategoria}`,
        destinatario: 'usuarios',
        enviar_correo: comNotificar,
      });

      setComTitulo('');
      setComCuerpo('');
      setComCategoria('Informativo');
      setComImagen(null);
    } catch (error: any) {
      setNotification({ message: error.message || 'Ocurrió un error al publicar.', type: 'error' });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setIsSubmittingCom(false);
    }
  };

  const handleGuardarEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingEvent(true);
    try {
      const response = await ComunidadService.crearEvento({
        ...newEvent,
        codigo_edificio: propiedad.codigo_edificio
      });

      if (response.exito) {
        setNotification({ message: '¡Evento agendado con éxito!', type: 'success' });
        setTimeout(() => setNotification(null), 4000);
        setIsEventModalOpen(false);

        await NotificacionService.crear({
          codigo_edificio: propiedad.codigo_edificio,
          tipo: 'evento',
          titulo: 'Nuevo Evento',
          mensaje: `"${newEvent.titulo}" — ${newEvent.fecha}`,
          destinatario: 'usuarios',
          enviar_correo: newEvent.notificar_ahora,
        });

        setNewEvent({ 
          titulo: '', descripcion: '', fecha: '', fecha_fin: '', 
          hora_inicio: '', hora_fin: '', tipo: 'Asamblea', 
          notificar_ahora: false 
        });
      } else {
        setNotification({ message: response.mensaje || 'Error al agendar', type: 'error' });
        setTimeout(() => setNotification(null), 4000);
      }
    } catch (error) {
      setNotification({ message: 'Error de conexión', type: 'error' });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setIsSubmittingEvent(false);
    }
  };


  const handleEncuestaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setEncuestaArchivo(file);
      setEncuestaArchivoPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : 'pdf');
    }
  };

  const handleCrearEncuesta = async () => {
    if (!encuestaPregunta || !encuestaFechaCierre || !codigoEdificio) {
      setNotification({ message: 'Completa los campos obligatorios.', type: 'error' });
      setTimeout(() => setNotification(null), 4000);
      return;
    }
    if (new Date(encuestaFechaCierre) <= new Date()) {
      setNotification({ message: 'La fecha de cierre debe ser en el futuro.', type: 'error' });
      setTimeout(() => setNotification(null), 4000);
      return;
    }
    setIsCreandoEncuesta(true);
    const res = await EncuestaService.crearEncuesta(codigoEdificio, encuestaPregunta, encuestaOpciones, encuestaFechaCierre, encuestaArchivo);
    setIsCreandoEncuesta(false);
    if (res.exito) {
      setShowEncuestaModal(false);
      setEncuestaPregunta('');
      setEncuestaOpciones(['Sí', 'No', 'Abstención']);
      setEncuestaFechaCierre('');
      setEncuestaArchivo(null);
      setEncuestaArchivoPreview(null);
      setNotification({ message: '¡Encuesta publicada exitosamente!', type: 'success' });
    } else {
      setNotification({ message: 'Error: ' + res.mensaje, type: 'error' });
    }
    setTimeout(() => setNotification(null), 5000);
  };

  const [recaudacion, setRecaudacion] = useState({
    mes: 'Cargando...',
    meta: 0,
    actual: 0,
    porcentaje: 0
  });

  const { fmt, moneda, tasa: bcvRate, tasaFecha: bcvDate, cargandoTasa: isLoadingBcv, config } = useMoneda();

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!propiedad.codigo_edificio) return;
      const { exito: exitoCount, count } = await PagoService.getPagosPendientesCountAdmin(propiedad.codigo_edificio);
      if (exitoCount) {
        setPendingCount(count);
      }

      const { exito: exitoMorosos, data: morososData } = await PagoService.getTopMorosos(propiedad.codigo_edificio);
      if (exitoMorosos && morososData) {
        setTopMorosos(morososData);
      }

      const { exito: exitoTodosMorosos, data: todosMorososData } = await PagoService.getTodosLosMorosos(propiedad.codigo_edificio);
      if (exitoTodosMorosos && todosMorososData) {
          setTodosMorosos(todosMorososData);
      }

      // Recaudación real del mes
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const monthName = now.toLocaleDateString('es-ES', { month: 'long' });

      const gastosData = await GastoService.getGastos(propiedad.codigo_edificio);
      let metaRecaudacion = 0;
      if (Array.isArray(gastosData)) {
        const gastosMes = gastosData.filter(g => {
          const d = new Date(g.fecha_gasto);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
        const totalGastos = gastosMes.reduce((acc, g) => acc + Number(g.monto), 0);
        // La meta incluye lo que falta para reponer el fondo de reserva
        metaRecaudacion = totalGastos + Math.max(0, config.fondo_reserva_meta - config.fondo_reserva_saldo);
      }

      const { exito: exitoPagos, data: pagosData } = await PagoService.getTodosLosPagosAdmin(propiedad.codigo_edificio);
      let montoRecaudado = 0;
      if (exitoPagos && pagosData) {
        const pagosMes = pagosData.filter(p => {
          const d = new Date(p.fecha_pago);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear && p.estado === 'aprobado';
        });
        montoRecaudado = pagosMes.reduce((acc, p) => acc + Number(p.monto), 0);
      }

      let pct = 0;
      if (metaRecaudacion > 0) {
        pct = Math.round((montoRecaudado / metaRecaudacion) * 100);
      } else if (montoRecaudado > 0) {
        pct = 100;
      }

      setRecaudacion({
        mes: monthName,
        meta: metaRecaudacion,
        actual: montoRecaudado,
        porcentaje: Math.min(pct, 100) 
      });
    };
    fetchDashboardData();
  }, [propiedad.codigo_edificio, config.fondo_reserva_meta, config.fondo_reserva_saldo]);

  const [showEmisionModal, setShowEmisionModal] = useState(false);
  const abrirModalEmision = () => setShowEmisionModal(true);

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha_gasto, setFechaGasto] = useState('');
  const [categoria, setCategoria] = useState('');
  const [factura, setFactura] = useState<File | null>(null);
  const [facturaPreview, setFacturaPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFactura(selectedFile);
      if (selectedFile.type.startsWith('image/')) {
        setFacturaPreview(URL.createObjectURL(selectedFile));
      } else {
        setFacturaPreview('pdf');
      }
    }
  };

  const removeFile = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setFactura(null);
    if (facturaPreview && facturaPreview !== 'pdf') {
      URL.revokeObjectURL(facturaPreview);
    }
    setFacturaPreview(null);
  };

  const resetForm = () => {
    setTitulo('');
    setDescripcion('');
    setMonto('');
    setFechaGasto('');
    setCategoria('');
    removeFile();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoria) {
      alert('Por favor, selecciona una categoría.');
      return;
    }
    setIsLoading(true);
    let factura_url: string | undefined = undefined;

    if (factura) {
      const fileName = `${propiedad.codigo_edificio}/${Date.now()}_${factura.name}`;
      const { error: uploadError } = await supabase.storage
        .from('facturas')
        .upload(fileName, factura);

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        alert(`Error detallado al subir: ${uploadError.message}`);
        setIsLoading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from('facturas').getPublicUrl(fileName);
      factura_url = publicUrlData.publicUrl;
    }

    const result = await GastoService.addGasto({
      titulo,
      descripcion,
      monto: parseFloat(monto),
      fecha_gasto,
      categoria,
      factura_url,
      codigo_edificio: propiedad.codigo_edificio,
      pagado_al_proveedor: false, 
    });

    if (result.exito) {
      alert(result.mensaje);
      setShowAddExpenseModal(false);
      resetForm();
    } else {
      alert(result.mensaje);
    }
    setIsLoading(false);
  };

  const handleSendReminder = async (moroso: any, idx: number) => {
    setSendingEmails(prev => ({ ...prev, [idx]: true }));
    try {
      // Se envía como notificación de Kuota al apartamento: aparece en su panel
      // y la función de avisos la reenvía a su correo.
      await NotificacionService.crear({
        codigo_edificio: propiedad.codigo_edificio,
        tipo: 'cobro',
        titulo: 'Recordatorio de saldo pendiente',
        mensaje: `Hola ${moroso.nombre}, te recordamos que tienes un saldo pendiente de ${fmt(Number(moroso.deuda))}. Agradecemos que puedas ponerte al día lo antes posible.`,
        destinatario: moroso.apartamento,
      });
      setNotification({ message: `¡Recordatorio enviado a ${moroso.nombre}!`, type: 'success' });
    } catch (e) {
      console.error(e);
      setNotification({ message: 'No se pudo enviar el recordatorio.', type: 'error' });
    } finally {
      setSendingEmails(prev => ({ ...prev, [idx]: false }));
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const filteredMorosos = todosMorosos.filter(moroso => {
       const deuda = Number(moroso.deuda);
       const mesesEstimados = moroso.meses_adeudados || 0;
       
       if (filterMinDebt > 0 && deuda < filterMinDebt) return false;
       if (filterMinMonths > 0 && mesesEstimados < filterMinMonths) return false;
       
       return true;
  });

  return (
    <>
      {viewState === 'dashboard' && (
      <div className="w-full">
        <section className="mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
          <AlertCircle className="w-5 h-5" />
          Alertas Urgentes
        </h2>
        <div className="space-y-3">
          <button
            onClick={onNavigateToConciliacion}
            className="w-full bg-kcard/10 backdrop-blur-md border border-slate-700 rounded-2xl p-4 hover:bg-kcard/15 transition-all text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-red-500 p-3 rounded-full">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Pagos por Conciliar</h3>
                  <p className="text-sm text-slate-400">Requiere aprobación</p>
                </div>
              </div>
              <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                {pendingCount} Pendiente{pendingCount !== 1 ? 's' : ''}
              </div>
            </div>
          </button>

          <button 
            onClick={onNavigateToTickets}
            className="w-full bg-kcard/10 backdrop-blur-md border border-slate-700 rounded-2xl p-4 hover:bg-kcard/15 transition-all text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-orange-500 p-3 rounded-full">
                  <Wrench className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Tickets Abiertos</h3>
                  <p className="text-sm text-slate-400">Reportes de fallas</p>
                </div>
              </div>
              <div className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                Ver Todos
              </div>
            </div>
          </button>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
          <TrendingUp className="w-5 h-5" />
          Pulso Financiero
        </h2>
        <div className="bg-kcard/10 backdrop-blur-md border border-slate-700 rounded-2xl p-5">
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold capitalize">Recaudación de {recaudacion.mes}</span>
              <span className="text-2xl font-bold">{recaudacion.porcentaje}%</span>
            </div>
            <div className="w-full bg-kcard/20 rounded-full h-3 overflow-hidden">
              <div
                className="bg-green-400 h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${recaudacion.porcentaje}%` }}
              ></div>
            </div>
            <p className="text-sm text-slate-400 mt-2">
              {fmt(recaudacion.actual)} de {fmt(recaudacion.meta)} recaudados
              {recaudacion.meta === 0 && ' (No hay gastos registrados este mes)'}
            </p>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-slate-400">Tasa BCV ({moneda === 'EUR' ? 'Euro' : 'Dólar'}) · se cobra en {moneda}</p>
                <p className="text-2xl font-bold">{bcvRate > 0 ? `Bs. ${bcvRate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'No disponible'}</p>
                <p className="text-[10px] text-white/50 mt-1">{isLoadingBcv ? 'Consultando BCV...' : `Última actualización: ${bcvDate}`}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
          <Bell className="w-5 h-5" />
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={abrirModalEmision} className="bg-kcard/10 backdrop-blur-md border border-slate-700 rounded-2xl p-4 hover:bg-kcard/20 transition-all duration-300 group hover:-translate-y-1 hover:shadow-md hover:shadow-green-500/10">
            <div className="bg-green-500 p-3 rounded-full w-fit mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-sm text-center text-white/90 group-hover:text-white transition-colors">Generar Cobro Mensual</h3>
          </button>

          <button onClick={() => setShowSelectorModal(true)} className="bg-kcard/10 backdrop-blur-md border border-slate-700 rounded-2xl p-4 hover:bg-kcard/20 transition-all duration-300 flex flex-col items-center justify-center group hover:-translate-y-1 hover:shadow-md hover:shadow-blue-500/10">
            <div className="bg-slate-600 p-3 rounded-full mb-3 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-sm text-center text-white/90 group-hover:text-white transition-colors">Crear Comunicado<br/>/ Agendar Evento</h3>
          </button>

          <button
            onClick={() => setShowEncuestaModal(true)}
            className="bg-kcard/10 backdrop-blur-md border border-slate-700 rounded-2xl p-4 hover:bg-kcard/20 transition-all duration-300 group hover:-translate-y-1 hover:shadow-md hover:shadow-purple-500/10"
          >
            <div className="bg-purple-500 p-3 rounded-full w-fit mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
              <Vote className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-sm text-center text-white/90 group-hover:text-white transition-colors">Crear Encuesta</h3>
          </button>

          {/* MODAL SELECTOR COMUNICADO / EVENTO */}
          {showSelectorModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center py-8">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSelectorModal(false)} />
              <div className="relative bg-kbg border border-slate-800 rounded-3xl w-full max-w-sm shadow-lg overflow-hidden animate-in zoom-in duration-200 p-6 flex flex-col items-center gap-4 m-4">
                <div className="w-full flex justify-between items-center mb-2">
                  <h3 className="text-white text-lg font-bold">¿Qué deseas hacer?</h3>
                  <button onClick={() => setShowSelectorModal(false)} className="p-1 rounded-full hover:bg-kcard/20 transition-colors">
                    <X className="w-5 h-5 text-white/50 hover:text-white" />
                  </button>
                </div>
                
                <button
                  onClick={() => { setShowSelectorModal(false); setIsComModalOpen(true); }}
                  className="w-full bg-slate-100 text-slate-900 hover:bg-white rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all shadow-md group"
                >
                  <MessageSquare className="w-8 h-8 group-hover:scale-110 transition-transform" />
                  <span className="font-bold">Nuevo Comunicado</span>
                </button>
                
                <button
                  onClick={() => { setShowSelectorModal(false); setIsEventModalOpen(true); }}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 group"
                >
                  <Calendar className="w-8 h-8 group-hover:scale-110 transition-transform" />
                  <span className="font-bold">Agendar Evento</span>
                </button>
              </div>
            </div>
          )}

          {/* MODAL DE CREACIÓN DE ENCUESTA */}
          {showEncuestaModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEncuestaModal(false)} />
              <div className="relative bg-gray-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-lg flex flex-col max-h-[90vh] overflow-hidden">
                <div className="bg-gradient-to-r from-purple-700 to-purple-900 px-6 py-4 flex items-center justify-between shrink-0">
                  <h3 className="text-white text-lg font-bold flex items-center gap-2">
                    <Vote className="w-5 h-5" /> Crear Nueva Encuesta
                  </h3>
                  <button onClick={() => setShowEncuestaModal(false)} className="p-1 rounded-full hover:bg-kcard/20 transition-colors">
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
                <div className="p-6 overflow-y-auto flex-1 space-y-5">
                  <div>
                    <Label className="text-white/80">Pregunta o Tema a Votar *</Label>
                    <Input
                      value={encuestaPregunta}
                      onChange={e => setEncuestaPregunta(e.target.value)}
                      placeholder="Ej. ¿Aprobar el presupuesto de pintura?"
                      className="bg-kcard/5 border-slate-800 text-white mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <Label className="text-white/80">Opciones de Respuesta</Label>
                      <div className="space-y-2 mt-1">
                        {encuestaOpciones.map((op, idx) => (
                          <Input
                            key={idx}
                            value={op}
                            onChange={e => {
                              const nuevas = [...encuestaOpciones];
                              nuevas[idx] = e.target.value;
                              setEncuestaOpciones(nuevas);
                            }}
                            className="bg-kcard/5 border-slate-800 text-white"
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-white/80">Fecha límite de cierre *</Label>
                      <Input
                        type="datetime-local"
                        value={encuestaFechaCierre}
                        onChange={e => setEncuestaFechaCierre(e.target.value)}
                        className="bg-kcard/5 border-slate-800 text-white mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-white/80 block mb-2">Documento Soporte (Opcional)</Label>
                    {!encuestaArchivo ? (
                      <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-slate-700 border-dashed rounded-xl bg-kcard/5 hover:bg-kcard/10 transition-colors">
                        <div className="space-y-1 text-center">
                          <Upload className="mx-auto h-8 w-8 text-white/50 mb-3" />
                          <Label htmlFor="enc-file" className="cursor-pointer text-slate-400 hover:text-slate-400 text-sm font-medium">
                            <span>Añadir archivo</span>
                            <input id="enc-file" type="file" className="sr-only" onChange={handleEncuestaFileChange} accept=".pdf,image/*" />
                          </Label>
                          <p className="text-xs text-white/40 mt-1">PDF o Imágenes</p>
                        </div>
                      </div>
                    ) : (
                      <div className="relative w-full h-24 border border-slate-700 rounded-xl overflow-hidden bg-black/40 flex items-center justify-center group">
                        {encuestaArchivoPreview === 'pdf' ? (
                          <div className="flex flex-col items-center text-white">
                            <FileText className="w-8 h-8 text-red-400 mb-1" />
                            <span className="text-sm">{encuestaArchivo.name}</span>
                          </div>
                        ) : (
                          <img src={encuestaArchivoPreview!} alt="Preview" className="w-full h-full object-contain" />
                        )}
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button onClick={() => { setEncuestaArchivo(null); setEncuestaArchivoPreview(null); }} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm">Eliminar</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="border-t border-slate-800 p-4 flex gap-3 shrink-0">
                  <button onClick={() => setShowEncuestaModal(false)} className="flex-1 bg-kcard/5 hover:bg-kcard/10 text-white py-3 rounded-xl font-medium border border-slate-800 transition-colors">
                    Cancelar
                  </button>
                  <button onClick={handleCrearEncuesta} disabled={isCreandoEncuesta} className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white py-3 rounded-xl font-bold transition-colors">
                    {isCreandoEncuesta ? 'Publicando...' : 'Publicar Encuesta'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowAddExpenseModal(true)}
            className="bg-kcard/10 backdrop-blur-md border border-slate-700 rounded-2xl p-4 hover:bg-kcard/20 transition-all duration-300 group hover:-translate-y-1 hover:shadow-md hover:shadow-red-500/10"
          >
            <div className="bg-red-500 p-3 rounded-full w-fit mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
              <FileEdit className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-sm text-center text-white/90 group-hover:text-white transition-colors">Registrar Gasto</h3>
          </button>

          {/* MODAL REGISTRAR GASTO */}
          {showAddExpenseModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isLoading && setShowAddExpenseModal(false)} />
              <div className="relative bg-gray-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-lg flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 fade-in duration-200">
                <div className="bg-gradient-to-r from-red-700 to-red-900 px-6 py-4 flex items-center justify-between shrink-0">
                  <h3 className="text-white text-lg font-bold flex items-center gap-2">
                    <FileEdit className="w-5 h-5" /> Registrar un Gasto
                  </h3>
                  <button onClick={() => !isLoading && setShowAddExpenseModal(false)} className="p-1 rounded-full hover:bg-kcard/20 transition-colors">
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="titulo" className="text-red-200">Título del Gasto</Label>
                      <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} required className="bg-kcard/5 border-slate-700 rounded-lg mt-1 text-white" />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="descripcion" className="text-red-200">Descripción Detallada</Label>
                      <Textarea id="descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required className="bg-kcard/5 border-slate-700 rounded-lg mt-1 min-h-[80px] text-white" />
                    </div>
                    <div>
                      <Label htmlFor="monto" className="text-red-200">Monto ($)</Label>
                      <Input id="monto" type="number" value={monto} onChange={(e) => setMonto(e.target.value)} required className="bg-kcard/5 border-slate-700 rounded-lg mt-1 text-white" />
                    </div>
                    <div>
                      <Label htmlFor="fecha_gasto" className="text-red-200">Fecha</Label>
                      <Input id="fecha_gasto" type="date" value={fecha_gasto} onChange={(e) => setFechaGasto(e.target.value)} required className="bg-kcard/5 border-slate-700 rounded-lg mt-1 text-white" />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="categoria" className="text-red-200">Categoría</Label>
                      <Select onValueChange={setCategoria} value={categoria}>
                        <SelectTrigger className="bg-kcard/5 border-slate-700 rounded-lg mt-1 text-white">
                          <SelectValue placeholder="Seleccione una categoría" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 text-white border-gray-700">
                          <SelectItem value="Servicios">Servicios</SelectItem>
                          <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                          <SelectItem value="Extraordinario">Extraordinario</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="factura" className="text-red-200">Adjuntar Factura (Opcional)</Label>
                      {!factura ? (
                        <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-700 border-dashed rounded-xl bg-kcard/5 hover:bg-kcard/10 transition-colors">
                          <div className="space-y-1 text-center">
                            <Upload className="mx-auto h-8 w-8 text-white/50 mb-2" />
                            <Label htmlFor="file-upload" className="cursor-pointer text-red-400 hover:text-red-300 text-sm font-medium">
                              <span>Subir un archivo</span>
                              <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*,.pdf" onChange={handleFileChange} />
                            </Label>
                            <p className="text-xs text-white/50 mt-1">PNG, JPG, PDF hasta 10MB</p>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 relative w-full h-32 border border-slate-700 rounded-xl overflow-hidden bg-black/40 flex items-center justify-center group">
                          {facturaPreview === 'pdf' ? (
                            <div className="flex flex-col items-center text-white/70">
                              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center mb-2">
                                <span className="text-red-400 font-bold text-xs">PDF</span>
                              </div>
                              <span className="text-sm font-medium">{factura.name}</span>
                            </div>
                          ) : (
                            <img src={facturaPreview!} alt="Vista previa de la factura" className="w-full h-full object-contain" />
                          )}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                            <button type="button" onClick={removeFile} className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">
                              Quitar archivo
                            </button>
                            <label className="bg-kcard/20 hover:bg-kcard/30 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer backdrop-blur-sm">
                              Cambiar
                              <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-slate-800 pt-4 flex gap-3">
                    <button type="button" onClick={() => setShowAddExpenseModal(false)} className="flex-1 bg-kcard/5 hover:bg-kcard/10 text-white py-3 rounded-xl font-medium border border-slate-800 transition-colors">
                      Cancelar
                    </button>
                    <button type="submit" disabled={isLoading} className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white py-3 rounded-xl font-bold transition-colors">
                      {isLoading ? 'Guardando...' : 'Guardar Gasto'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
          <Users className="w-5 h-5" />
          Gestión de Usuarios
        </h2>


        <div className="bg-kcard/10 backdrop-blur-md border border-slate-700 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              Morosos Top
            </h3>
          </div>
          <div className="space-y-2">
            {topMorosos.length > 0 ? (
              topMorosos.map((moroso, index) => (
                <div key={index} className={`flex justify-between items-center py-2 ${index < topMorosos.length - 1 ? 'border-b border-slate-800' : ''}`}>
                  <span className="text-sm truncate mr-2">Apto {moroso.apartamento} - {moroso.nombre.split(' ')[0]}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-orange-300 text-xs bg-orange-500/20 px-2 py-0.5 rounded border border-orange-500/20">
                      {moroso.meses_adeudados || 0} Mes{(moroso.meses_adeudados || 0) !== 1 ? 'es' : ''}
                    </span>
                    <span className="text-red-400 font-bold">{fmt(Number(moroso.deuda))}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-green-400 text-center py-2">No hay morosos registrados ¡Excelente!</div>
            )}
          </div>
          {topMorosos.length > 0 && (
             <button
               onClick={() => setViewState('morosos')}
               className="w-full mt-4 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
             >
               <FileText className="w-4 h-4" /> Ver Reporte Completo
             </button>
          )}
        </div>
      </section>

      <EmisionRecibosModal
        isOpen={showEmisionModal}
        codigoEdificio={propiedad.codigo_edificio}
        onClose={() => setShowEmisionModal(false)}
      />

      </div>
      )}

      {viewState === 'morosos' && (
        <div className="absolute inset-0 bg-kbg z-50 overflow-y-auto custom-scrollbar">
          {/* Header */}
          <div className="sticky top-0 z-40 bg-kcard/80 backdrop-blur-md border-b border-slate-800 px-6 py-5 flex items-center gap-4 shadow-sm">
            <button 
              onClick={() => setViewState('dashboard')}
              className="p-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-full transition-colors backdrop-blur-sm"
            >
              <ArrowLeft className="w-5 h-5 text-slate-300" />
            </button>
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-red-500" /> Reporte de Cuentas por Cobrar
              </h3>
              <p className="text-slate-400 text-sm mt-1">
                Gestión y seguimiento de todos los dueños con saldos deudores
              </p>
            </div>
          </div>
          
          <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
            
            {/* Filtros */}
            <div className="bg-kcard/10 backdrop-blur-md border border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <Label className="text-slate-400 mb-2 block flex items-center gap-2"><Filter className="w-4 h-4"/> Deuda Mínima ($)</Label>
                <Input 
                  type="number" 
                  min="0"
                  value={filterMinDebt || ''} 
                  onChange={(e) => setFilterMinDebt(Number(e.target.value))} 
                  placeholder="Ej: 50"
                  className="bg-black/30 border-slate-700 text-white rounded-xl placeholder:text-white/30"
                />
              </div>
              <div className="flex-1 w-full">
                <Label className="text-slate-400 mb-2 block flex items-center gap-2"><Filter className="w-4 h-4"/> Meses Acumulados</Label>
                <Input 
                  type="number" 
                  min="0"
                  value={filterMinMonths || ''} 
                  onChange={(e) => setFilterMinMonths(Number(e.target.value))} 
                  placeholder="Ej: 2"
                  className="bg-black/30 border-slate-700 text-white rounded-xl placeholder:text-white/30"
                />
              </div>
              <button 
                onClick={() => { setFilterMinDebt(0); setFilterMinMonths(0); }}
                className="bg-kcard/10 hover:bg-kcard/20 text-white border border-slate-800 px-6 py-2.5 rounded-xl font-medium transition-colors w-full md:w-auto h-[42px]"
              >
                Limpiar
              </button>
            </div>
            {/* Grid de tarjetas de morosos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMorosos.length > 0 ? (
                filteredMorosos.map((moroso, idx) => {
                  const deudaObj = Number(moroso.deuda);
                  const mesesDeuda = moroso.meses_adeudados || 0;
                  const isLoadingM = sendingEmails[idx];
                  return (
                    <div key={idx} className="bg-kcard/5 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between gap-4 hover:bg-kcard/10 transition-colors shadow-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="bg-slate-500/20 text-slate-400 font-bold px-3 py-1.5 rounded-lg text-xs border border-blue-500/20 shadow-inner">
                              Unidad {moroso.apartamento}
                            </span>
                            <span className="bg-orange-500/20 text-orange-300 font-bold px-3 py-1.5 rounded-lg text-xs border border-orange-500/20">
                              ~{mesesDeuda} Mes{mesesDeuda !== 1 ? 'es' : ''}
                            </span>
                          </div>
                          <h4 className="font-bold text-white text-xl">{moroso.nombre}</h4>
                          <p className="text-white/60 text-sm mt-1 flex items-center gap-2">
                            <Mail className="w-4 h-4" /> {moroso.correo || 'Sin correo registrado'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-white/50 text-[10px] uppercase font-bold tracking-wider block mb-1">Total Monto</span>
                          <span className="text-red-400 font-bold text-2xl">{fmt(deudaObj)}</span>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleSendReminder(moroso, idx)}
                        disabled={isLoadingM}
                        className="mt-2 w-full bg-kcard hover:bg-slate-700 text-white border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
                      >
                        {isLoadingM ? 'Enviando Aviso...' : <><Mail className="w-4 h-4" /> Enviar Aviso de Cobro</>}
                      </button>
                    </div>
                  );
                })
              ) : (
                  <div className="col-span-1 md:col-span-2 text-center py-16 bg-kcard/5 border border-slate-800 rounded-3xl">
                    <div className="bg-green-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                      <TrendingUp className="w-10 h-10 text-green-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Módulo al día</h3>
                    <p className="text-white/60 max-w-md mx-auto">
                      {todosMorosos.length === 0 
                        ? 'Todos los propietarios se encuentran solventes en el condominio en este momento.'
                        : 'No hay deudores que coincidan con los filtros aplicados.'}
                    </p>
                  </div>
              )}
            </div>
          </div>
        </div>
      )}
      {notification && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-lg border flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 ${
          notification.type === 'success' 
            ? 'bg-green-600 border-green-500 text-white' 
            : 'bg-red-600 border-red-500 text-white'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium text-sm">{notification.message}</span>
        </div>
      )}
      {/* MODAL NUEVO COMUNICADO */}
      {isComModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isSubmittingCom && setIsComModalOpen(false)} />
          
          <div className="relative bg-kbg rounded-3xl w-full max-w-lg border border-slate-800 overflow-hidden shadow-lg z-10 animate-in zoom-in-95 fade-in duration-200">
            {/* Header del modal */}
            <div className="bg-kcard/5 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-slate-400" /> Redactar Comunicado
              </h3>
              <button 
                onClick={() => !isSubmittingCom && setIsComModalOpen(false)} 
                className="p-1.5 rounded-full hover:bg-kcard/10 transition-colors text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Cuerpo del formulario */}
            <form onSubmit={handlePublicarComunicado} className="p-6 space-y-5">
              
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-white/80">Título del aviso</Label>
                <Input 
                  required 
                  value={comTitulo} 
                  onChange={(e) => setComTitulo(e.target.value)}
                  placeholder="Ej: Mantenimiento de Ascensores"
                  className="w-full bg-black/40 border-slate-800 text-white placeholder:text-white/30 h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-white/80">Categoría</Label>
                <select 
                  value={comCategoria} 
                  onChange={(e) => setComCategoria(e.target.value as any)}
                  className="w-full bg-black/40 border border-slate-800 rounded-xl px-3 h-11 text-white outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none"
                >
                  <option value="Informativo" className="bg-kbg">Informativo</option>
                  <option value="Mantenimiento" className="bg-kbg">Mantenimiento</option>
                  <option value="Urgente" className="bg-kbg">Urgente</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-white/80">Cuerpo del mensaje</Label>
                <textarea 
                  required 
                  rows={4} 
                  value={comCuerpo} 
                  onChange={(e) => setComCuerpo(e.target.value)}
                  placeholder="Detalla la información aquí..."
                  className="w-full bg-black/40 border border-slate-800 rounded-xl p-3 text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-white/80 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-slate-400" /> Imagen Adjunta (Opcional)
                </Label>
                <Input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setComImagen(e.target.files ? e.target.files[0] : null)}
                  className="w-full bg-black/40 border-slate-800 text-white/70 file:bg-slate-800 file:text-slate-200/80 file:border-none file:rounded-lg file:px-4 file:py-1 file:mr-4 hover:file:bg-white text-slate-900 cursor-pointer h-11 pt-1.5"
                />
              </div>

              {/* Toggle de Notificación */}
              <label className="flex items-center gap-3 cursor-pointer p-4 bg-kcard/5 rounded-2xl border border-white/5 hover:bg-kcard/10 transition-all group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={comNotificar}
                    onChange={e => setComNotificar(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-kcard/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-kcard/40 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white text-slate-900 peer-checked:after:bg-kcard"></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-white text-sm font-semibold group-hover:text-slate-400 transition-colors">Notificar inmediatamente</span>
                  <span className="text-white/30 text-[10px]">Envía correo automático a los vecinos</span>
                </div>
              </label>

              {/* Botones */}
              <div className="pt-2 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsComModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-kcard/5 hover:bg-kcard/10 text-slate-900 font-semibold text-sm transition-colors border border-slate-800"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmittingCom}
                  className="flex-1 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-200 disabled:bg-slate-300 disabled:text-slate-500  font-semibold text-sm transition-colors flex justify-center items-center gap-2 shadow-md"
                >
                  {isSubmittingCom ? 'Publicando...' : <><Send size={16} /> Publicar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE AGENDAR EVENTO */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-kcard border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-lg animate-in zoom-in duration-300">
            
            {/* Cabecera */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white leading-none">Agendar Evento</h2>
                  <p className="text-white/40 text-xs mt-1">Organiza la agenda del condominio</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEventModalOpen(false)} 
                className="text-white/40 hover:text-white p-2 hover:bg-kcard/5 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleGuardarEvento} className="space-y-4">
              {/* Título */}
              <div>
                <Label className="text-white/60 ml-1 mb-1.5 block text-sm">Título del Evento</Label>
                <Input
                  placeholder="Ej: Asamblea Extraordinaria de Propietarios"
                  className="bg-black/40 border-slate-800 text-white placeholder:text-white/20 focus:border-emerald-500/50 transition-all"
                  value={newEvent.titulo}
                  onChange={e => setNewEvent({...newEvent, titulo: e.target.value})}
                  required
                />
              </div>

              {/* Fechas: Inicio y Fin */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/60 ml-1 mb-1.5 block text-sm">Fecha Inicio</Label>
                  <Input
                    type="date"
                    className="bg-black/40 border-slate-800 text-white focus:border-emerald-500/50 [color-scheme:dark]"
                    value={newEvent.fecha}
                    onChange={e => setNewEvent({...newEvent, fecha: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label className="text-white/60 ml-1 mb-1.5 block text-sm">Fecha Fin</Label>
                  <Input
                    type="date"
                    className="bg-black/40 border-slate-800 text-white focus:border-emerald-500/50 [color-scheme:dark]"
                    value={newEvent.fecha_fin}
                    onChange={e => setNewEvent({...newEvent, fecha_fin: e.target.value})}
                    required
                  />
                </div>
              </div>

              {/* Horas y Categoría */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <Label className="text-white/60 ml-1 mb-1.5 block text-sm">Hora Inicio</Label>
                    <Input 
                      type="time" 
                      className="bg-black/40 border-slate-800 text-white [color-scheme:dark]" 
                      value={newEvent.hora_inicio} 
                      onChange={e => setNewEvent({...newEvent, hora_inicio: e.target.value})} 
                      required 
                    />
                  </div>
                  <div>
                    <Label className="text-white/60 ml-1 mb-1.5 block text-sm">Hora Fin</Label>
                    <Input 
                      type="time" 
                      className="bg-black/40 border-slate-800 text-white [color-scheme:dark]" 
                      value={newEvent.hora_fin} 
                      onChange={e => setNewEvent({...newEvent, hora_fin: e.target.value})} 
                      required 
                    />
                  </div>
                </div>

                <div className="flex flex-col">
                  <Label className="text-white/60 ml-1 mb-1.5 block text-sm">Categoría del Evento</Label>
                  <div className="flex-1 flex flex-col gap-2">
                    <select
                      className={`w-full rounded-xl px-4 h-full text-white font-bold border-none outline-none transition-colors shadow-inner ${
                        newEvent.tipo === 'Asamblea' ? 'bg-red-500/80 hover:bg-red-500' : 
                        newEvent.tipo === 'Mantenimiento' ? 'bg-yellow-500/80 hover:bg-yellow-500 text-black' : 
                        'bg-emerald-500/80 hover:bg-emerald-500'
                      }`}
                      value={newEvent.tipo}
                      onChange={e => setNewEvent({...newEvent, tipo: e.target.value as any})}
                    >
                      <option value="Asamblea" className="bg-kcard text-white">Asamblea </option>
                      <option value="Mantenimiento" className="bg-kcard text-white">Mantenimiento </option>
                      <option value="Social" className="bg-kcard text-white">Social </option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <Label className="text-white/60 ml-1 mb-1.5 block text-sm">Descripción / Detalles</Label>
                <textarea
                  className="w-full bg-black/40 border border-slate-800 rounded-xl px-4 py-3 text-white h-24 text-sm focus:ring-1 focus:ring-emerald-500 outline-none placeholder:text-white/20"
                  placeholder="Ej: Se requiere la presencia de todos los copropietarios..."
                  value={newEvent.descripcion}
                  onChange={e => setNewEvent({...newEvent, descripcion: e.target.value})}
                />
              </div>

              {/* Toggle de Notificación */}
              <label className="flex items-center gap-3 cursor-pointer p-4 bg-kcard/5 rounded-2xl border border-white/5 hover:bg-kcard/10 transition-all group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={newEvent.notificar_ahora}
                    onChange={e => setNewEvent({...newEvent, notificar_ahora: e.target.checked})}
                  />
                  <div className="w-11 h-6 bg-kcard/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-kcard/40 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-kcard"></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-white text-sm font-semibold group-hover:text-emerald-400 transition-colors">Notificar inmediatamente</span>
                  <span className="text-white/30 text-[10px]">Envía correo automático a los vecinos</span>
                </div>
              </label>

              {/* Botones de acción */}
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsEventModalOpen(false)} 
                  className="flex-1 py-3 rounded-xl bg-kcard/5 hover:bg-kcard/10 text-slate-900 font-semibold text-sm transition-colors border border-white/5"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmittingEvent}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white font-bold text-sm shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
                >
                  {isSubmittingEvent ? 'Agendando...' : 'Agendar Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
