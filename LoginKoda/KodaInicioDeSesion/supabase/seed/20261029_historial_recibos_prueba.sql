-- =====================================================================
-- KUOTA · Historial de PRUEBA: recibos de abril a septiembre 2026
-- Para todos los edificios. Salta los meses en que el edificio ya tiene
-- gastos o recibos (no duplica ni modifica datos existentes).
-- Marcas para poder borrarlo después:
--   gastos.codigo_concepto = 9999 · recibos.concepto = 'PRUEBA-HIST-20261029'
--   pagos.referencia empieza con 'PRB'
-- =====================================================================
BEGIN;

-- No correr dos veces
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.recibos WHERE concepto = 'PRUEBA-HIST-20261029') THEN
    RAISE EXCEPTION 'El historial de prueba ya fue generado. Usa el script de limpieza primero si quieres regenerarlo.';
  END IF;
END $$;

-- Meses a generar por edificio (solo donde no hay gastos ni recibos ese mes)
CREATE TEMP TABLE hist_meses ON COMMIT DROP AS
SELECT e.codigo_edificio, m::date AS periodo,
       (SELECT count(*) FROM public.propietarios p WHERE p.codigo_edificio = e.codigo_edificio AND coalesce(p.rol,'') <> 'admin') AS aptos
FROM public.edificios e
CROSS JOIN generate_series('2026-04-01'::date, '2026-09-01'::date, interval '1 month') m
WHERE NOT EXISTS (SELECT 1 FROM public.gastos g WHERE g.codigo_edificio = e.codigo_edificio
                    AND date_trunc('month', g.fecha_gasto) = m)
  AND NOT EXISTS (SELECT 1 FROM public.recibos r JOIN public.propietarios p ON p.id_propietario = r.id_propietario
                  WHERE p.codigo_edificio = e.codigo_edificio AND date_trunc('month', r.periodo) = m);

-- 1. Gastos del mes: ~110 por apartamento con variación mensual, en 4 categorías
INSERT INTO public.gastos (codigo_edificio, descripcion, monto, fecha_gasto, categoria, pagado_al_proveedor, codigo_concepto)
SELECT hm.codigo_edificio, c.descripcion,
       round(hm.aptos * 110 * (1 + 0.04 * ((extract(month FROM hm.periodo)::int + ascii(right(hm.codigo_edificio, 1))) % 5)) * c.peso, 2),
       hm.periodo + c.dia, c.categoria, true, 9999
FROM hist_meses hm
CROSS JOIN (VALUES
  ('Vigilancia: Servicio mensual',        'Vigilancia',    0.45, 2),
  ('Electricidad: Áreas comunes',         'Servicios',     0.25, 5),
  ('Limpieza: Personal y materiales',     'Limpieza',      0.15, 9),
  ('Mantenimiento: Revisión preventiva',  'Mantenimiento', 0.15, 16)
) AS c(descripcion, categoria, peso, dia)
WHERE hm.aptos > 0;

-- 2. Recibos de cada apartamento
--    Pendientes: morosos crónicos (todos los meses) + algunos en jul/ago/sep, cada vez más
WITH totales AS (
  SELECT g.codigo_edificio, date_trunc('month', g.fecha_gasto)::date AS periodo, sum(g.monto) AS total
  FROM public.gastos g WHERE g.codigo_concepto = 9999 GROUP BY 1, 2
),
base AS (
  SELECT p.id_propietario, t.periodo, e.moneda_cobro,
         round(t.total * coalesce(p.alicuota, 0) / 100, 2) AS alic,
         CASE
           WHEN p.id_propietario % 13 = 0 THEN 'pendiente'
           WHEN extract(month FROM t.periodo) = 7 AND (p.id_propietario * 7) % 10 < 1 THEN 'pendiente'
           WHEN extract(month FROM t.periodo) = 8 AND (p.id_propietario * 7) % 10 < 2 THEN 'pendiente'
           WHEN extract(month FROM t.periodo) = 9 AND (p.id_propietario * 7) % 10 < 3 THEN 'pendiente'
           ELSE 'pagado'
         END AS estado
  FROM totales t
  JOIN public.edificios e ON e.codigo_edificio = t.codigo_edificio
  JOIN public.propietarios p ON p.codigo_edificio = t.codigo_edificio AND coalesce(p.rol,'') <> 'admin'
)
INSERT INTO public.recibos (id_propietario, periodo, monto_alicuota, fondo_reserva, monto_cargos, monto_creditos,
                            monto_total, moneda, tipo, concepto, fecha_emision, estado)
SELECT id_propietario, periodo, alic, 0, 0, 0, alic, moneda_cobro, 'mensual', 'PRUEBA-HIST-20261029', periodo + 1, estado
FROM base WHERE alic > 0;

-- 3. La deuda: el trigger sumó todos los recibos nuevos; se descuentan los que nacen pagados
UPDATE public.propietarios p
SET deuda = coalesce(p.deuda, 0) - x.pagado
FROM (SELECT id_propietario, sum(monto_total) AS pagado FROM public.recibos
      WHERE concepto = 'PRUEBA-HIST-20261029' AND estado = 'pagado' GROUP BY 1) x
WHERE p.id_propietario = x.id_propietario;

-- 4. Pagos aprobados de los recibos pagados (fechas entre el 4 y el 22 del mes)
INSERT INTO public.pagos (id_recibo, monto, fecha_pago, metodo, referencia, estado)
SELECT r.id_recibo, r.monto_total, r.periodo + (3 + (r.id_recibo % 19))::int,
       (ARRAY['Pago Móvil', 'Transferencia', 'Zelle', 'Pago Móvil'])[1 + (r.id_recibo % 4)],
       'PRB' || lpad(((r.id_recibo * 7919) % 100000)::text, 5, '0'), 'aprobado'
FROM public.recibos r
WHERE r.concepto = 'PRUEBA-HIST-20261029' AND r.estado = 'pagado';

COMMIT;

-- Resumen por edificio
SELECT p.codigo_edificio,
       string_agg(DISTINCT to_char(r.periodo, 'YYYY-MM'), ' ') AS meses,
       count(*) AS recibos,
       count(*) FILTER (WHERE r.estado = 'pendiente') AS pendientes,
       round(sum(r.monto_total) FILTER (WHERE r.estado = 'pendiente'), 2) AS deuda_generada
FROM public.recibos r JOIN public.propietarios p ON p.id_propietario = r.id_propietario
WHERE r.concepto = 'PRUEBA-HIST-20261029'
GROUP BY 1 ORDER BY 1;
