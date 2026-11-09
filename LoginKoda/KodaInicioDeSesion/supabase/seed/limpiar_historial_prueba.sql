-- =====================================================================
-- KUOTA · Borra el historial de PRUEBA generado por 20261029_historial_recibos_prueba.sql
-- Devuelve la deuda de cada apartamento a como estaba antes.
-- =====================================================================
BEGIN;

-- Quitar de la deuda lo que quedó pendiente en los recibos de prueba
UPDATE public.propietarios p
SET deuda = coalesce(p.deuda, 0) - x.pendiente
FROM (SELECT r.id_propietario,
             sum(r.monto_total - coalesce((SELECT sum(pg.monto) FROM public.pagos pg
                                           WHERE pg.id_recibo = r.id_recibo AND pg.estado = 'aprobado'
                                             AND coalesce(pg.referencia, '') NOT LIKE 'PRB%'), 0)) AS pendiente
      FROM public.recibos r
      WHERE r.concepto = 'PRUEBA-HIST-20261029' AND r.estado = 'pendiente'
      GROUP BY 1) x
WHERE p.id_propietario = x.id_propietario;

DELETE FROM public.pagos   WHERE id_recibo IN (SELECT id_recibo FROM public.recibos WHERE concepto = 'PRUEBA-HIST-20261029');
DELETE FROM public.ajustes WHERE id_recibo IN (SELECT id_recibo FROM public.recibos WHERE concepto = 'PRUEBA-HIST-20261029');
DELETE FROM public.recibos WHERE concepto = 'PRUEBA-HIST-20261029';
DELETE FROM public.gastos  WHERE codigo_concepto = 9999;

COMMIT;
