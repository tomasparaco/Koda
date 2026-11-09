import type { Moneda } from '../services/bcv.service';

export const SIMBOLO: Record<Moneda, string> = { USD: '$', EUR: '€' };

const numero = (n: number) =>
  (Number(n) || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "$1.234,56" o "€1.234,56". Negativos como "-$12,00". */
export function formatMonto(n: number, moneda: Moneda = 'USD') {
  const v = Number(n) || 0;
  return `${v < 0 ? '-' : ''}${SIMBOLO[moneda]}${numero(Math.abs(v))}`;
}

export function formatBs(n: number) {
  return `Bs. ${numero(n)}`;
}

export const redondear = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
