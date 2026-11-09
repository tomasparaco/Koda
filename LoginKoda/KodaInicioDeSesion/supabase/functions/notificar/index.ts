// =====================================================================
// KUOTA · Función "notificar"
// Se ejecuta con cada fila nueva en la tabla "notificaciones" (Database Webhook)
// y envía el aviso por correo a los destinatarios. Preparada para SMS/WhatsApp.
//
// Variables (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY   Clave de https://resend.com (obligatoria)
//   EMAIL_FROM       Remitente, ej: "Kuota <avisos@tudominio.com>"
//                    (mientras no verifiques un dominio usa "Kuota <onboarding@resend.dev>",
//                     que solo puede enviar al correo dueño de la cuenta de Resend)
//   WEBHOOK_SECRET   (opcional) si lo defines, el webhook debe mandar el header x-kuota-secret.
//                    Sin él también es seguro: la función relee la notificación de la base
//                    y solo envía avisos reales que nunca se enviaron.
//   APP_URL          Dirección de la app, ej: https://kuota.vercel.app (opcional)
//   SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya vienen incluidas por Supabase.
// =====================================================================
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

interface Notificacion {
  id: string;
  codigo_edificio: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  destinatario: string; // 'admin' | 'usuarios' | apartamento
  enviar_correo?: boolean;
}

interface Destinatario {
  correo: string;
  nombre?: string;
  celular?: string;
}

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const escapar = (t: string) =>
  String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

// Se ignoran dominios reservados para pruebas (.test, .example, .invalid, .localhost)
const correoValido = (c?: string | null) =>
  !!c && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.trim()) && !/\.(test|example|invalid|localhost)$/i.test(c.trim());

/** Quién debe recibir la notificación según su "destinatario". */
async function resolverDestinatarios(n: Notificacion): Promise<Destinatario[]> {
  const lista: Destinatario[] = [];

  if (n.destinatario === 'admin') {
    const { data: junta } = await supabase
      .from('propietarios')
      .select('correo, nombre, celular')
      .eq('codigo_edificio', n.codigo_edificio)
      .eq('rol', 'admin');
    lista.push(...(junta || []));
    const { data: admins } = await supabase
      .from('administradora_edificios')
      .select('correo, nombre, celular')
      .eq('codigo_edificio', n.codigo_edificio);
    lista.push(...(admins || []).filter((a) => a.correo));
  } else if (n.destinatario === 'usuarios') {
    const { data } = await supabase
      .from('propietarios')
      .select('correo, nombre, celular, rol')
      .eq('codigo_edificio', n.codigo_edificio);
    lista.push(...(data || []).filter((p) => p.rol !== 'admin'));
  } else {
    const { data } = await supabase
      .from('propietarios')
      .select('correo, nombre, celular')
      .eq('codigo_edificio', n.codigo_edificio)
      .eq('apartamento', n.destinatario);
    lista.push(...(data || []));
  }

  // Un mismo correo puede tener varios apartamentos: se envía una sola vez
  const vistos = new Set<string>();
  return lista
    .filter((d) => correoValido(d.correo))
    .map((d) => ({ ...d, correo: d.correo.trim().toLowerCase() }))
    .filter((d) => (vistos.has(d.correo) ? false : (vistos.add(d.correo), true)));
}

