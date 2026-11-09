import { useEffect, useMemo, useState } from 'react';
import { Ban, Building2, Gavel, Home, Loader2, PartyPopper, Plus, Receipt, Undo2, X } from 'lucide-react';
import { AuthService } from '../../services/auth.service';
import {
  AjusteService,
  CATEGORIAS_AJUSTE,
  type Ajuste,
  type AplicarAjuste,
  type CategoriaAjuste,
} from '../../services/ajuste.service';
import { useMoneda } from '../moneda/MonedaContext';

interface Props {
  codigoEdificio: string;
}

const ICONOS: Record<CategoriaAjuste, typeof Gavel> = {
  multa: Gavel,
  alquiler_salon: PartyPopper,
  gasto_extra: Receipt,
  otro: Receipt,
  devolucion: Undo2,
};

/** Multas, cargos extra a un apartamento y devoluciones por cobros en exceso. */
export function AjustesSection({ codigoEdificio }: Props) {
  const { fmt, simbolo, moneda } = useMoneda();
  const [ajustes, setAjustes] = useState<Ajuste[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<'pendiente' | 'aplicado' | 'todos'>('pendiente');
  const [modalAbierto, setModalAbierto] = useState(false);

  const cargar = async () => {
    setCargando(true);
    setAjustes(await AjusteService.getAjustes(codigoEdificio));
    setCargando(false);
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigoEdificio]);

  // Los ajustes de todo el edificio se muestran agrupados en una sola fila
  const filas = useMemo(() => {
    const visibles = ajustes.filter((a) => filtro === 'todos' || a.estado === filtro);
    const grupos = new Map<string, { base: Ajuste; total: number; aptos: number }>();
    const sueltos: { base: Ajuste; total: number; aptos: number }[] = [];
    visibles.forEach((a) => {
      if (a.grupo) {
        const g = grupos.get(a.grupo);
        if (g) {
          g.total += Number(a.monto);
          g.aptos += 1;
        } else grupos.set(a.grupo, { base: a, total: Number(a.monto), aptos: 1 });
      } else sueltos.push({ base: a, total: Number(a.monto), aptos: 1 });
    });
    return [...grupos.values(), ...sueltos].sort((x, y) => y.base.created_at.localeCompare(x.base.created_at));
  }, [ajustes, filtro]);

  const pendientesCargos = ajustes.filter((a) => a.estado === 'pendiente' && a.tipo === 'cargo').reduce((s, a) => s + Number(a.monto), 0);
  const pendientesCreditos = ajustes.filter((a) => a.estado === 'pendiente' && a.tipo === 'credito').reduce((s, a) => s + Number(a.monto), 0);

  const anular = async (a: Ajuste) => {
    if (!window.confirm('¿Anular este ajuste? No se cobrará ni descontará en el próximo recibo.')) return;
    const r = await AjusteService.anular(a);
    if (!r.exito) alert(r.mensaje);
    cargar();
  };

  return (
    <section>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
          <Gavel className="w-5 h-5" />
          Cargos, Multas y Devoluciones
        </h2>
        <button
          onClick={() => setModalAbierto(true)}
          className="bg-slate-100 hover:bg-white text-slate-900 px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" /> Registrar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-kcard/10 border border-slate-700 rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">Cargos por cobrar</p>
          <p className="text-xl font-bold text-orange-400">{fmt(pendientesCargos)}</p>
        </div>
        <div className="bg-kcard/10 border border-slate-700 rounded-2xl p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">Devoluciones por aplicar</p>
          <p className="text-xl font-bold text-emerald-400">{fmt(pendientesCreditos)}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-3 text-sm">
        {(['pendiente', 'aplicado', 'todos'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-4 py-1.5 rounded-full border transition-colors ${filtro === f ? 'bg-slate-100 text-slate-900 border-slate-100' : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}
          >
            {f === 'pendiente' ? 'Pendientes' : f === 'aplicado' ? 'Cobrados' : 'Todos'}
          </button>
        ))}
      </div>

      <div className="bg-kcard/10 border border-slate-700 rounded-2xl divide-y divide-slate-800 overflow-hidden">
        {cargando ? (
          <div className="p-6 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando...
          </div>
        ) : filas.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-sm">No hay ajustes en esta lista.</div>
        ) : (
          filas.map(({ base, total, aptos }) => {
            const Icono = ICONOS[base.categoria] || Receipt;
            const esCredito = base.tipo === 'credito';
            return (
              <div key={base.grupo || base.id} className="p-4 flex items-center gap-4">
                <div className={`p-2.5 rounded-xl shrink-0 ${esCredito ? 'bg-emerald-500/15' : 'bg-orange-500/15'}`}>
                  <Icono className={`w-5 h-5 ${esCredito ? 'text-emerald-400' : 'text-orange-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{base.concepto}</p>
                  <p className="text-xs text-slate-400 mt-0.5 flex flex-wrap gap-x-2">
                    <span>{CATEGORIAS_AJUSTE[base.categoria]?.label}</span>
                    <span>·</span>
                    <span>{base.grupo ? `Todo el edificio (${aptos} aptos)` : `Apto ${base.propietarios?.apartamento ?? ''}`}</span>
                    <span>·</span>
                    <span>{new Date(base.created_at).toLocaleDateString('es-VE')}</span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-bold ${esCredito ? 'text-emerald-400' : 'text-orange-400'}`}>
                    {esCredito ? '− ' : '+ '}
                    {fmt(total)}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mt-0.5">
                    {base.estado === 'pendiente' ? 'Próximo recibo' : base.aplicar === 'inmediato' ? 'Cobrado ya' : 'En recibo'}
                  </p>
                </div>
                {base.estado === 'pendiente' && (
                  <button onClick={() => anular(base)} title="Anular" className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg">
                    <Ban className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {modalAbierto && (
        <NuevoAjusteModal
          codigoEdificio={codigoEdificio}
          simbolo={simbolo}
          moneda={moneda}
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

function NuevoAjusteModal({
  codigoEdificio,
  simbolo,
  moneda,
  onClose,
  onGuardado,
}: {
  codigoEdificio: string;
  simbolo: string;
  moneda: 'USD' | 'EUR';
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [vecinos, setVecinos] = useState<any[]>([]);
  const [categoria, setCategoria] = useState<CategoriaAjuste>('multa');
  const [alcance, setAlcance] = useState<'apartamento' | 'edificio'>('apartamento');
  const [idPropietario, setIdPropietario] = useState<number | ''>('');
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [aplicar, setAplicar] = useState<AplicarAjuste>('proximo_recibo');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const esCredito = CATEGORIAS_AJUSTE[categoria].tipo === 'credito';

  useEffect(() => {
    AuthService.getDirectorioVecinos(codigoEdificio).then((d: any) => setVecinos(Array.isArray(d) ? d : []));
  }, [codigoEdificio]);

  // Las devoluciones normalmente son para todo el edificio (ej. cobro de más en agua y luz)
  useEffect(() => {
    if (esCredito) {
      setAlcance('edificio');
      setAplicar('proximo_recibo');
    }
  }, [esCredito]);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (alcance === 'apartamento' && !idPropietario) return setError('Selecciona el apartamento.');
    setGuardando(true);
    const r = await AjusteService.crear({
      codigo_edificio: codigoEdificio,
      categoria,
      concepto,
      monto: parseFloat(monto),
      id_propietario: alcance === 'apartamento' ? Number(idPropietario) : null,
      aplicar,
      moneda,
    });
    setGuardando(false);
    if (r.exito) {
      alert(r.mensaje);
      onGuardado();
    } else setError(r.mensaje);
  };

  const input =
    'w-full px-4 py-2.5 bg-kbg border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-slate-600 outline-none';

  const Opcion = ({ activo, onClick, icon: Icon, titulo, sub }: any) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 text-left p-3 rounded-xl border transition-colors ${activo ? 'border-slate-300 bg-slate-800' : 'border-slate-700 hover:border-slate-500'}`}
    >
      <div className="flex items-center gap-2 font-semibold text-sm text-white">
        <Icon className="w-4 h-4" /> {titulo}
      </div>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </button>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={guardar}
        className="relative bg-kcard rounded-3xl w-full max-w-lg shadow-lg overflow-hidden flex flex-col max-h-full border border-slate-700"
      >
        <div className="bg-kbg border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
          <h3 className="text-white text-lg font-semibold">Registrar cargo o devolución</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-slate-800">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">Tipo</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaAjuste)} className={input}>
              <optgroup label="Cargos (aumentan la deuda)">
                <option value="multa">Multa (uso indebido de áreas, normas, etc.)</option>
                <option value="alquiler_salon">Alquiler de salón de fiestas</option>
                <option value="gasto_extra">Gasto extra</option>
                <option value="otro">Otro cargo</option>
              </optgroup>
              <optgroup label="Créditos (disminuyen la deuda)">
                <option value="devolucion">Devolución / cobro en exceso</option>
              </optgroup>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">¿A quién?</label>
            <div className="flex gap-2">
              <Opcion
                activo={alcance === 'apartamento'}
                onClick={() => setAlcance('apartamento')}
                icon={Home}
                titulo="Un apartamento"
                sub="Monto completo a ese apto"
              />
              <Opcion
                activo={alcance === 'edificio'}
                onClick={() => setAlcance('edificio')}
                icon={Building2}
                titulo="Todo el edificio"
                sub="Se reparte por alícuota"
              />
            </div>
          </div>

          {alcance === 'apartamento' && (
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Apartamento</label>
              <select
                value={idPropietario}
                onChange={(e) => setIdPropietario(e.target.value ? Number(e.target.value) : '')}
                className={input}
                required
              >
                <option value="">Selecciona...</option>
                {vecinos.map((v) => (
                  <option key={v.id_propietario} value={v.id_propietario}>
                    Apto {v.apartamento} — {v.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">Concepto</label>
            <input
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              required
              placeholder={esCredito ? 'Ej: Excedente cobrado en agua y luz de septiembre' : 'Ej: Alquiler salón 15/11 o Uso indebido del ascensor'}
              className={input}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">
              Monto {alcance === 'edificio' ? 'total a repartir' : ''} ({simbolo})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400">{simbolo}</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                className={`${input} pl-8`}
              />
            </div>
          </div>

          {!esCredito ? (
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">¿Cuándo se cobra?</label>
              <div className="flex gap-2">
                <Opcion
                  activo={aplicar === 'proximo_recibo'}
                  onClick={() => setAplicar('proximo_recibo')}
                  icon={Receipt}
                  titulo="En el próximo recibo"
                  sub="Sale como línea en la factura del mes"
                />
                <Opcion
                  activo={aplicar === 'inmediato'}
                  onClick={() => setAplicar('inmediato')}
                  icon={Gavel}
                  titulo="De inmediato"
                  sub="Recibo aparte que puede pagar ya"
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
              La devolución se descontará en el próximo recibo de cada apartamento. Si es mayor que el recibo, el excedente queda como saldo a favor.
            </p>
          )}

          {error && <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl">{error}</div>}
        </div>

        <div className="p-4 border-t border-slate-800 bg-kbg flex gap-3 shrink-0">
          <button type="button" onClick={onClose} className="flex-1 border border-slate-700 text-slate-300 py-3 rounded-xl font-semibold hover:bg-slate-800">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="flex-1 bg-slate-100 text-slate-900 hover:bg-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {guardando ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}
