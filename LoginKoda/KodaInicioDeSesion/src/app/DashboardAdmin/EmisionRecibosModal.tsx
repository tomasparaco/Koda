import { useEffect, useState } from 'react';
import { AlertCircle, DollarSign, Loader2, PiggyBank } from 'lucide-react';
import { ReciboService, type ResumenEmision } from '../../services/recibo.service';
import { NotificacionService } from '../../services/notificacion.service';
import { useMoneda } from '../moneda/MonedaContext';

interface Props {
  isOpen: boolean;
  codigoEdificio: string;
  onClose: () => void;
  onEmitido?: () => void;
}

/** Modal de 2 pasos para emitir los recibos del mes con su desglose. */
export function EmisionRecibosModal({ isOpen, codigoEdificio, onClose, onEmitido }: Props) {
  const { fmt, moneda } = useMoneda();
  const [step, setStep] = useState(1);
  const [resumen, setResumen] = useState<ResumenEmision | null>(null);
  const [isEmitting, setIsEmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !codigoEdificio) return;
    setStep(1);
    setResumen(null);
    ReciboService.previsualizarEmision(codigoEdificio).then(setResumen);
  }, [isOpen, codigoEdificio]);

  if (!isOpen) return null;

  const confirmar = async () => {
    setIsEmitting(true);
    const result = await ReciboService.emitirRecibosDelMes(codigoEdificio);
    setIsEmitting(false);
    if (result.exito) {
      await NotificacionService.crear({
        codigo_edificio: codigoEdificio,
        tipo: 'cobro',
        titulo: 'Nueva Facturación Mensual',
        mensaje: 'Se generaron los recibos de este mes. Ya puedes revisarlos en tu panel.',
        destinatario: 'usuarios',
      });
      alert(result.mensaje);
      onEmitido?.();
      onClose();
    } else {
      alert('Error: ' + result.mensaje);
    }
  };

  const Fila = ({ label, valor, tono = 'text-slate-200' }: { label: string; valor: string; tono?: string }) => (
    <div className="flex justify-between items-center text-sm py-1.5">
      <span className="text-slate-400">{label}</span>
      <span className={`font-semibold ${tono}`}>{valor}</span>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={() => !isEmitting && onClose()} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-kbg rounded-3xl shadow-lg border border-slate-800 z-50 w-[calc(100%-2rem)] max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-kcard/5 border-b border-slate-800 px-6 py-5">
          <h3 className="text-xl font-bold text-slate-100 mb-1">Emitir Recibos del Mes</h3>
          <p className="text-slate-400 text-sm">Generar el cobro mensual para todos los propietarios ({moneda})</p>
        </div>

        <div className="p-6">
          {step === 1 ? (
            <>
              {!resumen ? (
                <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Calculando...
                </div>
              ) : (
                <div className="bg-kcard/30 border border-slate-800 p-5 rounded-2xl mb-6">
                  <div className="flex flex-col items-center text-center mb-4">
                    <div className="bg-green-500/20 p-3 rounded-full mb-2">
                      <DollarSign className="w-7 h-7 text-green-400" />
                    </div>
                    <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total a facturar</span>
                    <span className="text-green-400 font-bold text-4xl">{fmt(resumen.totalAFacturar)}</span>
                  </div>
                  <div className="border-t border-slate-800 pt-3">
                    <Fila label="Gastos del mes" valor={fmt(resumen.gastoTotalMes)} />
                    {resumen.fondoReposicion > 0 && (
                      <Fila
                        label="Reposición del fondo de reserva"
                        valor={`+ ${fmt(resumen.fondoReposicion)}`}
                        tono="text-blue-400"
                      />
                    )}
                    {resumen.totalCargos > 0 && (
                      <Fila label="Multas y cargos extra" valor={`+ ${fmt(resumen.totalCargos)}`} tono="text-orange-400" />
                    )}
                    {resumen.totalCreditos > 0 && (
                      <Fila label="Devoluciones" valor={`− ${fmt(resumen.totalCreditos)}`} tono="text-emerald-400" />
                    )}
                  </div>
                  <p className="flex items-start gap-2 text-xs text-slate-500 mt-3">
                    <PiggyBank className="w-4 h-4 shrink-0" />
                    {resumen.fondoMeta > 0
                      ? resumen.fondoReposicion > 0
                        ? `El fondo tiene ${fmt(resumen.fondoSaldo)} de ${fmt(resumen.fondoMeta)}: se cobra la diferencia por alícuota.`
                        : `El fondo de reserva está completo (${fmt(resumen.fondoMeta)}): no se cobra este mes.`
                      : 'Cada apartamento paga su alícuota de los gastos, más sus propios cargos.'}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 bg-kcard/50 hover:bg-kcard text-slate-300 border border-slate-800 py-3.5 rounded-xl font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!resumen || resumen.totalAFacturar === 0}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuar
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-kcard/30 border border-amber-500/30 p-5 rounded-2xl mb-6 text-center">
                <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                <h3 className="text-amber-400 font-bold text-lg mb-2">¿Estás completamente seguro?</h3>
                <p className="text-amber-200/70 text-sm">
                  Esta acción generará deudas reales a todos los propietarios del edificio y no se puede deshacer de forma automática.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  disabled={isEmitting}
                  className="flex-1 bg-kcard/50 hover:bg-kcard text-slate-300 border border-slate-800 py-3.5 rounded-xl font-semibold transition-colors disabled:opacity-50"
                >
                  Atrás
                </button>
                <button
                  onClick={confirmar}
                  disabled={isEmitting}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3.5 rounded-xl font-semibold transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isEmitting ? 'Emitiendo...' : 'Sí, Emitir Ahora'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
