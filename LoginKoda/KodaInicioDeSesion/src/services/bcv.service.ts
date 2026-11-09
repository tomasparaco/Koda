export type Moneda = 'USD' | 'EUR';

export interface TasaBCV {
  rate: number;          // Bs por 1 unidad de la moneda (0 si no se pudo obtener)
  lastUpdate: string;    // texto legible de la fecha de la tasa
  isFallback: boolean;   // true si es una tasa vieja (sin conexión) o no disponible
  moneda: Moneda;
}

const ENDPOINTS: Record<Moneda, string> = {
  USD: 'https://ve.dolarapi.com/v1/dolares/oficial',
  EUR: 'https://ve.dolarapi.com/v1/euros/oficial',
};

const cacheKey = (moneda: Moneda) => `Kuota_bcv_rate_${moneda}`;
const hoy = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local

function readCache(moneda: Moneda): (TasaBCV & { fetchedOn?: string }) | null {
  try {
    const raw = localStorage.getItem(cacheKey(moneda));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Evita pedir la misma tasa varias veces a la vez (varias vistas montándose juntas)
const enVuelo: Partial<Record<Moneda, Promise<TasaBCV>>> = {};

export const bcvService = {
  /**
   * Tasa oficial del BCV para USD o EUR.
   * Se consulta una vez al día y se guarda en caché local.
   */
  getLatestRate: async (moneda: Moneda = 'USD'): Promise<TasaBCV> => {
    const cached = readCache(moneda);
    if (cached && cached.fetchedOn === hoy() && cached.rate > 0) {
      return { rate: cached.rate, lastUpdate: cached.lastUpdate, isFallback: false, moneda };
    }

    if (!enVuelo[moneda]) {
      enVuelo[moneda] = (async () => {
        try {
          const response = await fetch(ENDPOINTS[moneda]);
          if (!response.ok) throw new Error('API Error');
          const data = await response.json();
          const rate = Number(data.promedio);
          if (!rate || isNaN(rate)) throw new Error('Tasa inválida');

          const result: TasaBCV = {
            rate,
            lastUpdate: new Date(data.fechaActualizacion).toLocaleDateString('es-VE'),
            isFallback: false,
            moneda,
          };
          try {
            localStorage.setItem(cacheKey(moneda), JSON.stringify({ ...result, fetchedOn: hoy() }));
          } catch {
            /* sin caché */
          }
          return result;
        } catch (error) {
          console.warn(`No se pudo obtener la tasa BCV (${moneda}), usando la última guardada`, error);
          if (cached && cached.rate > 0) {
            return { rate: cached.rate, lastUpdate: `${cached.lastUpdate} (sin conexión)`, isFallback: true, moneda };
          }
          return { rate: 0, lastUpdate: 'Tasa no disponible', isFallback: true, moneda };
        } finally {
          delete enVuelo[moneda];
        }
      })();
    }
    return enVuelo[moneda]!;
  },
};
