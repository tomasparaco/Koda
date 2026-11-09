import { useState, useEffect } from 'react';
import { DollarSign, Search, Check, X, FileText, Calendar, TrendingDown, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import type { Propietario } from '../../types';
import { GastoService } from '../../services/gasto.service';
import { PagoService } from '../../services/pago.service';
import { ReciboService } from '../../services/recibo.service';
import { NotificacionService } from '../../services/notificacion.service';
import { useMoneda } from '../moneda/MonedaContext';
import { EmisionRecibosModal } from './EmisionRecibosModal';
import { AjustesSection } from './AjustesSection';
import { FondoReservaSection } from './FondoReservaSection';
import { RecibosMesSection } from './RecibosMesSection';

interface FinanzasViewProps {
  propiedad: Propietario;
}

type Gasto = {
  id_gasto: number;
  descripcion: string;
  monto: number;
  fecha_gasto: string;
  categoria: string;
  factura_url?: string;
};

export function FinanzasView({ propiedad }: FinanzasViewProps) {
  const { fmt } = useMoneda();
  const [emisiones, setEmisiones] = useState(0);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedPaymentForReject, setSelectedPaymentForReject] = useState<{ id_pago: number, apartamento: string } | null>(null);

  // Estados para el Modal de Aprobación
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedPaymentForApprove, setSelectedPaymentForApprove] = useState<{ id_pago: number, id_recibo: number, id_propietario: number, monto: number, apartamento: string } | null>(null);

  // Estado para feedback (éxito/error)
  const [feedback, setFeedback] = useState<{ show: boolean, type: 'success' | 'error', message: string }>({ show: false, type: 'success', message: '' });

  const [searchQuery, setSearchQuery] = useState('');

  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [transactionLimit, setTransactionLimit] = useState(5);

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
    setTransactionLimit(5); // reset pagination when month changes
  };

  // Estado para la emisión de recibos
  const [showEmisionModal, setShowEmisionModal] = useState(false);

  const fetchPendingPayments = async () => {
    if (!propiedad.codigo_edificio) return;
    const { exito, data } = await PagoService.getPagosPendientesAdmin(propiedad.codigo_edificio);
    if (exito && data) {
      setPendingPayments(data);
    }
    const { exito: exitoTrans, data: dataTrans } = await PagoService.getTodosLosPagosAdmin(propiedad.codigo_edificio);
    if (exitoTrans && dataTrans) {
      setTransactions(dataTrans);
    }
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ show: true, type, message });
    setTimeout(() => {
      setFeedback(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const handleAprobarClick = (id_pago: number, id_recibo: number, id_propietario: number, monto: number, apartamento: string) => {
    setSelectedPaymentForApprove({ id_pago, id_recibo, id_propietario, monto, apartamento });
    setShowApproveModal(true);
  };

  const confirmAprobar = async () => {
    if (!selectedPaymentForApprove) return;

    const { exito, mensaje } = await PagoService.aprobarPago(
      selectedPaymentForApprove.id_pago,
      selectedPaymentForApprove.id_recibo,
      selectedPaymentForApprove.id_propietario,
      selectedPaymentForApprove.monto
    );

    setShowApproveModal(false);
    setSelectedPaymentForApprove(null);

    if (exito) {
      showFeedback('success', mensaje);
      fetchPendingPayments();

      // Notificar al propietario
      await NotificacionService.crear({
        codigo_edificio: propiedad.codigo_edificio,
        tipo: 'pago',
        titulo: 'Pago Confirmado',
        mensaje: `Tu pago de ${fmt(Number(selectedPaymentForApprove.monto))} por el recibo N° ${selectedPaymentForApprove.id_recibo} ha sido aprobado.`,
        destinatario: selectedPaymentForApprove.apartamento,
      });
    } else {
      showFeedback('error', mensaje);
    }
  };

  const confirmRechazo = async () => {
    if (!rejectReason.trim()) {
      showFeedback('error', "Debe escribir un motivo para poder rechazar el pago.");
      return;
    }

    if (selectedPaymentForReject) {
      const { exito, mensaje } = await PagoService.rechazarPago(selectedPaymentForReject.id_pago, rejectReason);
      if (exito) {
        showFeedback('success', mensaje);
        fetchPendingPayments();

        // Notificar al propietario
        await NotificacionService.crear({
          codigo_edificio: propiedad.codigo_edificio,
          tipo: 'pago',
          titulo: 'Pago Rechazado',
          mensaje: `Tu reporte de pago ha sido rechazado. Motivo: ${rejectReason}`,
          destinatario: selectedPaymentForReject.apartamento,
        });
      } else {
        showFeedback('error', mensaje);
      }
      setShowRejectModal(false);
      setSelectedPaymentForReject(null);
      setRejectReason('');
    }
  };

  useEffect(() => {
    fetchPendingPayments();

    const fetchGastos = async () => {
      if (!propiedad.codigo_edificio) return;
      setIsLoading(true);
      const data = await GastoService.getGastos(propiedad.codigo_edificio);
      setGastos(data as Gasto[]);
      setIsLoading(false);
    };

    fetchGastos();
  }, [propiedad.codigo_edificio]);

  const filteredGastos = gastos.filter(g => {
    const [year, month] = g.fecha_gasto.split('-');
    return parseInt(month) - 1 === selectedMonth.getMonth() && parseInt(year) === selectedMonth.getFullYear();
  });

  const totalExpenses = filteredGastos.reduce((acc, gasto) => acc + Number(gasto.monto), 0);

  const filteredTransactions = transactions.filter(t => {
    const [year, month] = t.fecha_pago.split('-');
    return parseInt(month) - 1 === selectedMonth.getMonth() && parseInt(year) === selectedMonth.getFullYear();
  });

  const searchFilteredTransactions = filteredTransactions.filter(t =>
    t.referencia?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.recibos?.propietarios?.apartamento?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedTransactions = searchFilteredTransactions.slice(0, transactionLimit);

  // Checks if disabled
  const now = new Date();
  const isNextMonthDisabled = selectedMonth.getFullYear() === now.getFullYear() && selectedMonth.getMonth() === now.getMonth();

  return (
    <div className="space-y-6 relative">
      {/* Toast Feedback */}
      <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 transform ${feedback.show ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0 pointer-events-none'}`}>
        <div className={`px-6 py-3 rounded-2xl shadow-md flex items-center gap-3 ${feedback.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {feedback.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
          <span className="font-semibold">{feedback.type === 'success' ? 'Éxito' : 'Error'}:</span>
          <span>{feedback.message}</span>
        </div>
      </div>
      {/* Selector de Mes Global para la vista */}
      <div className="bg-kcard/10 backdrop-blur-lg rounded-2xl p-4 border border-slate-700">
        <div className="flex items-center justify-between">
          <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg hover:bg-kcard/10 transition-all">
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <h2 className="text-white text-xl capitalize font-medium">{formatMonth(selectedMonth)}</h2>
          <button
            onClick={() => changeMonth(1)}
            disabled={isNextMonthDisabled}
            className="p-2 rounded-lg hover:bg-kcard/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Bandeja de Conciliación */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
          <DollarSign className="w-5 h-5" />
          Bandeja de Conciliación
        </h2>
        <div className="space-y-3">
          {pendingPayments.length === 0 ? (
            <div className="bg-kcard/10 backdrop-blur-md border border-slate-700 rounded-2xl p-8 text-center text-white">
              <div className="bg-green-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">¡Todo está al día!</h3>
              <p className="text-slate-400">A la fecha no hay pagos por conciliar.</p>
            </div>
          ) : pendingPayments.map((payment) => (
            <div key={payment.id_pago} className="bg-kcard/10 backdrop-blur-md border border-slate-700 rounded-2xl p-5">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-40 h-32 bg-kcard/5 rounded-lg flex items-center justify-center border border-slate-800 overflow-hidden">
                  {payment.comprobante_url ? (
                    <a href={payment.comprobante_url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                      <ImageWithFallback
                        src={payment.comprobante_url}
                        alt="Capture de pago"
                        className="w-full h-full object-cover"
                      />
                    </a>
                  ) : (
                    <ImageIcon className="w-8 h-8 text-white/30" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg">Apto {payment.recibos?.propietarios?.apartamento}</h3>
                      <p className="text-sm text-slate-400">{payment.recibos?.propietarios?.nombre}</p>
                    </div>
                    <span className="text-2xl font-bold text-green-400">{fmt(Number(payment.monto))}</span>
                  </div>
                  <div className="space-y-1 text-sm bg-black/20 p-3 rounded-lg border border-white/5">
                    <p className="text-slate-400">
                      Recibo a Pagar: <span className="font-bold text-white">N° {payment.id_recibo}</span>
                    </p>
                    <p className="text-slate-400">Referencia: {payment.referencia}</p>
                    <p className="text-slate-400">Fecha: {new Date(payment.fecha_pago).toLocaleDateString('es-ES')}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => handleAprobarClick(payment.id_pago, payment.id_recibo, payment.recibos.id_propietario, payment.monto, payment.recibos?.propietarios?.apartamento)}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Check className="w-5 h-5" />
                  Aprobar
                </button>
                <button
                  onClick={() => { setSelectedPaymentForReject({ id_pago: payment.id_pago, apartamento: payment.recibos?.propietarios?.apartamento }); setShowRejectModal(true); }}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <X className="w-5 h-5" />
                  Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Libro de Transacciones */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
          <FileText className="w-5 h-5" />
          Libro de Transacciones
        </h2>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por referencia o apartamento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-kcard/10 backdrop-blur-md border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>
        <div className="bg-kcard/10 backdrop-blur-md border border-slate-700 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-kcard/5">
                <tr>
                  <th className="text-left p-4 font-semibold">Apto</th>
                  <th className="text-left p-4 font-semibold">Propietario</th>
                  <th className="text-left p-4 font-semibold">Referencia</th>
                  <th className="text-left p-4 font-semibold">Monto</th>
                  <th className="text-left p-4 font-semibold">Fecha</th>
                  <th className="text-left p-4 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.map((transaction) => (
                  <tr key={transaction.id_pago} className="border-t border-slate-800 hover:bg-kcard/5 transition-colors">
                    <td className="p-4 font-semibold">{transaction.recibos?.propietarios?.apartamento}</td>
                    <td className="p-4 text-slate-400">{transaction.recibos?.propietarios?.nombre}</td>
                    <td className="p-4 text-slate-400">
                      <div className="text-sm">{transaction.referencia}</div>
                      <div className="text-xs text-slate-400 mt-0.5">Recibo N° {transaction.id_recibo}</div>
                    </td>
                    <td className="p-4 font-bold text-green-400">{fmt(Number(transaction.monto))}</td>
                    <td className="p-4 text-sm text-slate-400">{new Date(transaction.fecha_pago).toLocaleDateString('es-ES')}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${transaction.estado === 'aprobado' ? 'bg-green-500/20 text-green-400' :
                        transaction.estado === 'pendiente' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                        {transaction.estado.charAt(0).toUpperCase() + transaction.estado.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {searchFilteredTransactions.length > transactionLimit && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => setTransactionLimit(prev => prev + 5)}
              className="bg-kcard/10 hover:bg-kcard/20 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all border border-slate-700"
            >
              Ver más transacciones
            </button>
          </div>
        )}

        {transactionLimit > 5 && (
          <div className="mt-2 flex justify-center">
            <button
              onClick={() => setTransactionLimit(5)}
              className="text-white/50 hover:text-white px-6 py-2 text-sm font-semibold transition-all"
            >
              Mostrar menos
            </button>
          </div>
        )}
      </section>

      {/* Relación de Gastos */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
            <TrendingDown className="w-5 h-5" />
            Relación de Gastos (Egresos)
          </h2>
          <button
            onClick={() => setShowEmisionModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all transform hover:scale-[1.02] shadow-lg"
          >
            Emitir Recibos del Mes
          </button>
        </div>

        <div className="bg-kcard/10 backdrop-blur-md border border-slate-700 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-kcard/5">
                <tr>
                  <th className="text-left p-4 font-semibold">Concepto</th>
                  <th className="text-left p-4 font-semibold">Fecha</th>
                  <th className="text-left p-4 font-semibold">Monto</th>
                  <th className="text-left p-4 font-semibold">Factura</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={4} className="text-center p-4">Cargando...</td></tr>
                ) : filteredGastos.length === 0 ? (
                  <tr><td colSpan={4} className="text-center p-4">No hay gastos asociados al mes seleccionado.</td></tr>
                ) : filteredGastos.map((gasto) => (
                  <tr key={gasto.id_gasto} className="border-t border-slate-800 hover:bg-kcard/5 transition-colors">
                    <td className="p-4 font-semibold">{gasto.descripcion}</td>
                    <td className="p-4 text-sm text-slate-400 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(gasto.fecha_gasto).toLocaleDateString('es-ES')}
                    </td>
                    <td className="p-4 font-bold text-red-400">{fmt(Number(gasto.monto))}</td>
                    <td className="p-4">
                      {gasto.factura_url ? (
                        <a href={gasto.factura_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:underline">
                          Ver
                        </a>
                      ) : (
                        'N/A'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-kcard/5 p-4 border-t border-slate-800">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-lg">Total de Gastos del Mes:</span>
              <p className="font-bold text-xl text-red-400">
                {fmt(totalExpenses)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recibos completos del mes seleccionado */}
      <RecibosMesSection
        codigoEdificio={propiedad.codigo_edificio}
        mes={selectedMonth}
        gastos={filteredGastos.map(g => ({ descripcion: g.descripcion, monto: Number(g.monto) }))}
        recargarClave={emisiones}
      />

      {/* Fondo de Reserva */}
      <FondoReservaSection codigoEdificio={propiedad.codigo_edificio} recargarClave={emisiones} />

      {/* Cargos, multas y devoluciones */}
      <AjustesSection codigoEdificio={propiedad.codigo_edificio} />

      {/* Modal de Aprobación */}
      {showApproveModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm transition-opacity"
            onClick={() => setShowApproveModal(false)}
          ></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-kcard rounded-3xl shadow-lg z-50 w-full max-w-sm overflow-hidden animate-fade-in">
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-5 flex items-center gap-3">
              <div className="bg-kcard/20 p-2 rounded-full">
                <Check className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-0.5">Aprobar Pago</h3>
                <p className="text-green-100 text-sm">Confirmación de transacción</p>
              </div>
            </div>

            <div className="p-6">
              <p className="text-slate-200 mb-6 text-center">
                ¿Estás seguro de que deseas aprobar este pago por <strong className="text-green-600">{fmt(Number(selectedPaymentForApprove?.monto))}</strong>?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowApproveModal(false)}
                  className="flex-1 bg-slate-800/50 hover:bg-gray-200 text-slate-200 py-3 rounded-xl font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmAprobar}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold transition-colors shadow-lg shadow-green-500/30"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal de Rechazo */}
      {showRejectModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm transition-opacity"
            onClick={() => setShowRejectModal(false)}
          ></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-kcard rounded-3xl shadow-lg z-50 w-full max-w-md p-6 overflow-hidden animate-fade-in">
            <h3 className="text-xl font-bold text-slate-100 mb-4">Motivo del Rechazo</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explique el motivo del rechazo..."
              className="w-full h-32 border border-gray-300 rounded-xl p-3 text-slate-100 resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 bg-slate-800/50 hover:bg-gray-200 text-slate-200 py-3 rounded-xl font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmRechazo}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-semibold transition-colors"
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal de Emisión de Recibos */}
      <EmisionRecibosModal
        isOpen={showEmisionModal}
        codigoEdificio={propiedad.codigo_edificio}
        onClose={() => setShowEmisionModal(false)}
        onEmitido={() => setEmisiones((n) => n + 1)}
      />
    </div>
  );
}

