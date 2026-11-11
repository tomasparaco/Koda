# Kuota · Mejoras (octubre 2026)

Esta guía explica cómo poner en marcha las mejoras nuevas. Haz los pasos **en orden**.

| Mejora | Dónde se ve |
|---|---|
| Tema claro / oscuro | Botón ☀️/🌙 arriba a la derecha (login, junta, propietario, administradora) y en el menú lateral |
| Moneda de cobro USD o EUR (tasa BCV) | Junta → Menú → Configuración → *Configuración de cobro*. Administradora → ⚙️ en cada edificio |
| Fondo de reserva con meta fija | Finanzas → *Fondo de Reserva*: se usa con un botón y se repone en el próximo recibo |
| Multas, cargos extra y devoluciones | Junta → Finanzas → *Cargos, Multas y Devoluciones* |
| Panel de administradora (varios edificios) | Al iniciar sesión con un usuario administrador |
| Avisos por correo | Cada notificación se envía también por correo (requiere el paso 3) |

---

## 1. Instalar y probar en tu computadora

```bash
cd LoginKoda/KodaInicioDeSesion
npm install
npm run dev
```

> Se corrigió `package.json`: ahora React se instala solo (antes faltaba en una instalación limpia).

## 2. Actualizar la base de datos (obligatorio)

1. Entra a **Supabase → SQL Editor → New query**.
2. Copia y pega todo el contenido de `supabase/migrations/20261027_kuota_mejoras.sql`.
3. Pulsa **Run**. Debe terminar sin errores. Si lo ejecutas otra vez no pasa nada.

Esto agrega:
- En `edificios`: `moneda_cobro` (USD/EUR, por defecto USD) y `porcentaje_fondo_reserva` (por defecto 10).
- En `recibos`: `monto_cargos`, `monto_creditos`, `moneda`, `tipo` (`mensual` / `extra`) y `concepto`.
- En `notificaciones`: `enviar_correo` y `correo_enviado_at`.
- Tablas nuevas `ajustes` (multas, cargos, devoluciones) y `administradora_edificios`.
- Permisos (RLS) para que la administradora vea y gestione solo sus edificios.

### Dar acceso a una administradora

La administradora necesita un usuario normal de Supabase Auth (créalo en **Authentication → Users** si no existe). Después asígnale sus edificios con este SQL:

```sql
INSERT INTO public.administradora_edificios (id_auth, codigo_edificio, nombre, correo, celular)
SELECT u.id, e.codigo_edificio, 'Administradora XYZ', u.email, '0414-0000000'
FROM auth.users u, public.edificios e
WHERE u.email = 'administradora@correo.com'
  AND e.codigo_edificio IN ('CODIGO-EDIF-1', 'CODIGO-EDIF-2');
```

Al iniciar sesión verá el **Panel de Administración** con todos sus edificios: deuda total, morosos, pagos por conciliar y solvencia. Desde ahí puede abrir la lista de quién debe, enviar recordatorios, cambiar la moneda o el fondo de reserva, y entrar con **Gestionar edificio** para trabajar igual que la junta de condominio.

## 3. Activar los avisos por correo

