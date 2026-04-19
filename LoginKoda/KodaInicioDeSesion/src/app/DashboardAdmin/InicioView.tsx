import { useState, useEffect } from 'react';
import { AlertCircle, Wrench, DollarSign, TrendingUp, Bell, Users, Vote, FileEdit, UserPlus, Upload, FileText, Mail, ArrowLeft, Filter, CheckCircle, Plus, X, MessageSquare, Calendar, Image as ImageIcon, Send } from 'lucide-react';
import type { Propietario } from '../../types';
import { ComunidadService } from '../../services/comunidad.service';
import { GastoService } from '../../services/gasto.service';
import { PagoService } from '../../services/pago.service';
import { ReciboService } from '../../services/recibo.service';
import { bcvService } from '../../services/bcv.service';
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

      if (comNotificar) {
        const tituloCom = comTitulo;
        const catCom = comCategoria;
        supabase.from('propietarios').select('correo, nombre').eq('codigo_edificio', propiedad.codigo_edificio).then(({ data: propietarios }) => {
          if (propietarios && propietarios.length > 0) {
            propietarios.forEach(async (p) => {
              if (p.correo) {
                try {
                   await fetch(`https://formsubmit.co/ajax/${p.correo}`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Accept: "application/json" },
                      body: JSON.stringify({
                          _subject: `Nuevo Comunicado: ${tituloCom} - Koda Mantenimiento`,
                          _template: "table",
                          Para: p.correo,
                          Propietario: p.nombre,
                          Categoría: catCom,
                          Título: tituloCom,
                          Mensaje: `Hola ${p.nombre}, la administración ha publicado un nuevo comunicado en la plataforma. Por favor, ingresa a la aplicación para más detalles.`
                      })
                  });
                } catch (e) {
                    console.error("Error enviando correo de comunicado a", p.correo, e);
                }
              }
            });
          }
        });
      }

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

        if (newEvent.notificar_ahora) {
          const evTitulo = newEvent.titulo;
          const evFecha = newEvent.fecha;
          supabase.from('propietarios').select('correo, nombre').eq('codigo_edificio', propiedad.codigo_edificio).then(({ data: propietarios }) => {
            if (propietarios && propietarios.length > 0) {
              propietarios.forEach(async (p) => {
                if (p.correo) {
                  try {
                     await fetch(`https://formsubmit.co/ajax/${p.correo}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Accept: "application/json" },
                        body: JSON.stringify({
                            _subject: `Nuevo Evento Agendado: ${evTitulo} - Koda Mantenimiento`,
                            _template: "table",
                            Para: p.correo,
                            Propietario: p.nombre,
                            Evento: evTitulo,
                            Fecha: evFecha,
                            Mensaje: `Hola ${p.nombre}, la administración ha agendado un nuevo evento. Por favor, revisa la información en la aplicación para más detalles.`
                        })
                    });
                  } catch (e) {
                      console.error("Error enviando correo de evento a", p.correo, e);
                  }
                }
              });
            }
          });
        }

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

  const [bcvRate, setBcvRate] = useState(45.50);
  const [bcvDate, setBcvDate] = useState('Cargando...');
  const [isLoadingBcv, setIsLoadingBcv] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      // BCV Fetch
      const bcvData = await bcvService.getLatestRate();
      setBcvRate(bcvData.rate);
      setBcvDate(bcvData.lastUpdate);
      setIsLoadingBcv(false);

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
        metaRecaudacion = gastosMes.reduce((acc, g) => acc + Number(g.monto), 0);
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
  }, [propiedad.codigo_edificio]);

  const [showEmisionModal, setShowEmisionModal] = useState(false);
  const [isEmitting, setIsEmitting] = useState(false);
  const [gastosMes, setGastosMes] = useState(0);
  const [stepEmision, setStepEmision] = useState(1);

  const abrirModalEmision = async () => {
    if (!propiedad.codigo_edificio) return;
    const total = await ReciboService.getGastosDelMesEstimados(propiedad.codigo_edificio);
    setGastosMes(total);
    setStepEmision(1);
    setShowEmisionModal(true);
  };

  const confirmarEmision = async () => {
    if (!propiedad.codigo_edificio) return;
    setIsEmitting(true);
    const result = await ReciboService.emitirRecibosDelMes(propiedad.codigo_edificio);
    setIsEmitting(false);
    if (result.exito) {
      alert(result.mensaje);
      setShowEmisionModal(false);
    } else {
      alert('Error: ' + result.mensaje);
    }
  };

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
      if (!moroso.correo) {
          setNotification({ message: "Este usuario no tiene un correo electrónico registrado.", type: 'error' });
          setTimeout(() => setNotification(null), 5000);
          return;
      }
      
      setSendingEmails(prev => ({ ...prev, [idx]: true }));
      try {
          const response = await fetch(`https://formsubmit.co/ajax/${moroso.correo}`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Accept: "application/json" },
              body: JSON.stringify({
                  _subject: `Aviso de Deuda Pendiente - Apto ${moroso.apartamento}`,
                  _template: "table",
                  Para: moroso.correo || "Sin correo",
                  Propietario: moroso.nombre,
                  Apartamento: moroso.apartamento,
                  DeudaTotal: `$${Number(moroso.deuda).toFixed(2)}`,
                  Mensaje: `Hola ${moroso.nombre}, le escribimos desde la administración para recordarle su saldo pendiente de $${Number(moroso.deuda).toFixed(2)}. Agradecemos que pueda ponerse al día lo antes posible.`
              })
          });
          if (response.ok) {
              setNotification({ message: `¡Recordatorio enviado exitosamente a ${moroso.nombre}!`, type: 'success' });
          } else {
              setNotification({ message: "Hubo un error al enviar el recordatorio.", type: 'error' });
          }
      } catch (e) {
          console.error(e);
          setNotification({ message: "Error de conexión al enviar correo.", type: 'error' });
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
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Alertas Urgentes
        </h2>
        <div className="space-y-3">
          <button
            onClick={onNavigateToConciliacion}
            className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-all text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-red-500 p-3 rounded-full">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Pagos por Conciliar</h3>
                  <p className="text-sm text-blue-200">Requiere aprobación</p>
                </div>
              </div>
              <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                {pendingCount} Pendiente{pendingCount !== 1 ? 's' : ''}
              </div>
            </div>
          </button>

          <button 
            onClick={onNavigateToTickets}
            className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-all text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-orange-500 p-3 rounded-full">
                  <Wrench className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Tickets Abiertos</h3>
                  <p className="text-sm text-blue-200">Reportes de fallas</p>
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
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Pulso Financiero
        </h2>
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5">
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold capitalize">Recaudación de {recaudacion.mes}</span>
              <span className="text-2xl font-bold">{recaudacion.porcentaje}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
              <div
                className="bg-green-400 h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${recaudacion.porcentaje}%` }}
              ></div>
            </div>
            <p className="text-sm text-blue-200 mt-2">
              ${recaudacion.actual.toFixed(2)} de ${recaudacion.meta.toFixed(2)} recaudados
              {recaudacion.meta === 0 && ' (No hay gastos registrados este mes)'}
            </p>
          </div>

          <div className="border-t border-white/20 pt-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-blue-200">Tasa BCV Dinámica</p>
                <p className="text-2xl font-bold">Bs. {bcvRate.toFixed(2)}</p>
                <p className="text-[10px] text-white/50 mt-1">{isLoadingBcv ? 'Cargando información devistas remotas...' : `Última sincronización: ${bcvDate}`}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={abrirModalEmision} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover:bg-white/20 transition-all duration-300 group hover:-translate-y-1 hover:shadow-xl hover:shadow-green-500/10">
            <div className="bg-green-500 p-3 rounded-full w-fit mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-sm text-center text-white/90 group-hover:text-white transition-colors">Generar Cobro Mensual</h3>
          </button>

          <button onClick={() => setShowSelectorModal(true)} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover:bg-white/20 transition-all duration-300 flex flex-col items-center justify-center group hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10">
            <div className="bg-blue-500 p-3 rounded-full mb-3 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-sm text-center text-white/90 group-hover:text-white transition-colors">Crear Comunicado<br/>/ Agendar Evento</h3>
          </button>

          <button
            onClick={() => setShowEncuestaModal(true)}
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover:bg-white/20 transition-all duration-300 group hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10"
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
              <div className="relative bg-[#0f172a] border border-white/10 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in duration-200 p-6 flex flex-col items-center gap-4 m-4">
                <div className="w-full flex justify-between items-center mb-2">
                  <h3 className="text-white text-lg font-bold">¿Qué deseas hacer?</h3>
                  <button onClick={() => setShowSelectorModal(false)} className="p-1 rounded-full hover:bg-white/20 transition-colors">
                    <X className="w-5 h-5 text-white/50 hover:text-white" />
                  </button>
                </div>
                
                <button
                  onClick={() => { setShowSelectorModal(false); setIsComModalOpen(true); }}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 group"
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
              <div className="relative bg-gray-900 border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                <div className="bg-gradient-to-r from-purple-700 to-purple-900 px-6 py-4 flex items-center justify-between shrink-0">
                  <h3 className="text-white text-lg font-bold flex items-center gap-2">
                    <Vote className="w-5 h-5" /> Crear Nueva Encuesta
                  </h3>
                  <button onClick={() => setShowEncuestaModal(false)} className="p-1 rounded-full hover:bg-white/20 transition-colors">
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
                      className="bg-white/5 border-white/10 text-white mt-1"
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
                            className="bg-white/5 border-white/10 text-white"
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
                        className="bg-white/5 border-white/10 text-white mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-white/80 block mb-2">Documento Soporte (Opcional)</Label>
                    {!encuestaArchivo ? (
                      <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-white/20 border-dashed rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                        <div className="space-y-1 text-center">
                          <Upload className="mx-auto h-8 w-8 text-white/50 mb-3" />
                          <Label htmlFor="enc-file" className="cursor-pointer text-blue-400 hover:text-blue-300 text-sm font-medium">
                            <span>Añadir archivo</span>
                            <input id="enc-file" type="file" className="sr-only" onChange={handleEncuestaFileChange} accept=".pdf,image/*" />
                          </Label>
                          <p className="text-xs text-white/40 mt-1">PDF o Imágenes</p>
                        </div>
                      </div>
                    ) : (
                      <div className="relative w-full h-24 border border-white/20 rounded-xl overflow-hidden bg-black/40 flex items-center justify-center group">
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
                <div className="border-t border-white/10 p-4 flex gap-3 shrink-0">
                  <button onClick={() => setShowEncuestaModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-medium border border-white/10 transition-colors">
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
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover:bg-white/20 transition-all duration-300 group hover:-translate-y-1 hover:shadow-xl hover:shadow-red-500/10"
          >
            <div className="bg-red-500 p-3 rounded-full w-fit mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
              <FileEdit className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-sm text-center text-white/90 group-hover:text-white transition-colors">Registrar Gasto/Multa</h3>
          </button>

          {/* MODAL REGISTRAR GASTO */}
          {showAddExpenseModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isLoading && setShowAddExpenseModal(false)} />
              <div className="relative bg-gray-900 border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 fade-in duration-200">
                <div className="bg-gradient-to-r from-red-700 to-red-900 px-6 py-4 flex items-center justify-between shrink-0">
                  <h3 className="text-white text-lg font-bold flex items-center gap-2">
                    <FileEdit className="w-5 h-5" /> Registrar un Gasto
                  </h3>
                  <button onClick={() => !isLoading && setShowAddExpenseModal(false)} className="p-1 rounded-full hover:bg-white/20 transition-colors">
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="titulo" className="text-red-200">Título del Gasto</Label>
                      <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} required className="bg-white/5 border-white/20 rounded-lg mt-1 text-white" />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="descripcion" className="text-red-200">Descripción Detallada</Label>
                      <Textarea id="descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required className="bg-white/5 border-white/20 rounded-lg mt-1 min-h-[80px] text-white" />
                    </div>
                    <div>
                      <Label htmlFor="monto" className="text-red-200">Monto ($)</Label>
                      <Input id="monto" type="number" value={monto} onChange={(e) => setMonto(e.target.value)} required className="bg-white/5 border-white/20 rounded-lg mt-1 text-white" />
                    </div>
                    <div>
                      <Label htmlFor="fecha_gasto" className="text-red-200">Fecha</Label>
                      <Input id="fecha_gasto" type="date" value={fecha_gasto} onChange={(e) => setFechaGasto(e.target.value)} required className="bg-white/5 border-white/20 rounded-lg mt-1 text-white" />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="categoria" className="text-red-200">Categoría</Label>
                      <Select onValueChange={setCategoria} value={categoria}>
                        <SelectTrigger className="bg-white/5 border-white/20 rounded-lg mt-1 text-white">
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
                        <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-white/20 border-dashed rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
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
                        <div className="mt-2 relative w-full h-32 border border-white/20 rounded-xl overflow-hidden bg-black/40 flex items-center justify-center group">
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
                            <label className="bg-white/20 hover:bg-white/30 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer backdrop-blur-sm">
                              Cambiar
                              <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-white/10 pt-4 flex gap-3">
                    <button type="button" onClick={() => setShowAddExpenseModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-medium border border-white/10 transition-colors">
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
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Gestión de Usuarios
        </h2>


        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              Morosos Top
            </h3>
          </div>
          <div className="space-y-2">
            {topMorosos.length > 0 ? (
              topMorosos.map((moroso, index) => (
                <div key={index} className={`flex justify-between items-center py-2 ${index < topMorosos.length - 1 ? 'border-b border-white/10' : ''}`}>
                  <span className="text-sm truncate mr-2">Apto {moroso.apartamento} - {moroso.nombre.split(' ')[0]}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-orange-300 text-xs bg-orange-500/20 px-2 py-0.5 rounded border border-orange-500/20">
                      {moroso.meses_adeudados || 0} Mes{(moroso.meses_adeudados || 0) !== 1 ? 'es' : ''}
                    </span>
                    <span className="text-red-400 font-bold">${Number(moroso.deuda).toFixed(2)}</span>
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

      {showEmisionModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm transition-opacity"
            onClick={() => !isEmitting && setShowEmisionModal(false)}
          ></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl shadow-2xl z-50 w-full max-w-md overflow-hidden animate-fade-in">
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-5">
              <h3 className="text-xl font-bold text-white mb-1">Emitir Recibos del Mes</h3>
              <p className="text-green-100 text-sm">
                Generar el cobro mensual para todos los propietarios
              </p>
            </div>

            <div className="p-6">
              {stepEmision === 1 ? (
                <>
                  <div className="bg-green-50/50 border border-green-100 p-5 rounded-2xl mb-6">
                    <div className="flex flex-col items-center justify-center text-center space-y-2">
                      <div className="bg-green-100 p-3 rounded-full mb-2">
                        <DollarSign className="w-8 h-8 text-green-600" />
                      </div>
                      <span className="text-gray-500 text-sm font-medium uppercase tracking-wider">Total Acumulado del Mes</span>
                      <span className="text-green-700 font-bold text-4xl">${gastosMes.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-2">
                    <button
                      onClick={() => setShowEmisionModal(false)}
                      disabled={isEmitting}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3.5 rounded-xl font-semibold transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => setStepEmision(2)}
                      disabled={isEmitting}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-70"
                    >
                      Continuar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl mb-6 text-center">
                    <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                    <h3 className="text-amber-800 font-bold text-lg mb-2">¿Estás completamente seguro?</h3>
                    <p className="text-amber-700 text-sm">
                      Esta acción generará deudas reales a todos los propietarios del edificio y no se puede deshacer de forma automática.
                    </p>
                  </div>

                  <div className="flex gap-3 mt-2">
                    <button
                      onClick={() => setStepEmision(1)}
                      disabled={isEmitting}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3.5 rounded-xl font-semibold transition-colors disabled:opacity-50"
                    >
                      Atrás
                    </button>
                    <button
                      onClick={confirmarEmision}
                      disabled={isEmitting}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isEmitting ? 'Emitiendo...' : 'Sí, Emitir Ahora'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      </div>
      )}

      {viewState === 'morosos' && (
        <div className="absolute inset-0 bg-gradient-to-b from-[#1e3a8a] to-[#1e40af] z-50 overflow-y-auto custom-scrollbar">
          {/* Header con gradiente rojo */}
          <div className="sticky top-0 z-40 bg-gradient-to-r from-red-600 to-red-800 px-6 py-5 flex items-center gap-4 shadow-lg">
            <button 
              onClick={() => setViewState('dashboard')}
              className="p-2 bg-black/20 hover:bg-black/40 rounded-full transition-colors backdrop-blur-sm"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-6 h-6" /> Reporte de Cuentas por Cobrar
              </h3>
              <p className="text-red-100 text-sm mt-1">
                Gestión y seguimiento de todos los dueños con saldos deudores
              </p>
            </div>
          </div>
          
          <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
            
            {/* Filtros */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <Label className="text-blue-200 mb-2 block flex items-center gap-2"><Filter className="w-4 h-4"/> Deuda Mínima ($)</Label>
                <Input 
                  type="number" 
                  min="0"
                  value={filterMinDebt || ''} 
                  onChange={(e) => setFilterMinDebt(Number(e.target.value))} 
                  placeholder="Ej: 50"
                  className="bg-black/30 border-white/20 text-white rounded-xl placeholder:text-white/30"
                />
              </div>
              <div className="flex-1 w-full">
                <Label className="text-blue-200 mb-2 block flex items-center gap-2"><Filter className="w-4 h-4"/> Meses Acumulados</Label>
                <Input 
                  type="number" 
                  min="0"
                  value={filterMinMonths || ''} 
                  onChange={(e) => setFilterMinMonths(Number(e.target.value))} 
                  placeholder="Ej: 2"
                  className="bg-black/30 border-white/20 text-white rounded-xl placeholder:text-white/30"
                />
              </div>
              <button 
                onClick={() => { setFilterMinDebt(0); setFilterMinMonths(0); }}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/10 px-6 py-2.5 rounded-xl font-medium transition-colors w-full md:w-auto h-[42px]"
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
                    <div key={idx} className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col justify-between gap-4 hover:bg-white/10 transition-colors shadow-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="bg-blue-500/20 text-blue-300 font-bold px-3 py-1.5 rounded-lg text-xs border border-blue-500/20 shadow-inner">
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
                          <span className="text-red-400 font-bold text-2xl">${deudaObj.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleSendReminder(moroso, idx)}
                        disabled={isLoadingM}
                        className="mt-2 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg"
                      >
                        {isLoadingM ? 'Enviando Aviso...' : <><Mail className="w-4 h-4" /> Enviar Aviso de Cobro</>}
                      </button>
                    </div>
                  );
                })
              ) : (
                  <div className="col-span-1 md:col-span-2 text-center py-16 bg-white/5 border border-white/10 rounded-3xl">
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
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 ${
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
          
          <div className="relative bg-[#0f172a] rounded-3xl w-full max-w-lg border border-white/10 overflow-hidden shadow-2xl z-10 animate-in zoom-in-95 fade-in duration-200">
            {/* Header del modal */}
            <div className="bg-white/5 border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-400" /> Redactar Comunicado
              </h3>
              <button 
                onClick={() => !isSubmittingCom && setIsComModalOpen(false)} 
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white"
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
                  className="w-full bg-black/40 border-white/10 text-white placeholder:text-white/30 h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-white/80">Categoría</Label>
                <select 
                  value={comCategoria} 
                  onChange={(e) => setComCategoria(e.target.value as any)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 h-11 text-white outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none"
                >
                  <option value="Informativo" className="bg-[#0f172a]">Informativo</option>
                  <option value="Mantenimiento" className="bg-[#0f172a]">Mantenimiento</option>
                  <option value="Urgente" className="bg-[#0f172a]">Urgente</option>
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
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-white/80 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-blue-400" /> Imagen Adjunta (Opcional)
                </Label>
                <Input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setComImagen(e.target.files ? e.target.files[0] : null)}
                  className="w-full bg-black/40 border-white/10 text-white/70 file:text-white file:bg-blue-600/80 file:border-none file:rounded-lg file:px-4 file:py-1 file:mr-4 hover:file:bg-blue-600 cursor-pointer h-11 pt-1.5"
                />
              </div>

              {/* Toggle de Notificación */}
              <label className="flex items-center gap-3 cursor-pointer p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={comNotificar}
                    onChange={e => setComNotificar(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/40 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-checked:after:bg-white"></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-white text-sm font-semibold group-hover:text-blue-400 transition-colors">Notificar inmediatamente</span>
                  <span className="text-white/30 text-[10px]">Envía correo automático a los vecinos</span>
                </div>
              </label>

              {/* Botones */}
              <div className="pt-2 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsComModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-sm transition-colors border border-white/10"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmittingCom}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:text-white/50 text-white font-semibold text-sm transition-colors flex justify-center items-center gap-2 shadow-lg shadow-blue-500/20"
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
          <div className="bg-[#1e293b] border border-white/10 rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in duration-300">
            
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
                className="text-white/40 hover:text-white p-2 hover:bg-white/5 rounded-full transition-colors"
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
                  className="bg-black/40 border-white/10 text-white placeholder:text-white/20 focus:border-emerald-500/50 transition-all"
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
                    className="bg-black/40 border-white/10 text-white focus:border-emerald-500/50 [color-scheme:dark]"
                    value={newEvent.fecha}
                    onChange={e => setNewEvent({...newEvent, fecha: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label className="text-white/60 ml-1 mb-1.5 block text-sm">Fecha Fin</Label>
                  <Input
                    type="date"
                    className="bg-black/40 border-white/10 text-white focus:border-emerald-500/50 [color-scheme:dark]"
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
                      className="bg-black/40 border-white/10 text-white [color-scheme:dark]" 
                      value={newEvent.hora_inicio} 
                      onChange={e => setNewEvent({...newEvent, hora_inicio: e.target.value})} 
                      required 
                    />
                  </div>
                  <div>
                    <Label className="text-white/60 ml-1 mb-1.5 block text-sm">Hora Fin</Label>
                    <Input 
                      type="time" 
                      className="bg-black/40 border-white/10 text-white [color-scheme:dark]" 
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
                      <option value="Asamblea" className="bg-[#1e293b] text-white">Asamblea </option>
                      <option value="Mantenimiento" className="bg-[#1e293b] text-white">Mantenimiento </option>
                      <option value="Social" className="bg-[#1e293b] text-white">Social </option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <Label className="text-white/60 ml-1 mb-1.5 block text-sm">Descripción / Detalles</Label>
                <textarea
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white h-24 text-sm focus:ring-1 focus:ring-emerald-500 outline-none placeholder:text-white/20"
                  placeholder="Ej: Se requiere la presencia de todos los copropietarios..."
                  value={newEvent.descripcion}
                  onChange={e => setNewEvent({...newEvent, descripcion: e.target.value})}
                />
              </div>

              {/* Toggle de Notificación */}
              <label className="flex items-center gap-3 cursor-pointer p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={newEvent.notificar_ahora}
                    onChange={e => setNewEvent({...newEvent, notificar_ahora: e.target.checked})}
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/40 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white"></div>
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
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-sm transition-colors border border-white/5"
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