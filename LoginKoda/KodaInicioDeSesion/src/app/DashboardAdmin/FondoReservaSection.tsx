import { useEffect, useState } from 'react';
import { Loader2, PiggyBank, Settings, TrendingDown, TrendingUp, X } from 'lucide-react';
import { FondoReservaService, faltanteFondo, type MovimientoFondo } from '../../services/edificio.service';
import { NotificacionService } from '../../services/notificacion.service';
import { useMoneda } from '../moneda/MonedaContext';

interface Props {
  codigoEdificio: string;
  /** Cambia este valor para forzar una recarga (ej. después de emitir recibos) */
  recargarClave?: number;
}

/** Saldo del fondo de reserva, uso del fondo y su historial. */
export function FondoReservaSection({ codigoEdificio, recargarClave = 0 }: Props) {
  const { config, fmt, simbolo, recargar } = useMoneda();
  const [movimientos, setMovimientos] = useState<MovimientoFondo[]>([]);
  const [modalAbierto, setModalAbierto] = useState(false);

  const meta = config.fondo_reserva_meta;
  const saldo = config.fondo_reserva_saldo;
  const faltante = faltanteFondo(config);
  const pct = meta > 0 ? Math.min(100, Math.round((saldo / meta) * 100)) : 0;

  const cargar = async () => {
    await recargar();
    setMovimientos(await FondoReservaService.getMovimientos(codigoEdificio, 8));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoEdificio, recargarClave]);

  const icono = (m: MovimientoFondo) =>
    m.tipo === 'uso' ? (
      <TrendingDown className="w-5 h-5 text-orange-400" />
    ) : m.tipo === 'reposicion' ? (
      <TrendingUp className="w-5 h-5 text-emerald-400" />
    ) : (
      <Settings className="w-5 h-5 text-slate-400" />
    );

  return (
    <section>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
          <PiggyBank className="w-5 h-5" /> Fondo de Reserva
        </h2>
        <button
          onClick={() => setModalAbierto(true)}
          disabled={saldo <= 0}
          className="bg-slate-100 hover:bg-white text-slate-900 px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <TrendingDown className="w-4 h-4" /> Usar fondo de reserva
        </button>
      </div>

      <div className="bg-kcard/10 border border-slate-700 rounded-2xl p-5 space-y-4">
        {meta <= 0 ? (
          <p className="text-sm text-slate-400">
            Este edificio todavía no tiene un fondo de reserva configurado. Defínelo en Menú → Configuración → Configuración de cobro.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm text-slate-400">Saldo actual</p>
                <p className="text-3xl font-bold text-white">{fmt(saldo)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400">Meta</p>
                <p className="text-lg font-semibold text-blue-400">{fmt(meta)}</p>
              </div>
            </div>
            <div className="h-2.5 bg-kbg border border-slate-800 rounded-full overflow-hidden" aria-label={`Fondo al ${pct}%`}>
              <div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
            </div>
            <p className={`text-sm ${faltante > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {faltante > 0
                ? `Faltan ${fmt(faltante)} para completar el fondo. Se cobrarán en el próximo recibo, repartidos por alícuota.`
                : 'El fondo está completo: no se cobra nada por fondo de reserva.'}
            </p>
          </>
        )}

        {movimientos.length > 0 && (
          <div className="border-t border-slate-800 pt-3">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Últimos movimientos</p>
            <ul className="divide-y divide-slate-800">
              {movimientos.map((m) => (
                <li key={m.id} className="py-2.5 flex items-center gap-3">
                  {icono(m)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{m.concepto}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(m.created_at).toLocaleDateString('es-VE')} · saldo {fmt(Number(m.saldo_resultante))}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold ${Number(m.monto) < 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                    {Number(m.monto) < 0 ? '− ' : '+ '}
                    {fmt(Math.abs(Number(m.monto)))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {modalAbierto && (
        <UsarFondoModal
          codigoEdificio={codigoEdificio}
          saldo={saldo}
          simbolo={simbolo}
          fmt={fmt}
          onClose={() => setModalAbierto(false)}
          onGuardado={() => {
            setModalAbierto(false);
            cargar();
          }}
        />
      )}
    </section>
  );
}

function UsarFondoModal({
  codigoEdificio,
  saldo,
  simbolo,
  fmt,
  onClose,
  onGuardado,
}: {
  codigoEdificio: string;
  saldo: number;
  simbolo: string;
  fmt: (n: number) => string;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [monto, setMonto] = useState('');
  const [concepto, setConcepto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const montoNum = Number(monto);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!montoNum || montoNum <= 0) return setError('Escribe un monto mayor a 0.');
    if (montoNum > saldo) return setError(`El fondo solo tiene ${fmt(saldo)} disponibles.`);
    setGuardando(true);
    const r = await FondoReservaService.usar(codigoEdificio, montoNum, concepto);
    setGuardando(false);
    if (!r.exito) return setError(r.mensaje);
    // Aviso a los vecinos (solo en la app): sabrán por qué el próximo recibo trae reposición del fondo
    await NotificacionService.crear({
      codigo_edificio: codigoEdificio,
      tipo: 'cobro',
      titulo: 'Uso del fondo de reserva',
      mensaje: `Se usaron ${fmt(montoNum)} del fondo de reserva para: ${concepto.trim()}. Se repondrán en el próximo recibo según tu alícuota.`,
      destinatario: 'usuarios',
      enviar_correo: false,
    });
    onGuardado();
  };

  const input = 'w-full px-4 py-2.5 bg-kbg border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-slate-600 outline-none';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={guardar} className="relative bg-kcard rounded-3xl w-full max-w-md shadow-lg overflow-hidden border border-slate-700">
        <div className="bg-kbg border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <h3 className="text-white text-lg font-semibold">Usar fondo de reserva</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-slate-800">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-400">
            Disponible: <span className="font-semibold text-white">{fmt(saldo)}</span>. Lo que uses se cobrará en el próximo recibo para
            reponer el fondo.
          </p>
          <div>
            <label htmlFor="fondo-concepto" className="block text-sm font-medium text-slate-200 mb-1">
              ¿En qué se usó?
            </label>
            <input
              id="fondo-concepto"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              required
              placeholder="Ej: Reparación de emergencia de la bomba de agua"
              className={input}
            />
          </div>
          <div>
            <label htmlFor="fondo-monto" className="block text-sm font-medium text-slate-200 mb-1">
              Monto ({simbolo})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400">{simbolo}</span>
              <input
                id="fondo-monto"
                type="number"
                step="0.01"
                min="0.01"
                max={saldo}
                required
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                className={`${input} pl-8`}
              />
            </div>
          </div>
          {error && <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl">{error}</div>}
        </div>
        <div className="p-4 border-t border-slate-800 bg-kbg flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 border border-slate-700 text-slate-300 py-3 rounded-xl font-semibold hover:bg-slate-800">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="flex-1 bg-slate-100 text-slate-900 hover:bg-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {guardando ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Registrar uso'}
          </button>
        </div>
      </form>
    </div>
  );
}
