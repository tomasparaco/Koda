import { useEffect, useState } from 'react';
import { Check, Coins, Loader2, PiggyBank } from 'lucide-react';
import { EdificioService, FondoReservaService, faltanteFondo, type EdificioConfig } from '../../services/edificio.service';
import type { Moneda } from '../../services/bcv.service';
import { formatMonto } from '../../lib/money';

interface Props {
  codigoEdificio: string;
  config: EdificioConfig;
  onGuardado?: () => void;
  compacto?: boolean;
}

/** Moneda de cobro del edificio (USD/EUR a tasa BCV) y fondo de reserva (meta fija + saldo actual). */
export function ConfigCobro({ codigoEdificio, config, onGuardado, compacto = false }: Props) {
  const [moneda, setMoneda] = useState<Moneda>(config.moneda_cobro);
  const [meta, setMeta] = useState(String(config.fondo_reserva_meta));
  const [saldo, setSaldo] = useState(String(config.fondo_reserva_saldo));
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);

  useEffect(() => {
    setMoneda(config.moneda_cobro);
    setMeta(String(config.fondo_reserva_meta));
    setSaldo(String(config.fondo_reserva_saldo));
  }, [config.moneda_cobro, config.fondo_reserva_meta, config.fondo_reserva_saldo]);

  const metaNum = Number(meta);
  const saldoNum = Number(saldo);
  const cambioMoneda = moneda !== config.moneda_cobro;
  const cambioFondo = metaNum !== config.fondo_reserva_meta || saldoNum !== config.fondo_reserva_saldo;
  const simbolo = moneda === 'EUR' ? '€' : '$';
  const faltante = isNaN(metaNum) || isNaN(saldoNum) ? 0 : faltanteFondo({ fondo_reserva_meta: metaNum, fondo_reserva_saldo: saldoNum });

  const guardar = async () => {
    if (isNaN(metaNum) || isNaN(saldoNum) || metaNum < 0 || saldoNum < 0) {
      setMensaje({ ok: false, texto: 'La meta y el saldo deben ser números positivos.' });
      return;
    }
    if (saldoNum > metaNum) {
      setMensaje({ ok: false, texto: 'El saldo no puede ser mayor que la meta.' });
      return;
    }
    if (
      cambioMoneda &&
      !window.confirm(
        `¿Cambiar la moneda de cobro a ${moneda === 'EUR' ? 'EURO (€)' : 'DÓLAR ($)'}?\n\n` +
          'Las deudas y recibos ya emitidos conservan su número; se mostrarán y convertirán a Bs con la tasa BCV de la nueva moneda.'
      )
    ) {
      return;
    }
    setGuardando(true);
    const resultados: { exito: boolean; mensaje: string }[] = [];
    if (cambioMoneda) resultados.push(await EdificioService.updateConfig(codigoEdificio, { moneda_cobro: moneda }));
    if (cambioFondo) resultados.push(await FondoReservaService.configurar(codigoEdificio, metaNum, saldoNum));
    setGuardando(false);
    const fallo = resultados.find((r) => !r.exito);
    setMensaje(fallo ? { ok: false, texto: fallo.mensaje } : { ok: true, texto: 'Configuración guardada.' });
    if (!fallo) onGuardado?.();
    setTimeout(() => setMensaje(null), 4000);
  };

  const btnMoneda = (m: Moneda, label: string) => (
    <button
      type="button"
      onClick={() => setMoneda(m)}
      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
        moneda === m ? 'bg-slate-100 text-slate-900 border-slate-100' : 'border-slate-700 text-slate-400 hover:text-slate-200'
      }`}
    >
      {label}
    </button>
  );

  const campo = (id: string, valor: string, setValor: (v: string) => void, etiqueta: string) => (
    <label htmlFor={id} className="flex-1 min-w-[140px]">
      <span className="block text-xs text-slate-400 mb-1">{etiqueta}</span>
      <div className="relative">
        <span className="absolute left-3 top-2.5 text-slate-400">{simbolo}</span>
        <input
          id={id}
          type="number"
          min="0"
          step="0.01"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="w-full pl-8 pr-3 py-2.5 bg-kbg border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-slate-600 outline-none"
        />
      </div>
    </label>
  );

  return (
    <div className={`bg-kcard/10 border border-slate-700 rounded-2xl ${compacto ? 'p-4' : 'p-6'} space-y-5`}>
      {!compacto && (
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Coins className="w-5 h-5" /> Configuración de cobro
        </h3>
      )}

      <div>
        <p className="text-sm text-slate-300 mb-2">Moneda en la que se cobra el condominio</p>
        <div className="flex gap-2">
          {btnMoneda('USD', '$ Dólar (tasa BCV)')}
          {btnMoneda('EUR', '€ Euro (tasa BCV)')}
        </div>
        <p className="text-xs text-slate-500 mt-1.5">El equivalente en bolívares se calcula con la tasa oficial del día de esa moneda.</p>
      </div>

      <div>
        <p className="text-sm text-slate-300 mb-2 flex items-center gap-2">
          <PiggyBank className="w-4 h-4" /> Fondo de reserva
        </p>
        <div className="flex flex-wrap gap-3">
          {campo(`meta-fondo-${codigoEdificio}`, meta, setMeta, 'Meta del fondo (monto fijo)')}
          {campo(`saldo-fondo-${codigoEdificio}`, saldo, setSaldo, 'Dinero que hay hoy en el fondo')}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          El fondo solo se cobra cuando se usa dinero de él: en el siguiente recibo se repone lo que falte para llegar a la meta, repartido por
          alícuota.{' '}
          {faltante > 0 ? (
            <span className="text-amber-400">Con estos valores, el próximo recibo cobrará {formatMonto(faltante, moneda)} para reponerlo.</span>
          ) : (
            <span>Con estos valores, el fondo está completo y no se cobrará nada.</span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={guardar}
          disabled={(!cambioMoneda && !cambioFondo) || guardando}
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Guardar
        </button>
        {mensaje && <span className={`text-sm ${mensaje.ok ? 'text-green-400' : 'text-red-400'}`}>{mensaje.texto}</span>}
      </div>
    </div>
  );
}