function plantilla(n: Notificacion, edificio: string, nombre?: string) {
  const appUrl = Deno.env.get('APP_URL');
  const saludo = nombre ? `Hola ${escapar(nombre.split(' ')[0])},` : 'Hola,';
  const boton = appUrl
    ? `<p style="margin:28px 0 0"><a href="${escapar(appUrl)}" style="background:#0F172A;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block">Abrir Kuota</a></p>`
    : '';
  return `<!doctype html>
<html lang="es"><body style="margin:0;background:#f1f5f9;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
        <tr><td style="background:#0F172A;padding:20px 28px">
          <div style="color:#ffffff;font-size:20px;font-weight:700">Kuota</div>
          <div style="color:#94a3b8;font-size:13px">${escapar(edificio)}</div>
        </td></tr>
        <tr><td style="padding:28px">
          <p style="margin:0 0 12px;color:#475569;font-size:15px">${saludo}</p>
          <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#0f172a">${escapar(n.titulo)}</h1>
          <p style="margin:0;font-size:15px;line-height:1.6;color:#334155;white-space:pre-line">${escapar(n.mensaje)}</p>
          ${boton}
        </td></tr>
        <tr><td style="padding:16px 28px;background:#f8fafc;color:#94a3b8;font-size:12px">
          Recibes este correo porque estás registrado en Kuota para ${escapar(edificio)}. También puedes ver este aviso en la app.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function enviarCorreos(n: Notificacion, destinatarios: Destinatario[], edificio: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) throw new Error('Falta el secreto RESEND_API_KEY');
  const from = Deno.env.get('EMAIL_FROM') || 'Kuota <onboarding@resend.dev>';
  const subject = `${n.titulo} · ${edificio}`;

  // Resend acepta hasta 100 correos por lote; cada destinatario recibe el suyo (no ve a los demás)
  let enviados = 0;
  for (let i = 0; i < destinatarios.length; i += 100) {
    const lote = destinatarios.slice(i, i + 100).map((d) => ({
      from,
      to: [d.correo],
      subject,
      html: plantilla(n, edificio, d.nombre),
      text: `${n.titulo}\n\n${n.mensaje}\n\n— Kuota · ${edificio}`,
    }));
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(lote),
    });
    if (!res.ok) throw new Error(`Resend respondió ${res.status}: ${await res.text()}`);
    enviados += lote.length;
  }
  return enviados;
}

/**
 * PRÓXIMAMENTE: avisos por SMS o WhatsApp.
 * Cuando elijas proveedor (Twilio, WhatsApp Cloud API, etc.) implementa el envío aquí
 * y define el secreto SMS_ENABLED=true. Los celulares ya se resuelven en "destinatarios".
 */
async function enviarSMS(_n: Notificacion, destinatarios: Destinatario[]) {
  if (Deno.env.get('SMS_ENABLED') !== 'true') return 0;
  const celulares = destinatarios.map((d) => d.celular).filter(Boolean);
  console.log(`[SMS pendiente de implementar] ${celulares.length} celulares`);
  return 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const secreto = Deno.env.get('WEBHOOK_SECRET');
  if (secreto && req.headers.get('x-kuota-secret') !== secreto) return json({ error: 'No autorizado' }, 401);

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }

  // Formato de los Database Webhooks de Supabase: { type, table, record, ... }
  const id: string | undefined = payload?.record?.id;
  if (payload?.type !== 'INSERT' || !id) return json({ ok: true, omitido: 'no es un INSERT' });

  // Seguridad sin clave compartida: NO se confía en el contenido recibido.
  // Se "reserva" la notificación real en la base (solo si nunca se envió) y se usa
  // lo que hay guardado. Así, una llamada falsa o repetida no puede inventar
  // mensajes ni reenviar el mismo aviso dos veces.
  const { data: reservada, error: errReserva } = await supabase
    .from('notificaciones')
    .update({ correo_enviado_at: new Date().toISOString() })
    .eq('id', id)
    .is('correo_enviado_at', null)
    .neq('enviar_correo', false)
    .select('id, codigo_edificio, tipo, titulo, mensaje, destinatario, enviar_correo')
    .maybeSingle();
  if (errReserva) return json({ ok: false, error: errReserva.message }, 500);
  if (!reservada) return json({ ok: true, omitido: 'ya enviada, sin correo o inexistente' });
  const n = reservada as Notificacion;

  try {
    const [{ data: edif }, destinatarios] = await Promise.all([
      supabase.from('edificios').select('descripcion').eq('codigo_edificio', n.codigo_edificio).maybeSingle(),
      resolverDestinatarios(n),
    ]);
    const edificio = edif?.descripcion || n.codigo_edificio;

    if (destinatarios.length === 0) return json({ ok: true, enviados: 0, motivo: 'sin correos registrados' });

    const enviados = await enviarCorreos(n, destinatarios, edificio);
    const sms = await enviarSMS(n, destinatarios);

    return json({ ok: true, enviados, sms });
  } catch (e) {
    console.error('Error enviando aviso', n.id, e);
    // Se libera la reserva para que pueda reintentarse
    await supabase.from('notificaciones').update({ correo_enviado_at: null }).eq('id', n.id);
    return json({ ok: false, error: String((e as Error).message || e) }, 500);
  }
});
