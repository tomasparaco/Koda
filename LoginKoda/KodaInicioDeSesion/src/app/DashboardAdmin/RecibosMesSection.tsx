import { useEffect, useMemo, useState } from 'react';
import { FileText, Printer, Search, X, Loader2, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatMonto, redondear } from '../../lib/money';
import { useMoneda } from '../moneda/MonedaContext';
import type { Moneda } from '../../services/bcv.service';

interface GastoMes {
  descripcion: string;
  monto: number;
}

interface ReciboFila {
  id_recibo: number;
  id_propietario: number;
  periodo: string;
  monto_alicuota: number;
  fondo_reserva: number;
  monto_cargos: number;
  monto_creditos: number;
  monto_total: number;
  moneda?: Moneda;
  tipo?: string;
  concepto?: string | null;
  fecha_emision?: string;
  estado?: string;
  propietarios: { apartamento: string; nombre: string; alicuota: number; codigo_edificio: string; rol?: string };
  pagos?: { monto: number; estado: string }[];
}

interface AjusteFila {
  id: number;
  id_recibo: number;
  tipo: 'cargo' | 'credito';
  concepto: string;
  monto: number;
}

interface Props {
  codigoEdificio: string;
  mes: Date;
  gastos: GastoMes[];
  recargarClave?: number;
}

