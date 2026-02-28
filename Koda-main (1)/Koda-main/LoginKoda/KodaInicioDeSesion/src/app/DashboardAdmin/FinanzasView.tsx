import { useState, useEffect } from 'react';
import { DollarSign, Search, Check, X, FileText, Calendar, TrendingDown, Image as ImageIcon, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import type { Propietario } from '../../types';
import { GastoService } from '../../services/gasto.service';
import { PagoService } from '../../services/pago.service';
import { ReciboService } from '../../services/recibo.service';

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
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedPaymentForReject, setSelectedPaymentForReject] = useState<number | null>(null);
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

  const handleAprobar = async (paymentId: number, id_recibo: number, id_propietario: number, monto: number) => {
    if (confirm('¿Estás seguro de que deseas aprobar este pago?')) {
      const { exito, mensaje } = await PagoService.aprobarPago(paymentId, id_recibo, id_propietario, monto);
      if (exito) {
        alert(mensaje);
        fetchPendingPayments();
      } else {
        alert('Error: ' + mensaje);
      }
    }
  };

  const confirmRechazo = async () => {
    if (selectedPaymentForReject) {
      const { exito, mensaje } = await PagoService.rechazarPago(selectedPaymentForReject, rejectReason);
      if (exito) {
        alert(mensaje);
        fetchPendingPayments();
      } else {
        alert('Error: ' + mensaje);
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
    const gDate = new Date(g.fecha_gasto);
    return gDate.getMonth() === selectedMonth.getMonth() && gDate.getFullYear() === selectedMonth.getFullYear();
  });

  const totalExpenses = filteredGastos.reduce((acc, gasto) => acc + Number(gasto.monto), 0);

  const filteredTransactions = transactions.filter(t => {
    const tDate = new Date(t.fecha_pago);
    return tDate.getMonth() === selectedMonth.getMonth() && tDate.getFullYear() === selectedMonth.getFullYear();
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
    <div className="space-y-6">
      {/* Selector de Mes Global para la vista */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
        <div className="flex items-center justify-between">
          <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg hover:bg-white/10 transition-all">
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
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

      {/* Bandeja de Conciliación */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Bandeja de Conciliación
        </h2>
        <div className="space-y-3">
          {pendingPayments.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 text-center text-white">
              <div className="bg-green-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">¡Todo está al día!</h3>
              <p className="text-blue-200">A la fecha no hay pagos por conciliar.</p>
            </div>
          ) : pendingPayments.map((payment) => (
            <div key={payment.id_pago} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-40 h-32 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 overflow-hidden">
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
                      <p className="text-sm text-blue-200">{payment.recibos?.propietarios?.nombre}</p>
                    </div>
                    <span className="text-2xl font-bold text-green-400">${Number(payment.monto).toFixed(2)}</span>
                  </div>
                  <div className="space-y-1 text-sm bg-black/20 p-3 rounded-lg border border-white/5">
                    <p className="text-blue-200">Referencia: {payment.referencia}</p>
                    <p className="text-blue-200">Fecha: {new Date(payment.fecha_pago).toLocaleDateString('es-ES')}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => handleAprobar(payment.id_pago, payment.id_recibo, payment.recibos.id_propietario, payment.monto)}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Check className="w-5 h-5" />
                  Aprobar
                </button>
                <button
                  onClick={() => { setSelectedPaymentForReject(payment.id_pago); setShowRejectModal(true); }}
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
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Libro de Transacciones
        </h2>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-200" />
            <input
              type="text"
              placeholder="Buscar por referencia o apartamento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
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
                  <tr key={transaction.id_pago} className="border-t border-white/10 hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold">{transaction.recibos?.propietarios?.apartamento}</td>
                    <td className="p-4 text-blue-200">{transaction.recibos?.propietarios?.nombre}</td>
                    <td className="p-4 text-sm text-blue-200">{transaction.referencia}</td>
                    <td className="p-4 font-bold text-green-400">${Number(transaction.monto).toFixed(2)}</td>
                    <td className="p-4 text-sm text-blue-200">{new Date(transaction.fecha_pago).toLocaleDateString('es-ES')}</td>
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
              className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all border border-white/20"
            >
              Ver más transacciones
            </button>
          </div>
        )}
      </section>

      {/* Relación de Gastos */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TrendingDown className="w-5 h-5" />
            Relación de Gastos (Egresos)
          </h2>
          <button
            onClick={abrirModalEmision}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all transform hover:scale-[1.02] shadow-lg"
          >
            Emitir Recibos del Mes
          </button>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left p-4 font-semibold">Concepto</th>
                  <th className="text-left p-4 font-semibold">Fecha</th>
                  <th className="text-left p-4 font-semibold">Monto ($)</th>
                  <th className="text-left p-4 font-semibold">Factura</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={4} className="text-center p-4">Cargando...</td></tr>
                ) : filteredGastos.length === 0 ? (
                  <tr><td colSpan={4} className="text-center p-4">No hay gastos asociados al mes seleccionado.</td></tr>
                ) : filteredGastos.map((gasto) => (
                  <tr key={gasto.id_gasto} className="border-t border-white/10 hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold">{gasto.descripcion}</td>
                    <td className="p-4 text-sm text-blue-200 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(gasto.fecha_gasto).toLocaleDateString('es-ES')}
                    </td>
                    <td className="p-4 font-bold text-red-400">${Number(gasto.monto).toFixed(2)}</td>
                    <td className="p-4">
                      {gasto.factura_url ? (
                        <a href={gasto.factura_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
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

          <div className="bg-white/5 p-4 border-t border-white/10">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-lg">Total de Gastos del Mes:</span>
              <p className="font-bold text-xl text-red-400">
                ${totalExpenses.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Modal de Rechazo */}
      {showRejectModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm transition-opacity"
            onClick={() => setShowRejectModal(false)}
          ></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl shadow-2xl z-50 w-full max-w-md p-6 overflow-hidden animate-fade-in">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Motivo del Rechazo</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explique el motivo del rechazo..."
              className="w-full h-32 border border-gray-300 rounded-xl p-3 text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold transition-colors"
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
  );
}
