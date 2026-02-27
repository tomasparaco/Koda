import { useState, useEffect } from 'react';
import { DollarSign, Search, Check, X, FileText, Calendar, TrendingDown, Image as ImageIcon } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import type { Propietario } from '../../types';
import { GastoService } from '../../services/gasto.service';

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
  const [searchQuery, setSearchQuery] = useState('');
  
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const pendingPayments = [
    { id: 1, apartamento: '404', nombre: 'Carlos Pérez', monto: 150.00, fecha: '2026-02-10', referencia: '123456', hasCapture: true },
    { id: 2, apartamento: '201', nombre: 'María González', monto: 150.00, fecha: '2026-02-12', referencia: '789012', hasCapture: true },
  ];

  const transactions = [
    { id: 1, apartamento: '102', nombre: 'Ana Silva', monto: 150.00, fecha: '2026-02-05', referencia: '111222', tipo: 'Ingreso', estado: 'Aprobado' },
    { id: 2, apartamento: '303', nombre: 'Pedro Martínez', monto: 150.00, fecha: '2026-02-03', referencia: '333444', tipo: 'Ingreso', estado: 'Aprobado' },
  ];

  useEffect(() => {
    const fetchGastos = async () => {
      if (!propiedad.codigo_edificio) return;
      setIsLoading(true);
      const data = await GastoService.getGastos(propiedad.codigo_edificio);
      setGastos(data as Gasto[]);
      setIsLoading(false);
    };

    fetchGastos();
  }, [propiedad.codigo_edificio]);

  const totalExpenses = gastos.reduce((acc, gasto) => acc + Number(gasto.monto), 0);

  return (
    <div className="space-y-6">
      {/* Bandeja de Conciliación */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Bandeja de Conciliación
        </h2>
        <div className="space-y-3">
          {pendingPayments.map((payment) => (
            <div key={payment.id} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-40 h-32 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 overflow-hidden">
                  {payment.hasCapture ? (
                    <ImageWithFallback 
                      src="https://images.unsplash.com/photo-1554224311-beee1080a6a7?w=300&h=200&fit=crop" 
                      alt="Capture de pago"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-white/30" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg">Apto {payment.apartamento}</h3>
                      <p className="text-sm text-blue-200">{payment.nombre}</p>
                    </div>
                    <span className="text-2xl font-bold text-green-400">${payment.monto.toFixed(2)}</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-blue-200">Referencia: {payment.referencia}</p>
                    <p className="text-blue-200">Fecha: {new Date(payment.fecha).toLocaleDateString('es-ES')}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
                  <Check className="w-5 h-5" />
                  Aprobar
                </button>
                <button 
                  onClick={() => setShowRejectModal(true)}
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
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-t border-white/10 hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold">{transaction.apartamento}</td>
                    <td className="p-4 text-blue-200">{transaction.nombre}</td>
                    <td className="p-4 text-sm text-blue-200">{transaction.referencia}</td>
                    <td className="p-4 font-bold text-green-400">${transaction.monto.toFixed(2)}</td>
                    <td className="p-4 text-sm text-blue-200">{new Date(transaction.fecha).toLocaleDateString('es-ES')}</td>
                    <td className="p-4">
                      <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-semibold">
                        {transaction.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Relación de Gastos */}
      <section>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                Relación de Gastos (Egresos)
            </h2>
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
                ) : gastos.map((gasto) => (
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
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowRejectModal(false)}
          ></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Motivo del Rechazo</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explique el motivo del rechazo..."
              className="w-full h-32 border border-gray-300 rounded-lg p-3 text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="flex gap-3 mt-4">
              <button 
                onClick={() => setShowRejectModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-semibold transition-colors"
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


