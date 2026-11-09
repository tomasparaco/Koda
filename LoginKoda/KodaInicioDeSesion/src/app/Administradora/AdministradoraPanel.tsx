import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, ArrowRight, Bell, Building2, ChevronDown, ChevronUp, Home, Loader2, LogOut, RefreshCw,
  Search, Send, Settings2, Users, Wallet,
} from 'lucide-react';
import {
  AdministradoraService, type EdificioAdministrado, type MorosoResumen, type ResumenEdificio,
} from '../../services/administradora.service';
import { NotificacionService } from '../../services/notificacion.service';
import { bcvService, type Moneda } from '../../services/bcv.service';
import { formatBs, formatMonto } from '../../lib/money';
import { ThemeToggle } from '../theme/ThemeContext';
import { ConfigCobro } from '../DashboardAdmin/ConfigCobro';

interface Props {
  edificios: EdificioAdministrado[];
  onGestionar: (codigoEdificio: string) => void;
  onLogout: () => void;
  /** Si además es propietaria/junta en algún edificio, puede volver a ese selector */
  onIrAMisPropiedades?: () => void;
  onEdificiosActualizados?: () => void;
}

export default function AdministradoraPanel({ edificios, onGestionar, onLogout, onIrAMisPropiedades, onEdificiosActualizados }: Props) {
  const [resumen, setResumen] = useState<ResumenEdificio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [tasas, setTasas] = useState<Record<Moneda, number>>({ USD: 0, EUR: 0 });
  const [busqueda, setBusqueda] = useState('');
  const [filtroEdificio, setFiltroEdificio] = useState<string>('todos');
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  const [configAbierta, setConfigAbierta] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<Record<number, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  const cargar = async () => {
    setCargando(true);
    setResumen(await AdministradoraService.getResumen(edificios));
    setCargando(false);
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edificios]);

  useEffect(() => {
    Promise.all([bcvService.getLatestRate('USD'), bcvService.getLatestRate('EUR')]).then(([u, e]) =>
      setTasas({ USD: u.rate, EUR: e.rate })
    );
  }, []);

  const totales = useMemo(() => {
    const deuda: Record<Moneda, number> = { USD: 0, EUR: 0 };
    let bs = 0;
    let morosos = 0;
    let pagos = 0;
    resumen.forEach((r) => {
      deuda[r.edificio.moneda_cobro] += r.deudaTotal;
      bs += r.deudaTotal * (tasas[r.edificio.moneda_cobro] || 0);
      morosos += r.morosos.length;
      pagos += r.pagosPorConciliar;
    });
    return { deuda, bs, morosos, pagos };
  }, [resumen, tasas]);

  const resultadosBusqueda = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return [];
    return resumen
      .flatMap((r) => r.morosos.map((m) => ({ ...m, edificio: r.edificio })))
      .filter((m) => m.nombre?.toLowerCase().includes(q) || m.apartamento?.toLowerCase().includes(q));
  }, [busqueda, resumen]);

  const recordar = async (m: MorosoResumen, moneda: Moneda) => {
    setEnviando((p) => ({ ...p, [m.id_propietario]: true }));
    await NotificacionService.crear({
      codigo_edificio: m.codigo_edificio,
      tipo: 'cobro',
      titulo: 'Recordatorio de saldo pendiente',
      mensaje: `Hola ${m.nombre}, te recordamos que tienes un saldo pendiente de ${formatMonto(m.deuda, moneda)}. Agradecemos que puedas ponerte al día lo antes posible.`,
      destinatario: m.apartamento,
    });
    setEnviando((p) => ({ ...p, [m.id_propietario]: false }));
    setToast(`Recordatorio enviado a ${m.nombre} (Apto ${m.apartamento})`);
    setTimeout(() => setToast(null), 3500);
  };

  const visibles = resumen.filter((r) => filtroEdificio === 'todos' || r.codigo_edificio === filtroEdificio);

  const FilaMoroso = ({ m, moneda, mostrarEdificio }: { m: MorosoResumen; moneda: Moneda; mostrarEdificio?: string }) => (
    <div className="flex items-center gap-3 py-3">
      <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
        <span className="text-red-400 font-bold text-sm">{m.apartamento}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white truncate">{m.nombre}</p>
        <p className="text-xs text-slate-400">
          {mostrarEdificio ? `${mostrarEdificio} · ` : ''}
          {m.meses} mes{m.meses !== 1 ? 'es' : ''} pendiente{m.meses !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold text-red-400">{formatMonto(m.deuda, moneda)}</p>
        <p className="text-[11px] text-slate-500">{tasas[moneda] > 0 ? formatBs(m.deuda * tasas[moneda]) : ''}</p>
      </div>
      <button
        onClick={() => recordar(m, moneda)}
        disabled={enviando[m.id_propietario]}
        title="Enviar recordatorio (app + correo)"
        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {enviando[m.id_propietario] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-kbg text-white pb-16">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-kbg/90 backdrop-blur-md border-b border-slate-800">
        <div className="flex items-center justify-between p-4 max-w-5xl mx-auto">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Kuota</h1>
            <p className="text-xs font-medium text-slate-400">Panel de Administración · {edificios.length} edificio{edificios.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={cargar} title="Actualizar" className="p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-200">
              <RefreshCw className={`w-5 h-5 ${cargando ? 'animate-spin' : ''}`} />
            </button>
            <ThemeToggle />
            {onIrAMisPropiedades && (
              <button onClick={onIrAMisPropiedades} title="Mis apartamentos" className="p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-200">
                <Home className="w-5 h-5" />
              </button>
            )}
            <button onClick={onLogout} title="Cerrar sesión" className="p-2 rounded-xl text-red-500 hover:bg-red-500/10">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
        {/* Totales */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-kcard/40 border border-slate-800 rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Por cobrar</p>
            <p className="text-xl font-bold text-red-400 mt-1">
              {totales.deuda.USD > 0 || totales.deuda.EUR === 0 ? formatMonto(totales.deuda.USD, 'USD') : ''}
              {totales.deuda.USD > 0 && totales.deuda.EUR > 0 ? ' + ' : ''}
              {totales.deuda.EUR > 0 ? formatMonto(totales.deuda.EUR, 'EUR') : ''}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">{totales.bs > 0 ? `≈ ${formatBs(totales.bs)}` : ''}</p>
          </div>
          <div className="bg-kcard/40 border border-slate-800 rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Morosos</p>
            <p className="text-xl font-bold text-white mt-1">{totales.morosos}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">en todos los edificios</p>
          </div>
          <div className="bg-kcard/40 border border-slate-800 rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><Bell className="w-3.5 h-3.5" /> Pagos por conciliar</p>
            <p className={`text-xl font-bold mt-1 ${totales.pagos > 0 ? 'text-amber-400' : 'text-white'}`}>{totales.pagos}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">esperando aprobación</p>
          </div>
          <div className="bg-kcard/40 border border-slate-800 rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wider text-slate-400">Tasas BCV hoy</p>
            <p className="text-sm font-semibold text-white mt-1.5">$ {tasas.USD > 0 ? tasas.USD.toLocaleString('es-VE', { maximumFractionDigits: 2 }) : '—'}</p>
            <p className="text-sm font-semibold text-white">€ {tasas.EUR > 0 ? tasas.EUR.toLocaleString('es-VE', { maximumFractionDigits: 2 }) : '—'}</p>
          </div>
        </section>

        {/* Búsqueda global */}
        <section className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar moroso por nombre o apartamento en todos los edificios..."
              className="w-full pl-10 pr-4 py-3 bg-kcard/40 border border-slate-800 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-slate-600 outline-none"
            />
          </div>
          <select
            value={filtroEdificio}
            onChange={(e) => setFiltroEdificio(e.target.value)}
            className="px-4 py-3 bg-kcard/40 border border-slate-800 rounded-xl text-white outline-none"
          >
            <option value="todos">Todos los edificios</option>
            {resumen.map((r) => (
              <option key={r.codigo_edificio} value={r.codigo_edificio}>
                {r.edificio.descripcion}
              </option>
            ))}
          </select>
        </section>

        {busqueda.trim() && (
          <section className="bg-kcard/40 border border-slate-800 rounded-2xl px-4 divide-y divide-slate-800">
            {resultadosBusqueda.length === 0 ? (
              <p className="py-6 text-center text-slate-400 text-sm">Nadie con deuda coincide con "{busqueda}".</p>
            ) : (
              resultadosBusqueda.map((m) => (
                <FilaMoroso key={m.id_propietario} m={m} moneda={m.edificio.moneda_cobro} mostrarEdificio={m.edificio.descripcion} />
              ))
            )}
          </section>
        )}

        {/* Edificios */}
        {cargando && resumen.length === 0 ? (
          <div className="py-16 flex items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" /> Cargando edificios...
          </div>
        ) : (
          <section className="grid gap-4">
            {visibles.map((r) => {
              const moneda = r.edificio.moneda_cobro;
              const pctSolvencia = r.totalAptos > 0 ? Math.round((r.aptosSolventes / r.totalAptos) * 100) : 100;
              const abierto = !!abiertos[r.codigo_edificio];
              return (
                <article key={r.codigo_edificio} className="bg-kcard border border-slate-800 rounded-3xl overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="bg-kbg border border-slate-700 p-3 rounded-2xl shrink-0">
                          <Building2 className="w-6 h-6 text-slate-300" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="font-bold text-lg text-white truncate">{r.edificio.descripcion}</h2>
                          <p className="text-xs text-slate-400 truncate">
                            {r.codigo_edificio}
                            {r.edificio.direccion ? ` · ${r.edificio.direccion}` : ''}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border border-slate-700 text-slate-300">
                        Cobra en {moneda === 'EUR' ? '€ EUR' : '$ USD'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mt-5">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-slate-500">Deuda total</p>
                        <p className="font-bold text-red-400">{formatMonto(r.deudaTotal, moneda)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-slate-500">Morosos</p>
                        <p className="font-bold text-white">
                          {r.morosos.length} <span className="text-slate-500 font-normal text-sm">/ {r.totalAptos}</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-slate-500">Por conciliar</p>
                        <p className={`font-bold ${r.pagosPorConciliar > 0 ? 'text-amber-400' : 'text-white'}`}>{r.pagosPorConciliar}</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Solvencia</span>
                        <span>{pctSolvencia}%</span>
                      </div>
                      <div className="h-2 bg-kbg border border-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pctSolvencia >= 80 ? 'bg-emerald-500' : pctSolvencia >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${pctSolvencia}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-5">
                      <button
                        onClick={() => onGestionar(r.codigo_edificio)}
                        className="flex-1 min-w-[160px] bg-slate-100 text-slate-900 hover:bg-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2"
                      >
                        Gestionar edificio <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setAbiertos((p) => ({ ...p, [r.codigo_edificio]: !abierto }))}
                        className="flex-1 min-w-[140px] border border-slate-700 text-slate-200 hover:bg-slate-800 font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2"
                      >
                        {abierto ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />} Quién debe
                      </button>
                      <button
                        onClick={() => setConfigAbierta(configAbierta === r.codigo_edificio ? null : r.codigo_edificio)}
                        title="Moneda y fondo de reserva"
                        className="border border-slate-700 text-slate-300 hover:bg-slate-800 p-2.5 rounded-xl"
                      >
                        <Settings2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {configAbierta === r.codigo_edificio && (
                    <div className="px-5 pb-5">
                      <ConfigCobro
                        compacto
                        codigoEdificio={r.codigo_edificio}
                        config={r.edificio}
                        onGuardado={() => {
                          onEdificiosActualizados?.();
                        }}
                      />
                    </div>
                  )}

                  {abierto && (
                    <div className="border-t border-slate-800 bg-kbg/40 px-5 divide-y divide-slate-800">
                      {r.morosos.length === 0 ? (
                        <p className="py-6 text-center text-emerald-400 text-sm font-medium">¡Todos los apartamentos están solventes!</p>
                      ) : (
                        r.morosos.map((m) => <FilaMoroso key={m.id_propietario} m={m} moneda={moneda} />)
                      )}
                    </div>
                  )}
                </article>
              );
            })}
            {visibles.length === 0 && (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                No hay edificios asignados a tu usuario.
              </div>
            )}
          </section>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold">
          {toast}
        </div>
      )}
    </div>
  );
}
