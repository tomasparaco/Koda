-- =====================================================================
-- KUOTA · Datos de PRUEBA: 3 edificios nuevos para la administradora
-- 008 Residencias Los Samanes (USD, 10%) · 009 Torre Mirador del Lago (EUR, 8%)
-- 010 Conjunto Las Acacias (USD, 12%) · 8 apartamentos cada uno
-- Recibos de agosto y septiembre 2026; 7 de 24 apartamentos quedan morosos.
-- Gastos de octubre cargados para poder probar "Emitir Recibos del Mes".
-- Correos ficticios @kuota-prueba.test (no reciben correos reales).
-- =====================================================================
BEGIN;

-- 1. Edificios
INSERT INTO public.edificios (codigo_edificio, descripcion, direccion, rif, presidente_junta, correo_presidente, moneda_cobro, porcentaje_fondo_reserva)
VALUES
  ('008', 'Residencias Los Samanes (prueba)',   'Los Palos Grandes, Caracas', 'J-50000008-0', 'Rosa Mendoza',    'junta.samanes@kuota-prueba.test',  'USD', 10),
  ('009', 'Torre Mirador del Lago (prueba)',    'Av. El Milagro, Maracaibo',  'J-50000009-1', 'Héctor Villalobos','junta.mirador@kuota-prueba.test',  'EUR', 8),
  ('010', 'Conjunto Las Acacias (prueba)',      'Av. Lara, Barquisimeto',     'J-50000010-2', 'Gabriela Piña',    'junta.acacias@kuota-prueba.test',  'USD', 12);

-- 2. Apartamentos (alícuotas 14+14+12×6 = 100% por edificio)
INSERT INTO public.propietarios (codigo_edificio, apartamento, nombre, correo, celular, alicuota, rol, deuda)
SELECT v.cod, v.apto, v.nombre,
       'prueba.' || v.cod || '.' || lower(replace(v.apto, '-', '')) || '@kuota-prueba.test',
       v.cel, v.alic, 'vecino', 0
FROM (VALUES
  ('008','1-A','Andrés Salazar',      '0414-3001101', 14), ('008','1-B','Valentina Rojas',     '0424-3001102', 14),
  ('008','2-A','Fernando Castillo',   '0412-3001201', 12), ('008','2-B','Daniela Herrera',     '0416-3001202', 12),
  ('008','3-A','Ricardo Morales',     '0414-3001301', 12), ('008','3-B','Isabel Guerrero',     '0424-3001302', 12),
  ('008','4-A','Manuel Ortega',       '0412-3001401', 12), ('008','4-B','Camila Paredes',      '0414-3001402', 12),
  ('009','1-A','Jesús Urdaneta',      '0414-3002101', 14), ('009','1-B','Mariela Fuenmayor',   '0424-3002102', 14),
  ('009','2-A','Oswaldo Finol',       '0412-3002201', 12), ('009','2-B','Yelitza Montiel',     '0416-3002202', 12),
  ('009','3-A','Rafael Atencio',      '0414-3002301', 12), ('009','3-B','Nathaly Bracho',      '0424-3002302', 12),
  ('009','4-A','Gustavo Ferrer',      '0412-3002401', 12), ('009','4-B','Patricia Añez',       '0414-3002402', 12),
  ('010','1-A','Luis Escalona',       '0414-3003101', 14), ('010','1-B','Carolina Giménez',    '0424-3003102', 14),
  ('010','2-A','Alejandro Colmenárez','0412-3003201', 12), ('010','2-B','Rebeca Mendoza',      '0416-3003202', 12),
  ('010','3-A','Wilmer Pérez',        '0414-3003301', 12), ('010','3-B','Andreína Torrealba',  '0424-3003302', 12),
  ('010','4-A','Óscar Lucena',        '0412-3003401', 12), ('010','4-B','Mónica Yépez',        '0414-3003402', 12)
) AS v(cod, apto, nombre, cel, alic);