Los avisos usan [Resend](https://resend.com), que es gratis hasta 3.000 correos al mes.

1. **Crea una cuenta en Resend** y copia tu API Key (`re_...`).
   - Para enviar a cualquier persona necesitas **verificar un dominio** (Resend → Domains).
   - Mientras no lo verifiques, usa `Kuota <onboarding@resend.dev>`: con ese remitente solo llegan correos al dueño de la cuenta de Resend. Sirve para probar.
2. **Instala la CLI de Supabase** y vincula el proyecto:
   ```bash
   npm install -g supabase
   supabase login
   supabase link --project-ref ichoefiufcbtiydpmgwy
   ```
3. **Guarda los secretos** (inventa tú el `WEBHOOK_SECRET`, una frase larga cualquiera):
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxxxxxxx
   supabase secrets set EMAIL_FROM="Kuota <avisos@tudominio.com>"
   supabase secrets set WEBHOOK_SECRET=una-frase-secreta-larga
   supabase secrets set APP_URL=https://la-direccion-de-tu-app.com
   ```
4. **Publica la función** (desde la carpeta `KodaInicioDeSesion`):
   ```bash
   supabase functions deploy notificar --no-verify-jwt
   ```
5. **Crea el disparador** en Supabase → **Database → Webhooks → Create a new hook**:
   - Table: `notificaciones` · Events: **Insert**
   - Type: **Supabase Edge Functions** → función `notificar` · Method `POST`
   - HTTP Headers → agrega `x-kuota-secret` con el mismo valor de `WEBHOOK_SECRET`
6. Para probar, reporta un pago desde un propietario. Te debe llegar el correo "Recibimos tu reporte de pago", y a la junta y a la administradora "Nuevo Pago Reportado".

**Correos que se envían**

| Momento | Le llega a |
|---|---|
| El propietario reporta un pago | Al propietario ("Recibimos tu reporte de pago") y a la junta/administradora |
| La junta aprueba o rechaza un pago | Al propietario |
| Se emiten los recibos del mes | A todos los propietarios |
| Se registra una multa, cargo o devolución | Al apartamento afectado, o a todos si es para el edificio |
| Recordatorio de deuda (botón ✉️ en morosos) | Al moroso |
| Comunicados, eventos, encuestas, tickets | A quien corresponda. En comunicados y eventos, el interruptor "notificar por correo" decide si sale el correo |

> **Teléfono (SMS/WhatsApp):** quedó preparado en `supabase/functions/notificar/index.ts` (función `enviarSMS`). Ya se buscan los celulares de cada destinatario; falta elegir el proveedor (Twilio, WhatsApp Cloud API...) y conectar el envío.

> Se eliminaron los envíos con FormSubmit. Ese servicio pedía a cada destinatario confirmar su correo antes de recibir nada, y con los avisos nuevos los correos habrían llegado duplicados.

---

## Cómo funciona cada mejora

### Moneda de cobro (USD o EUR)
- Cada edificio cobra en **dólares o euros**. El equivalente en bolívares usa la tasa oficial BCV del día de esa moneda (`ve.dolarapi.com`, se consulta una vez al día).
- Si cambias la moneda de un edificio con deudas ya emitidas, los montos no se convierten: el número se queda igual y se pasa a mostrar en la nueva moneda. Lo ideal es elegir la moneda antes de emitir recibos.

### Fondo de reserva (meta fija)
- Cada edificio tiene una **meta fija** (ej. $1.000) y un **saldo** (lo que hay hoy). Se configuran en Configuración → *Configuración de cobro* (o en el ⚙️ de cada edificio en el panel de la administradora).
- **Solo se cobra cuando se usa.** En Finanzas → *Fondo de Reserva* → **Usar fondo de reserva** se registra el retiro con su concepto; el saldo baja y los vecinos reciben un aviso en la app.
- Al **emitir los recibos**, se cobra lo que falte para volver a la meta (meta − saldo), repartido por alícuota, como la línea "Reposición del fondo de reserva". Después de emitir, el saldo vuelve a la meta.
- Si el fondo está completo, el recibo no trae ningún cargo por fondo.
- Todos los movimientos (usos, reposiciones y ajustes de saldo) quedan en `fondo_reserva_movimientos`.
- Script: `supabase/migrations/20261029_fondo_reserva_fijo.sql` (ya aplicado en Supabase el 29/10/2026). La columna `porcentaje_fondo_reserva` quedó en desuso.

### Multas, cargos extra y devoluciones
En **Finanzas → Cargos, Multas y Devoluciones → Registrar**:
- **Tipo:** multa, alquiler de salón de fiestas, gasto extra, otro cargo, o **devolución** (cobro en exceso).
- **A quién:** un apartamento (el monto completo) o todo el edificio (se reparte por alícuota).
- **Cuándo se cobra** (solo cargos):
  - *En el próximo recibo:* sale como una línea en la factura del mes.
  - *De inmediato:* se crea un recibo aparte que el propietario puede pagar enseguida.
- **Devoluciones:** siempre se descuentan en el próximo recibo. Si superan el recibo, el excedente queda como saldo a favor.
- Los ajustes pendientes se pueden **anular** antes de emitir el recibo.

Ejemplo del agua y la luz: este mes cobras de más para cubrir el servicio. El mes siguiente registras una **Devolución** para **Todo el edificio** por el excedente, y a cada apartamento se le descuenta su parte según su alícuota.

---

## Archivos nuevos y modificados

**Nuevos**
- `supabase/migrations/20261027_kuota_mejoras.sql`: script de la base de datos
- `supabase/functions/notificar/index.ts`: función de avisos por correo
- `src/app/theme/ThemeContext.tsx` y `src/styles/theme-light.css`: tema claro/oscuro
- `src/app/moneda/MonedaContext.tsx`, `src/lib/money.ts`, `src/services/edificio.service.ts`: moneda por edificio
- `src/services/ajuste.service.ts` y `src/app/DashboardAdmin/AjustesSection.tsx`: multas, cargos y devoluciones
- `src/app/DashboardAdmin/EmisionRecibosModal.tsx`: emisión con desglose (compartido por Inicio y Finanzas)
- `src/app/DashboardAdmin/ConfigCobro.tsx`: moneda y % de fondo
- `src/services/administradora.service.ts` y `src/app/Administradora/AdministradoraPanel.tsx`: panel multi-edificio

**Modificados (lo principal)**
- `recibo.service.ts`: emisión con fondo de reserva y ajustes
- `bcv.service.ts`: tasa USD o EUR
- `UserDashboard.tsx`: moneda, desglose del recibo, deuda siempre actualizada, tema
- `ReportPaymentModal.tsx`: moneda del edificio y confirmación al propietario
- `FinanzasView.tsx`, `InicioView.tsx`, `UsuariosView.tsx`, `DashboardLayout.tsx`, `SettingsView.tsx`, `AdminVotaciones.tsx`, `App.tsx`, `CondominioSelector.tsx`, `auth.service.ts`, `notificacion.service.ts`
- `SettingsView.tsx` y `AdminVotaciones.tsx` ahora usan el edificio que está abierto. Antes tomaban siempre el primer edificio del usuario, lo que fallaba con varios edificios.
- Las clases de color fijas `bg-[#0F172A]` y `bg-[#1E293B]` ahora son `bg-kbg` y `bg-kcard`, que cambian según el tema.

## Recibos del mes (junta y administradora)
En **Finanzas**, debajo de la relación de gastos, está la sección **Recibos del mes**. Usa el selector de mes de arriba para ver cualquier mes anterior.
- Totales del mes: facturado, cobrado, por cobrar y cuántos recibos están pagados.
- Lista de todos los apartamentos con gastos comunes, fondo, cargos y devoluciones, total y estado (pagado, abonado o pendiente). Se puede buscar y filtrar.
- **Ver recibo** abre el recibo completo del apartamento, con el desglose de gastos, y permite imprimirlo o guardarlo en PDF.
- **Imprimir relación y todos los recibos** saca primero la hoja resumen del edificio y luego un recibo por página.

## Historial de prueba (abril a septiembre 2026)
`supabase/seed/20261029_historial_recibos_prueba.sql` (ya aplicado) generó gastos, recibos y pagos de prueba en los 10 edificios para los meses que no tenían datos. Para borrarlo, ejecuta `supabase/seed/limpiar_historial_prueba.sql`; la deuda de cada apartamento vuelve a como estaba.
