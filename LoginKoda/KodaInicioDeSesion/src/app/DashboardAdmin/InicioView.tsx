import { useState, useEffect } from 'react';
import { AlertCircle, Wrench, DollarSign, TrendingUp, Bell, Users, Vote, FileEdit, UserPlus, Upload, FileText, Mail, ArrowLeft, Filter } from 'lucide-react';
import type { Propietario } from '../../types';
import { GastoService } from '../../services/gasto.service';
import { PagoService } from '../../services/pago.service';
import { ReciboService } from '../../services/recibo.service';
import { bcvService } from '../../services/bcv.service';
import { supabase } from '../../lib/supabase';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';

interface InicioViewProps {
  propiedad: Propietario;
  onNavigateToConciliacion?: () => void;
}

export function InicioView({ propiedad, onNavigateToConciliacion }: InicioViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [topMorosos, setTopMorosos] = useState<any[]>([]);
  const [todosMorosos, setTodosMorosos] = useState<any[]>([]);
  const [viewState, setViewState] = useState<'dashboard' | 'morosos'>('dashboard');
  
  // FILTROS DE MOROSIDAD
  const [filterMinDebt, setFilterMinDebt] = useState<number>(0);
  const [filterMinMonths, setFilterMinMonths] = useState<number>(0);
  
  // ENVÍO DE CORREOS
  const [sendingEmails, setSendingEmails] = useState<Record<number, boolean>>({});

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

      // Calculate clamped percentage
      let pct = 0;
      if (metaRecaudacion > 0) {
        pct = Math.round((montoRecaudado / metaRecaudacion) * 100);
      } else if (montoRecaudado > 0) {
        pct = 100; // If they collected money but no expenses registered
      }

      setRecaudacion({
        mes: monthName,
        meta: metaRecaudacion,
        actual: montoRecaudado,
        porcentaje: Math.min(pct, 100) // Ensure max visual bar is 100%
      });
    };
    fetchDashboardData();
  }, [propiedad.codigo_edificio]);

  // Estado para la emisión de recibos
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

  // Form state
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
        // Temporarily display the detailed error for debugging
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
      pagado_al_proveedor: false, // Default value
    });

    if (result.exito) {
      alert(result.mensaje);
      setShowAddExpenseModal(false);
      resetForm();
      // Optionally, you could pass a function from the layout to refresh other views
    } else {
      alert(result.mensaje);
    }
    setIsLoading(false);
  };

  const handleSendReminder = async (moroso: any, idx: number) => {
    if (!moroso.correo) {
      alert("Este usuario no tiene un correo electrónico registrado.");
      return;
    }
    
    setSendingEmails(prev => ({ ...prev, [idx]: true }));
    try {
      // Envía el correo directamente al correo del propietario seleccionado
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
        alert("Correo enviado exitosamente.");
      } else {
        alert("Hubo un error al enviar el correo.");
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión al enviar correo.");
    } finally {
      setSendingEmails(prev => ({ ...prev, [idx]: false }));
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
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* 1. Sección de Alertas "Por Hacer" */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Alertas Urgentes
        </h2>
        <div className="space-y-3">
          {/* Pagos por Conciliar */}
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

          {/* Tickets Abiertos */}
          <button className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-all">
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
                5
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* 2. Sección de Pulso Financiero */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Pulso Financiero
        </h2>
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5">
          {/* Progreso de Recaudación */}
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

          {/* Tasa de Cambio BCV */}
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

      {/* 3. Sección de Acciones Rápidas */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {/* Generar Cobro Mensual */}
          <button onClick={abrirModalEmision} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-all">
            <div className="bg-blue-500 p-3 rounded-full w-fit mx-auto mb-3">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-sm text-center">Generar Cobro Mensual</h3>
          </button>

          {/* Nuevo Comunicado */}
          <button className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-all">
            <div className="bg-purple-500 p-3 rounded-full w-fit mx-auto mb-3">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-sm text-center">Nuevo Comunicado</h3>
          </button>

          {/* Crear Encuesta/Asamblea */}
          <button className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-all">
            <div className="bg-green-500 p-3 rounded-full w-fit mx-auto mb-3">
              <Vote className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-sm text-center">Crear Encuesta / Asamblea</h3>
          </button>

          {/* Registrar Gasto/Multa */}
          <Dialog open={showAddExpenseModal} onOpenChange={setShowAddExpenseModal}>
            <DialogTrigger asChild>
              <button className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-all">
                <div className="bg-red-500 p-3 rounded-full w-fit mx-auto mb-3">
                  <FileEdit className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-sm text-center">Registrar Gasto/Multa</h3>
              </button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 text-white border-gray-700 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Registrar un Gasto</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="titulo" className="text-blue-200">Título del Gasto</Label>
                    <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} required className="bg-white/5 border-white/20 rounded-lg mt-1" />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="descripcion" className="text-blue-200">Descripción Detallada</Label>
                    <Textarea id="descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required className="bg-white/5 border-white/20 rounded-lg mt-1 min-h-[80px]" />
                  </div>
                  <div>
                    <Label htmlFor="monto" className="text-blue-200">Monto ($)</Label>
                    <Input id="monto" type="number" value={monto} onChange={(e) => setMonto(e.target.value)} required className="bg-white/5 border-white/20 rounded-lg mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="fecha_gasto" className="text-blue-200">Fecha</Label>
                    <Input id="fecha_gasto" type="date" value={fecha_gasto} onChange={(e) => setFechaGasto(e.target.value)} required className="bg-white/5 border-white/20 rounded-lg mt-1" />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="categoria" className="text-blue-200">Categoría</Label>
                    <Select onValueChange={setCategoria} value={categoria}>
                      <SelectTrigger className="bg-white/5 border-white/20 rounded-lg mt-1">
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
                    <Label htmlFor="factura" className="text-blue-200">Adjuntar Factura (Opcional)</Label>
                    {!factura ? (
                      <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-white/20 border-dashed rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                        <div className="space-y-1 text-center">
                          <Upload className="mx-auto h-10 w-10 text-white/50 mb-2" />
                          <div className="flex text-sm text-blue-200 justify-center">
                            <Label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-blue-400 hover:text-blue-300">
                              <span>Subir un archivo</span>
                              <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*,.pdf" onChange={handleFileChange} />
                            </Label>
                          </div>
                          <p className="text-xs text-white/50">PNG, JPG, PDF hasta 10MB</p>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 relative w-full h-40 border border-white/20 rounded-lg overflow-hidden bg-black/20 flex items-center justify-center group">
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

                        {/* Overlay on hover to change/remove file */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={removeFile}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                          >
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
                <DialogFooter>
                  <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-base">
                    {isLoading ? 'Guardando...' : 'Guardar Gasto'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      {/* 4. Sección de Gestión de Usuarios */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Gestión de Usuarios
        </h2>

        {/* Invitar Vecino */}
        <button className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-all mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 p-3 rounded-full">
              <UserPlus className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold">Invitar Vecino</h3>
              <p className="text-sm text-blue-200">Registrar nuevo copropietario</p>
            </div>
          </div>
        </button>

        {/* Morosos Top */}
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

      {/* Modal de Emisión de Recibos */}
      {showEmisionModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm transition-opacity"
            onClick={() => !isEmitting && setShowEmisionModal(false)}
          ></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl shadow-2xl z-50 w-full max-w-md overflow-hidden animate-fade-in">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
              <h3 className="text-xl font-bold text-white mb-1">Emitir Recibos del Mes</h3>
              <p className="text-blue-100 text-sm">
                Generar el cobro mensual para todos los propietarios
              </p>
            </div>

            <div className="p-6">
              {stepEmision === 1 ? (
                <>
                  <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl mb-6">
                    <div className="flex flex-col items-center justify-center text-center space-y-2">
                      <div className="bg-blue-100 p-3 rounded-full mb-2">
                        <DollarSign className="w-8 h-8 text-blue-600" />
                      </div>
                      <span className="text-gray-500 text-sm font-medium uppercase tracking-wider">Total Acumulado del Mes</span>
                      <span className="text-blue-700 font-bold text-4xl">${gastosMes.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-70"
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

      {/* Modal Todos los Morosos */}
      {viewState === 'morosos' && (
        <div className="absolute inset-0 bg-gray-900 z-50 overflow-y-auto custom-scrollbar">
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
    </>
  );
}