-- 3. Gastos (agosto, septiembre y octubre 2026)
INSERT INTO public.gastos (codigo_edificio, descripcion, monto, fecha_gasto, categoria, pagado_al_proveedor)
SELECT v.cod, v.descr, v.monto, v.fecha::date, v.cat, v.fecha < '2026-10-01'
FROM (VALUES
  ('008','Vigilancia: Servicio mensual',1200,'2026-08-03','Vigilancia'), ('008','Electricidad: Áreas comunes',650,'2026-08-06','Servicios'),
  ('008','Limpieza: Personal y materiales',350,'2026-08-10','Limpieza'),  ('008','Mantenimiento: Ascensor',200,'2026-08-15','Mantenimiento'),
  ('008','Vigilancia: Servicio mensual',1200,'2026-09-03','Vigilancia'), ('008','Electricidad: Áreas comunes',700,'2026-09-06','Servicios'),
  ('008','Limpieza: Personal y materiales',350,'2026-09-10','Limpieza'),  ('008','Mantenimiento: Bomba de agua',300,'2026-09-18','Mantenimiento'),
  ('008','Vigilancia: Servicio mensual',1200,'2026-10-03','Vigilancia'), ('008','Electricidad: Áreas comunes',680,'2026-10-06','Servicios'),
  ('008','Limpieza: Personal y materiales',350,'2026-10-10','Limpieza'),  ('008','Mantenimiento: Ascensor',250,'2026-10-15','Mantenimiento'),
  ('009','Vigilancia: Servicio mensual',1500,'2026-08-03','Vigilancia'), ('009','Electricidad: Aire acondicionado lobby',900,'2026-08-06','Servicios'),
  ('009','Limpieza: Personal y materiales',400,'2026-08-10','Limpieza'),
  ('009','Vigilancia: Servicio mensual',1500,'2026-09-03','Vigilancia'), ('009','Electricidad: Aire acondicionado lobby',950,'2026-09-06','Servicios'),
  ('009','Limpieza: Personal y materiales',400,'2026-09-10','Limpieza'),  ('009','Mantenimiento: Planta eléctrica',350,'2026-09-20','Mantenimiento'),
  ('009','Vigilancia: Servicio mensual',1500,'2026-10-03','Vigilancia'), ('009','Electricidad: Aire acondicionado lobby',920,'2026-10-06','Servicios'),
  ('009','Limpieza: Personal y materiales',400,'2026-10-10','Limpieza'),
  ('010','Vigilancia: Servicio mensual',900,'2026-08-03','Vigilancia'),  ('010','Electricidad: Áreas comunes',420,'2026-08-06','Servicios'),
  ('010','Jardinería: Áreas verdes',280,'2026-08-12','Mantenimiento'),
  ('010','Vigilancia: Servicio mensual',900,'2026-09-03','Vigilancia'),  ('010','Electricidad: Áreas comunes',450,'2026-09-06','Servicios'),
  ('010','Jardinería: Áreas verdes',280,'2026-09-12','Mantenimiento'),  ('010','Mantenimiento: Portón eléctrico',150,'2026-09-22','Mantenimiento'),
  ('010','Vigilancia: Servicio mensual',900,'2026-10-03','Vigilancia'),  ('010','Electricidad: Áreas comunes',440,'2026-10-06','Servicios'),
  ('010','Jardinería: Áreas verdes',280,'2026-10-12','Mantenimiento')
) AS v(cod, descr, monto, fecha, cat);

