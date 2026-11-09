import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { bcvService, type Moneda } from '../../services/bcv.service';
import { EdificioService, normalizarEdificio, type EdificioConfig } from '../../services/edificio.service';
import { SIMBOLO, formatMonto, formatBs } from '../../lib/money';

export { SIMBOLO, formatMonto, formatBs };

interface MonedaContextValue {
  config: EdificioConfig;
  moneda: Moneda;
  simbolo: string;
  tasa: number;          // Bs por unidad de la moneda del edificio (0 = no disponible)
  tasaFecha: string;
  tasaFallback: boolean;
  cargandoTasa: boolean;
  /** Formatea un monto en la moneda del edificio */
  fmt: (n: number) => string;
  /** Convierte a bolívares con la tasa del día y formatea */
  fmtBs: (n: number) => string;
  aBs: (n: number) => number;
  /** Vuelve a leer la configuración del edificio (ej. después de cambiar la moneda) */
  recargar: () => Promise<void>;
}

const defaultConfig = normalizarEdificio(null, '');

const MonedaContext = createContext<MonedaContextValue | null>(null);

export function MonedaProvider({ codigoEdificio, children }: { codigoEdificio: string; children: ReactNode }) {
  const [config, setConfig] = useState<EdificioConfig>({ ...defaultConfig, codigo_edificio: codigoEdificio });
  const [tasa, setTasa] = useState(0);
  const [tasaFecha, setTasaFecha] = useState('Cargando...');
  const [tasaFallback, setTasaFallback] = useState(false);
  const [cargandoTasa, setCargandoTasa] = useState(true);

  const recargar = useCallback(async () => {
    if (!codigoEdificio) return;
    const cfg = await EdificioService.getConfig(codigoEdificio);
    setConfig(cfg);
  }, [codigoEdificio]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  useEffect(() => {
    let activo = true;
    setCargandoTasa(true);
    bcvService.getLatestRate(config.moneda_cobro).then((t) => {
      if (!activo) return;
      setTasa(t.rate);
      setTasaFecha(t.lastUpdate);
      setTasaFallback(t.isFallback);
      setCargandoTasa(false);
    });
    return () => {
      activo = false;
    };
  }, [config.moneda_cobro]);

  const value = useMemo<MonedaContextValue>(() => {
    const moneda = config.moneda_cobro;
    return {
      config,
      moneda,
      simbolo: SIMBOLO[moneda],
      tasa,
      tasaFecha,
      tasaFallback,
      cargandoTasa,
      fmt: (n: number) => formatMonto(n, moneda),
      aBs: (n: number) => (Number(n) || 0) * tasa,
      fmtBs: (n: number) => (tasa > 0 ? formatBs((Number(n) || 0) * tasa) : 'Bs. —'),
      recargar,
    };
  }, [config, tasa, tasaFecha, tasaFallback, cargandoTasa, recargar]);

  return <MonedaContext.Provider value={value}>{children}</MonedaContext.Provider>;
}

/** Datos de moneda del edificio actual. Fuera de un MonedaProvider devuelve USD por defecto. */
export function useMoneda(): MonedaContextValue {
  const ctx = useContext(MonedaContext);
  if (ctx) return ctx;
  return {
    config: defaultConfig,
    moneda: 'USD',
    simbolo: '$',
    tasa: 0,
    tasaFecha: '',
    tasaFallback: true,
    cargandoTasa: false,
    fmt: (n: number) => formatMonto(n, 'USD'),
    aBs: () => 0,
    fmtBs: () => 'Bs. —',
    recargar: async () => {},
  };
}