const esc = (t: unknown) =>
  String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const nombreMes = (d: Date) => {
  const t = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

const pagado = (r: ReciboFila) =>
  redondear((r.pagos || []).filter((p) => p.estado === 'aprobado').reduce((s, p) => s + Number(p.monto || 0), 0));

const estadoDe = (r: ReciboFila): 'pagado' | 'abonado' | 'pendiente' => {
  if (String(r.estado).toLowerCase() === 'pagado') return 'pagado';
  return pagado(r) > 0 ? 'abonado' : 'pendiente';
};

/**
 * HTML del recibo de un apartamento, solo con estilos en línea:
 * así se ve igual en pantalla, en cualquier tema y al imprimir.
 */
function reciboHTML(r: ReciboFila, ajustes: AjusteFila[], gastos: GastoMes[], edificio: string, mes: Date, tasa: number, monedaEdificio: Moneda) {
  const moneda = (r.moneda || monedaEdificio) as Moneda;
  const f = (n: number) => esc(formatMonto(Number(n) || 0, moneda));
  const extra = r.tipo === 'extra';
  const totalGastos = gastos.reduce((s, g) => s + Number(g.monto || 0), 0);
  const fila = (izq: string, der: string, color = '#374151', peso = 500) =>
    `<div style="display:flex;justify-content:space-between;font-size:14px;color:${color};margin-bottom:6px"><span>${izq}</span><span style="font-weight:${peso}">${der}</span></div>`;

  const lineasAjuste = ajustes.length
    ? ajustes
        .map((a) =>
          a.tipo === 'credito'
            ? fila(`Devolución: ${esc(a.concepto)}`, `− ${f(a.monto)}`, '#047857')
            : fila(`Cargo: ${esc(a.concepto)}`, `+ ${f(a.monto)}`, '#9a3412'),
        )
        .join('')
    : (Number(r.monto_cargos) > 0 ? fila('Cargos extra:', `+ ${f(r.monto_cargos)}`, '#9a3412') : '') +
      (Number(r.monto_creditos) > 0 ? fila('Devoluciones:', `− ${f(r.monto_creditos)}`, '#047857') : '');

  const tablaGastos = extra
    ? ''
    : `<div style="margin-bottom:24px">
        <h3 style="font-size:16px;font-weight:700;color:#111827;border-bottom:2px solid #bfdbfe;padding-bottom:4px;margin:0 0 12px">Desglose de Gastos del Edificio</h3>
        ${
          gastos.length === 0
            ? '<p style="font-size:14px;font-style:italic;color:#6b7280;margin:0">No hay gastos registrados en este mes.</p>'
            : `<table style="width:100%;border-collapse:collapse;font-size:14px">
                <thead><tr style="text-align:left;text-transform:uppercase;font-size:12px;color:#6b7280;border-bottom:1px solid #e5e7eb">
                  <th style="padding:8px 0">Descripción del gasto</th><th style="padding:8px 0;text-align:right">Monto (${moneda})</th></tr></thead>
                <tbody>${gastos
                  .map(
                    (g) =>
                      `<tr style="border-bottom:1px solid #f3f4f6"><td style="padding:8px 0;color:#374151">${esc(g.descripcion)}</td><td style="padding:8px 0;text-align:right;font-weight:500;color:#000">${f(g.monto)}</td></tr>`,
                  )
                  .join('')}</tbody>
                <tfoot><tr style="font-weight:700;background:#f9fafb;color:#000"><td style="padding:8px">Total del edificio</td><td style="padding:8px;text-align:right">${f(totalGastos)}</td></tr></tfoot>
              </table>`
        }
      </div>`;

  const abonado = pagado(r);
  const est = estadoDe(r);
  const sello =
    est === 'pagado'
      ? '<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:#dcfce7;color:#166534;font-size:12px;font-weight:700">PAGADO</span>'
      : est === 'abonado'
        ? '<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:#fef9c3;color:#854d0e;font-size:12px;font-weight:700">ABONADO</span>'
        : '<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:#fee2e2;color:#991b1b;font-size:12px;font-weight:700">PENDIENTE</span>';

  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#fff;color:#1f2937;padding:32px;max-width:672px;margin:0 auto">
    <div style="text-align:center;margin-bottom:24px">
      <h2 style="font-size:24px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#000;margin:0">${extra ? 'Cargo Extraordinario' : 'Aviso de Cobro'}</h2>
      <p style="font-size:14px;color:#4b5563;margin:4px 0 0">Condominio ${esc(edificio)}</p>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:14px;border-bottom:1px solid #e5e7eb;padding-bottom:16px;margin-bottom:16px;gap:16px">
      <div>
        <p style="margin:0 0 4px"><strong style="color:#000">Apto:</strong> ${esc(r.propietarios.apartamento)}</p>
        <p style="margin:0 0 4px"><strong style="color:#000">Propietario:</strong> ${esc(r.propietarios.nombre)}</p>
        <p style="margin:0"><strong style="color:#000">Recibo N°:</strong> ${r.id_recibo} ${sello}</p>
      </div>
      <div style="text-align:right">
        <p style="margin:0 0 4px"><strong style="color:#000">Fecha de emisión:</strong> ${r.fecha_emision ? esc(new Date(r.fecha_emision + 'T00:00:00').toLocaleDateString('es-VE')) : '—'}</p>
        <p style="margin:0"><strong style="color:#000">Mes facturado:</strong> ${esc(nombreMes(mes))}</p>
      </div>
    </div>
    ${tablaGastos}
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px;margin-bottom:8px">
      ${extra ? fila('Concepto:', esc(r.concepto || 'Cargo extra'), '#374151', 700) : fila('Su alícuota correspondiente:', `${Number(r.propietarios.alicuota || 0).toFixed(2)}%`, '#374151', 700)}
      ${extra ? '' : fila('Cuota de gastos comunes:', f(r.monto_alicuota))}
      ${Number(r.fondo_reserva) > 0 ? fila('Reposición del fondo de reserva:', f(r.fondo_reserva)) : ''}
      ${lineasAjuste}
      <div style="display:flex;justify-content:space-between;font-weight:700;font-size:20px;border-top:1px solid #93c5fd;padding-top:12px;margin-top:8px;color:#1e3a8a">
        <span>Total a pagar (${moneda}):</span><span>${f(r.monto_total)}</span>
      </div>
      ${abonado > 0 && est !== 'pagado' ? fila('Abonado:', `− ${f(abonado)}`, '#047857') + fila('Saldo del recibo:', f(Math.max(0, Number(r.monto_total) - abonado)), '#991b1b', 700) : ''}
      ${tasa > 0 && moneda === monedaEdificio ? fila(`Equivalente en Bs (tasa BCV ${moneda} ${tasa.toLocaleString('es-VE', { minimumFractionDigits: 2 })}):`, esc('Bs. ' + (Number(r.monto_total) * tasa).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })), '#4b5563') : ''}
    </div>
    <p style="text-align:center;font-size:12px;color:#9ca3af;margin-top:32px">Este es un documento generado automáticamente por el sistema Kuota.</p>
  </div>`;
}

function imprimir(titulo: string, cuerpo: string) {
  const w = window.open('', '', 'width=850,height=950');
  if (!w) {
    alert('Permite las ventanas emergentes (pop-ups) en tu navegador para imprimir o guardar el recibo en PDF.');
    return;
  }
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
    <style>body{margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}.salto{page-break-after:always;break-after:page}.salto:last-child{page-break-after:auto;break-after:auto}</style>
    </head><body>${cuerpo}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

/** Recibos de condominio emitidos en el mes seleccionado, con el recibo completo de cada apartamento. */
export function RecibosMesSection({ codigoEdificio, mes, gastos, recargarClave }: Props) {
  const { fmt, tasa, config, moneda } = useMoneda();
  const [recibos, setRecibos] = useState<ReciboFila[]>([]);
  const [ajustes, setAjustes] = useState<AjusteFila[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'pendiente' | 'pagado'>('todos');
  const [abierto, setAbierto] = useState<ReciboFila | null>(null);

  const edificio = config.descripcion || codigoEdificio;
  const y = mes.getFullYear();
  const m = mes.getMonth();

  useEffect(() => {
    let vigente = true;
    (async () => {
      setCargando(true);
      setError('');
      const desde = `${y}-${String(m + 1).padStart(2, '0')}-01`;
      const sig = new Date(y, m + 1, 1);
      const hasta = `${sig.getFullYear()}-${String(sig.getMonth() + 1).padStart(2, '0')}-01`;
      const { data, error: err } = await supabase
        .from('recibos')
        .select('*, propietarios!inner(apartamento, nombre, alicuota, codigo_edificio, rol), pagos(monto, estado)')
        .eq('propietarios.codigo_edificio', codigoEdificio)
        .gte('periodo', desde)
        .lt('periodo', hasta);
      if (!vigente) return;
      if (err) {
        setError('No se pudieron cargar los recibos de este mes.');
        setRecibos([]);
        setAjustes([]);
        setCargando(false);
        return;
      }
      const lista = ((data || []) as ReciboFila[]).sort((a, b) =>
        (a.tipo === 'extra' ? 1 : 0) - (b.tipo === 'extra' ? 1 : 0) ||
        String(a.propietarios.apartamento).localeCompare(String(b.propietarios.apartamento), 'es', { numeric: true }),
      );
      setRecibos(lista);
      const ids = lista.map((r) => r.id_recibo);
      if (ids.length) {
        const { data: aj } = await supabase.from('ajustes').select('id, id_recibo, tipo, concepto, monto').in('id_recibo', ids).neq('estado', 'anulado');
        if (vigente) setAjustes((aj || []) as AjusteFila[]);
      } else setAjustes([]);
      if (vigente) setCargando(false);
    })();
    return () => {
      vigente = false;
    };
  }, [codigoEdificio, y, m, recargarClave]);

  const ajustesDe = (id: number) => ajustes.filter((a) => a.id_recibo === id);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return recibos.filter((r) => {
      if (filtro === 'pagado' && estadoDe(r) !== 'pagado') return false;
      if (filtro === 'pendiente' && estadoDe(r) === 'pagado') return false;
      if (!q) return true;
      return r.propietarios.apartamento.toLowerCase().includes(q) || r.propietarios.nombre.toLowerCase().includes(q);
    });
  }, [recibos, busqueda, filtro]);

  const tot = useMemo(() => {
    const t = { facturado: 0, cobrado: 0, fondo: 0, cargos: 0, creditos: 0, pagados: 0 };
    recibos.forEach((r) => {
      t.facturado += Number(r.monto_total || 0);
      t.cobrado += Math.min(Number(r.monto_total || 0), estadoDe(r) === 'pagado' ? Number(r.monto_total || 0) : pagado(r));
      t.fondo += Number(r.fondo_reserva || 0);
      t.cargos += Number(r.monto_cargos || 0);
      t.creditos += Number(r.monto_creditos || 0);
      if (estadoDe(r) === 'pagado') t.pagados++;
    });
    return t;
  }, [recibos]);

  const html = (r: ReciboFila) => reciboHTML(r, ajustesDe(r.id_recibo), gastos, edificio, mes, tasa, moneda);

  const resumenHTML = () => {
    const f = (n: number) => esc(fmt(n));
    return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1f2937;padding:32px;max-width:900px;margin:0 auto">
      <h2 style="margin:0;font-size:22px;text-transform:uppercase;letter-spacing:.05em;color:#000">Relación de recibos</h2>
      <p style="margin:4px 0 20px;color:#4b5563">${esc(edificio)} · ${esc(nombreMes(mes))}</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="background:#f1f5f9;text-align:left">
          ${['Apto', 'Propietario', 'Alícuota', 'Gastos comunes', 'Fondo', 'Cargos', 'Devol.', 'Total', 'Estado'].map((h, i) => `<th style="padding:8px;${i > 1 ? 'text-align:right' : ''}">${h}</th>`).join('')}
        </tr></thead>
        <tbody>${recibos
          .map(
            (r) => `<tr style="border-bottom:1px solid #e5e7eb">
            <td style="padding:7px 8px;font-weight:600">${esc(r.propietarios.apartamento)}${r.tipo === 'extra' ? ' (extra)' : ''}</td>
            <td style="padding:7px 8px">${esc(r.propietarios.nombre)}</td>
            <td style="padding:7px 8px;text-align:right">${Number(r.propietarios.alicuota || 0).toFixed(2)}%</td>
            <td style="padding:7px 8px;text-align:right">${f(r.monto_alicuota)}</td>
            <td style="padding:7px 8px;text-align:right">${f(r.fondo_reserva)}</td>
            <td style="padding:7px 8px;text-align:right">${f(r.monto_cargos)}</td>
            <td style="padding:7px 8px;text-align:right">${f(r.monto_creditos)}</td>
            <td style="padding:7px 8px;text-align:right;font-weight:700">${f(r.monto_total)}</td>
            <td style="padding:7px 8px;text-align:right;text-transform:capitalize">${estadoDe(r)}</td></tr>`,
          )
          .join('')}</tbody>
        <tfoot><tr style="font-weight:700;background:#f9fafb">
          <td style="padding:8px" colspan="3">Totales (${recibos.length} recibos)</td>
          <td style="padding:8px;text-align:right">${f(recibos.reduce((s, r) => s + Number(r.monto_alicuota || 0), 0))}</td>
          <td style="padding:8px;text-align:right">${f(tot.fondo)}</td>
          <td style="padding:8px;text-align:right">${f(tot.cargos)}</td>
          <td style="padding:8px;text-align:right">${f(tot.creditos)}</td>
          <td style="padding:8px;text-align:right">${f(tot.facturado)}</td>
          <td style="padding:8px;text-align:right">${tot.pagados}/${recibos.length} pagados</td></tr></tfoot>
      </table>
    </div>`;
  };

  const imprimirTodo = () =>
    imprimir(
      `Recibos_${edificio}_${nombreMes(mes)}`,
      `<div class="salto">${resumenHTML()}</div>` + recibos.map((r) => `<div class="salto">${html(r)}</div>`).join(''),
    );

  const badge = (r: ReciboFila) => {
    const e = estadoDe(r);
    const cls =
      e === 'pagado'
        ? 'bg-green-500/15 text-green-400 border-green-500/30'
        : e === 'abonado'
          ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
          : 'bg-red-500/15 text-red-400 border-red-500/30';
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${cls}`}>{e}</span>;
  };

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
          <FileText className="w-5 h-5" />
          Recibos del mes
        </h2>
        {recibos.length > 0 && (
          <button
            onClick={imprimirTodo}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-900 hover:bg-white font-medium text-sm shadow-md transition-colors"
          >
            <Printer className="w-4 h-4" /> Imprimir relación y todos los recibos
          </button>
        )}
      </div>

      <div className="bg-kcard/10 backdrop-blur-md border border-slate-700 rounded-2xl overflow-hidden text-white">
        {cargando ? (
          <div className="p-8 flex items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" /> Cargando recibos…
          </div>
        ) : error ? (
          <p className="p-6 text-center text-red-400">{error}</p>
        ) : recibos.length === 0 ? (
          <p className="p-8 text-center text-slate-400">
            No se emitieron recibos en {nombreMes(mes).toLowerCase()}.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-b border-slate-800">
              <div className="bg-kcard/30 rounded-xl p-3">
                <p className="text-xs text-slate-400">Facturado</p>
                <p className="text-lg font-bold">{fmt(tot.facturado)}</p>
              </div>
              <div className="bg-kcard/30 rounded-xl p-3">
                <p className="text-xs text-slate-400">Cobrado</p>
                <p className="text-lg font-bold text-green-400">{fmt(tot.cobrado)}</p>
              </div>
              <div className="bg-kcard/30 rounded-xl p-3">
                <p className="text-xs text-slate-400">Por cobrar</p>
                <p className="text-lg font-bold text-red-400">{fmt(Math.max(0, tot.facturado - tot.cobrado))}</p>
              </div>
              <div className="bg-kcard/30 rounded-xl p-3">
                <p className="text-xs text-slate-400">Recibos pagados</p>
                <p className="text-lg font-bold">
                  {tot.pagados} / {recibos.length}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-slate-800">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar apartamento o propietario"
                  className="w-full bg-kcard/20 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
                />
              </div>
              <div className="flex gap-1 bg-kcard/20 border border-slate-700 rounded-xl p-1">
                {(['todos', 'pendiente', 'pagado'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFiltro(f)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${filtro === f ? 'bg-slate-100 text-slate-900' : 'text-slate-300 hover:bg-slate-800'}`}
                  >
                    {f === 'pendiente' ? 'Por cobrar' : f === 'pagado' ? 'Pagados' : 'Todos'}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-800">
                    <th className="p-3">Apto</th>
                    <th className="p-3">Propietario</th>
                    <th className="p-3 text-right hidden md:table-cell">Gastos comunes</th>
                    <th className="p-3 text-right hidden md:table-cell">Fondo</th>
                    <th className="p-3 text-right hidden lg:table-cell">Cargos / Devol.</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((r) => {
                    const f = (n: number) => formatMonto(Number(n) || 0, (r.moneda || moneda) as Moneda);
                    return (
                      <tr key={r.id_recibo} className="border-b border-slate-800/60 hover:bg-kcard/10">
                        <td className="p-3 font-semibold whitespace-nowrap">
                          {r.propietarios.apartamento}
                          {r.tipo === 'extra' && <span className="ml-2 text-[10px] uppercase px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300">extra</span>}
                        </td>
                        <td className="p-3 text-slate-300">{r.propietarios.nombre}</td>
                        <td className="p-3 text-right hidden md:table-cell">{f(r.monto_alicuota)}</td>
                        <td className="p-3 text-right hidden md:table-cell">{Number(r.fondo_reserva) > 0 ? f(r.fondo_reserva) : '—'}</td>
                        <td className="p-3 text-right hidden lg:table-cell whitespace-nowrap">
                          {Number(r.monto_cargos) > 0 && <span className="text-orange-300">+{f(r.monto_cargos)} </span>}
                          {Number(r.monto_creditos) > 0 && <span className="text-green-400">−{f(r.monto_creditos)}</span>}
                          {!(Number(r.monto_cargos) > 0) && !(Number(r.monto_creditos) > 0) && '—'}
                        </td>
                        <td className="p-3 text-right font-bold whitespace-nowrap">{f(r.monto_total)}</td>
                        <td className="p-3 text-center">{badge(r)}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setAbierto(r)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-800 text-xs font-medium"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver recibo
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {visibles.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-400">
                        Ningún recibo coincide con la búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {abierto && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-8">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setAbierto(null)} />
          <div className="relative bg-kbg rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-700">
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-700 shrink-0">
              <h3 className="text-white text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-400" /> Recibo · Apto {abierto.propietarios.apartamento}
              </h3>
              <button onClick={() => setAbierto(null)} className="p-1 rounded-full hover:bg-slate-800">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="theme-fixed overflow-y-auto" style={{ backgroundColor: '#ffffff' }} dangerouslySetInnerHTML={{ __html: html(abierto) }} />
            <div className="p-4 border-t border-slate-700 bg-kbg flex justify-end shrink-0">
              <button
                onClick={() => imprimir(`Recibo_Apto_${abierto.propietarios.apartamento}_${nombreMes(mes)}`, html(abierto))}
                className="flex items-center gap-2 py-2.5 px-6 rounded-xl bg-slate-100 text-slate-900 hover:bg-white font-medium shadow-md"
              >
                <Printer className="w-5 h-5" /> Imprimir / Guardar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