-- 4. Recibos de agosto y septiembre (calculados con los gastos de cada mes)
--    Morosos: meses = 2 → debe agosto y septiembre; meses = 1 → solo septiembre
WITH morosos(cod, apto, meses) AS (VALUES
  ('008','2-B',2), ('008','4-A',1),
  ('009','1-A',2), ('009','3-B',1), ('009','4-B',1),
  ('010','2-A',1), ('010','3-A',2)
),
meses(periodo) AS (VALUES ('2026-08-01'::date), ('2026-09-01'::date)),
gastos_mes AS (
  SELECT g.codigo_edificio AS cod, date_trunc('month', g.fecha_gasto)::date AS periodo, sum(g.monto) AS total
  FROM public.gastos g WHERE g.codigo_edificio IN ('008','009','010') GROUP BY 1, 2
),
base AS (
  SELECT p.id_propietario, m.periodo, e.moneda_cobro,
         round(gm.total * p.alicuota / 100, 2) AS alic,
         e.porcentaje_fondo_reserva AS pct,
         CASE WHEN mo.meses = 2 OR (mo.meses = 1 AND m.periodo = '2026-09-01') THEN 'pendiente' ELSE 'pagado' END AS estado
  FROM public.propietarios p
  JOIN public.edificios e ON e.codigo_edificio = p.codigo_edificio
  CROSS JOIN meses m
  JOIN gastos_mes gm ON gm.cod = p.codigo_edificio AND gm.periodo = m.periodo
  LEFT JOIN morosos mo ON mo.cod = p.codigo_edificio AND mo.apto = p.apartamento
  WHERE p.codigo_edificio IN ('008','009','010')
)
INSERT INTO public.recibos (id_propietario, periodo, monto_alicuota, fondo_reserva, monto_cargos, monto_creditos, monto_total, moneda, tipo, fecha_emision, estado)
SELECT id_propietario, periodo, alic, round(alic * pct / 100, 2), 0, 0,
       alic + round(alic * pct / 100, 2), moneda_cobro, 'mensual', periodo + 1, estado
FROM base;

-- 5. Pagos aprobados de los recibos pagados (para el libro de transacciones)
INSERT INTO public.pagos (id_recibo, monto, fecha_pago, metodo, referencia, estado)
SELECT r.id_recibo, r.monto_total, r.periodo + (5 + (r.id_recibo % 15))::int,
       (ARRAY['Pago Móvil','Transferencia','Zelle'])[1 + (r.id_recibo % 3)],
       lpad(((r.id_recibo * 7919) % 100000000)::text, 8, '0'), 'aprobado'
FROM public.recibos r JOIN public.propietarios p ON p.id_propietario = r.id_propietario
WHERE p.codigo_edificio IN ('008','009','010') AND r.estado = 'pagado';

-- 6. Un pago reportado por conciliar (Patricia Añez, 4-B de la Torre Mirador, septiembre)
INSERT INTO public.pagos (id_recibo, monto, fecha_pago, metodo, referencia, estado)
SELECT r.id_recibo, r.monto_total, '2026-10-27', 'Transferencia', '00481532', 'pendiente'
FROM public.recibos r JOIN public.propietarios p ON p.id_propietario = r.id_propietario
WHERE p.codigo_edificio = '009' AND p.apartamento = '4-B' AND r.periodo = '2026-09-01';

-- 7. Deuda exacta = suma de recibos pendientes
--    (el trigger sumar_deuda_propietario también sumó los recibos pagados al insertarlos)
UPDATE public.propietarios p
SET deuda = coalesce((SELECT sum(r.monto_total) FROM public.recibos r
                      WHERE r.id_propietario = p.id_propietario AND r.estado = 'pendiente'), 0)
WHERE p.codigo_edificio IN ('008','009','010');

-- 8. Asignar los 3 edificios a la administradora (solo si su cuenta ya existe en Authentication)
INSERT INTO public.administradora_edificios (id_auth, codigo_edificio, nombre, correo)
SELECT u.id, e.codigo_edificio, 'Daniel Tortorella', u.email
FROM auth.users u CROSS JOIN public.edificios e
WHERE lower(u.email) = 'danieltortorella04@gmail.com' AND e.codigo_edificio IN ('008','009','010')
ON CONFLICT (id_auth, codigo_edificio) DO NOTHING;

COMMIT;

-- Resumen
SELECT e.codigo_edificio, e.descripcion, e.moneda_cobro, count(p.*) AS aptos,
       count(*) FILTER (WHERE p.deuda > 0) AS morosos, round(sum(p.deuda)::numeric, 2) AS deuda_total,
       (SELECT count(*) FROM public.administradora_edificios a WHERE a.codigo_edificio = e.codigo_edificio) AS administradoras
FROM public.edificios e JOIN public.propietarios p ON p.codigo_edificio = e.codigo_edificio
WHERE e.codigo_edificio IN ('008','009','010')
GROUP BY 1, 2, 3 ORDER BY 1;
