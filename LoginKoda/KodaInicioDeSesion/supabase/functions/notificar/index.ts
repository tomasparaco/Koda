// =====================================================================
// KUOTA · Función "notificar"
// Se ejecuta con cada fila nueva en la tabla "notificaciones" (Database Webhook)
// y envía el aviso por correo a los destinatarios. Preparada para SMS/WhatsApp.
//
// Variables (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY   Clave de https://resend.com (obligatoria)
//   EMAIL_FROM       Remitente, ej: "Kuota <avisos@avisos.tudominio.com>"
//                    (mientras no verifiques un dominio usa "Kuota <onboarding@resend.dev>",
//                     que solo puede enviar al correo dueño de la cuenta de Resend)
//   EMAIL_REPLY_TO   (opcional) correo que recibe las respuestas de los vecinos.
//                    Si no se define, se usa el correo de la junta del edificio.
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
  apartamentos: string[];
}

interface Fila {
  correo: string | null;
  nombre?: string | null;
  celular?: string | null;
  apartamento?: string | null;
}

interface ResultadoEnvio {
  enviados: number;
  fallidos: { correo: string; error: string }[];
}

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

const escapar = (t: string) =>
  String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

// Se ignoran dominios reservados para pruebas y ejemplos (RFC 2606): no son buzones reales
const DOMINIO_PRUEBA = /(\.(test|example|invalid|localhost)|@(.+\.)?example\.(com|net|org))$/i;
const correoValido = (c?: string | null) =>
  !!c && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.trim()) && !DOMINIO_PRUEBA.test(c.trim());

/** Quién debe recibir la notificación según su "destinatario". */
async function resolverDestinatarios(n: Notificacion): Promise<Destinatario[]> {
  const filas: Fila[] = [];

  if (n.destinatario === 'admin') {
    const { data: junta } = await supabase
      .from('propietarios')
      .select('correo, nombre, celular')
      .eq('codigo_edificio', n.codigo_edificio)
      .eq('rol', 'admin');
    filas.push(...(junta || []));
    const { data: admins } = await supabase
      .from('administradora_edificios')
      .select('correo, nombre, celular')
      .eq('codigo_edificio', n.codigo_edificio);
    filas.push(...(admins || []));
  } else if (n.destinatario === 'usuarios') {
    const { data } = await supabase
      .from('propietarios')
      .select('correo, nombre, celular, rol, apartamento')
      .eq('codigo_edificio', n.codigo_edificio);
    filas.push(...(data || []).filter((p) => p.rol !== 'admin'));
  } else {
    const { data } = await supabase
      .from('propietarios')
      .select('correo, nombre, celular, apartamento')
      .eq('codigo_edificio', n.codigo_edificio)
      .eq('apartamento', n.destinatario);
    filas.push(...(data || []));
  }

  // Un mismo correo puede tener varios apartamentos: se envía una sola vez y se mencionan todos
  const porCorreo = new Map<string, Destinatario>();
  for (const f of filas) {
    if (!correoValido(f.correo)) continue;
    const correo = f.correo!.trim().toLowerCase();
    const d = porCorreo.get(correo) ?? {
      correo,
      nombre: f.nombre ?? undefined,
      celular: f.celular ?? undefined,
      apartamentos: [],
    };
    if (f.apartamento && !d.apartamentos.includes(f.apartamento)) d.apartamentos.push(f.apartamento);
    porCorreo.set(correo, d);
  }
  return [...porCorreo.values()];
}

/** A dónde responden los vecinos: el secreto EMAIL_REPLY_TO o el correo de la junta del edificio. */
async function resolverReplyTo(codigoEdificio: string): Promise<string | undefined> {
  const fijo = Deno.env.get('EMAIL_REPLY_TO');
  if (correoValido(fijo)) return fijo!.trim();
  const { data } = await supabase
    .from('propietarios')
    .select('correo')
    .eq('codigo_edificio', codigoEdificio)
    .eq('rol', 'admin');
  return (data || []).map((p) => p.correo).find(correoValido)?.trim();
}

/** Asunto concreto: qué pasó, en qué edificio y, si aplica, para qué apartamento. */
function asunto(n: Notificacion, edificio: string, d: Destinatario) {
  const aptos = d.apartamentos.length ? ` — ${d.apartamentos.join(', ')}` : '';
  return `${n.titulo} · ${edificio}${aptos}`;
}

function plantilla(n: Notificacion, edificio: string, d: Destinatario, replyTo?: string) {
  const appUrl = Deno.env.get('APP_URL');
  const saludo = d.nombre ? `Hola ${escapar(d.nombre.split(' ')[0])},` : 'Hola,';
  const aptos = d.apartamentos.length ? ` (${escapar(d.apartamentos.join(', '))})` : '';
  const boton = appUrl
    ? `<p style="margin:28px 0 0"><a href="${escapar(appUrl)}" style="background:#0F172A;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block">Abrir Kuota</a></p>`
    : '';
  const contacto = replyTo
    ? ` Si tienes dudas, responde a este correo. Si no quieres recibir estos avisos por correo, escríbenos a ${escapar(replyTo)}.`
    : '';
  return `<!doctype html>
<html lang="es"><body style="margin:0;background:#f1f5f9;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
        <tr><td style="background:#0F172A;padding:20px 28px">
          <div style="color:#ffffff;font-size:20px;font-weight:700">Kuota</div>
          <div style="color:#94a3b8;font-size:13px">${escapar(edificio)}${aptos}</div>
        </td></tr>
        <tr><td style="padding:28px">
          <p style="margin:0 0 12px;color:#475569;font-size:15px">${saludo}</p>
          <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;color:#0f172a">${escapar(n.titulo)}</h1>
          <p style="margin:0;font-size:15px;line-height:1.6;color:#334155;white-space:pre-line">${escapar(n.mensaje)}</p>
          ${boton}
        </td></tr>
        <tr><td style="padding:16px 28px;background:#f8fafc;color:#94a3b8;font-size:12px">
          Recibes este correo porque estás registrado en Kuota para ${escapar(edificio)}${aptos}. También puedes ver este aviso en la app.${contacto}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function textoPlano(n: Notificacion, edificio: string, d: Destinatario, replyTo?: string) {
  const saludo = d.nombre ? `Hola ${d.nombre.split(' ')[0]},` : 'Hola,';
  const aptos = d.apartamentos.length ? ` (${d.apartamentos.join(', ')})` : '';
  const appUrl = Deno.env.get('APP_URL');
  return [
    saludo,
    '',
    n.titulo,
    '',
    n.mensaje,
    appUrl ? `\nAbrir Kuota: ${appUrl}` : '',
    '',
    `— Kuota · ${edificio}${aptos}`,
    replyTo ? `Dudas o baja de estos avisos: ${replyTo}` : '',
  ]
    .filter((l, i, a) => !(l === '' && a[i - 1] === ''))
    .join('\n');
}

async function llamarResend(apiKey: string, ruta: '/emails' | '/emails/batch', cuerpo: unknown) {
  const res = await fetch(`https://api.resend.com${ruta}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
  return { ok: res.ok, status: res.status, texto: res.ok ? '' : await res.text() };
}

/**
 * Envía un correo personalizado a cada destinatario.
 * Primero intenta por lotes (rápido). Si Resend rechaza un lote completo por un solo
 * destinatario (por ejemplo en modo de prueba, que solo deja enviar al dueño de la cuenta),
 * reintenta ese lote uno por uno para que los demás sí reciban su correo.
 */
async function enviarCorreos(
  n: Notificacion,
  destinatarios: Destinatario[],
  edificio: string,
  replyTo?: string,
): Promise<ResultadoEnvio> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) throw new Error('Falta el secreto RESEND_API_KEY');
  const from = Deno.env.get('EMAIL_FROM') || 'Kuota <onboarding@resend.dev>';

  const correoPara = (d: Destinatario) => ({
    from,
    to: [d.correo],
    subject: asunto(n, edificio, d),
    html: plantilla(n, edificio, d, replyTo),
    text: textoPlano(n, edificio, d, replyTo),
    ...(replyTo
      ? {
          reply_to: replyTo,
          headers: {
            'List-Unsubscribe': `<mailto:${replyTo}?subject=${encodeURIComponent('Baja de avisos Kuota')}>`,
          },
        }
      : {}),
  });

  const resultado: ResultadoEnvio = { enviados: 0, fallidos: [] };

  for (let i = 0; i < destinatarios.length; i += 100) {
    const grupo = destinatarios.slice(i, i + 100);
    const lote = await llamarResend(apiKey, '/emails/batch', grupo.map(correoPara));
    if (lote.ok) {
      resultado.enviados += grupo.length;
      continue;
    }

    // Errores del servidor o de la clave afectan a todos: no tiene sentido seguir uno por uno
    if (lote.status === 401 || lote.status >= 500) {
      throw new Error(`Resend respondió ${lote.status}: ${lote.texto}`);
    }

    console.warn(`Lote rechazado (${lote.status}), se reintenta uno por uno: ${lote.texto}`);
    for (const d of grupo) {
      let r = await llamarResend(apiKey, '/emails', correoPara(d));
      if (r.status === 429) {
        // Límite de velocidad de Resend: se espera y se reintenta una vez
        await esperar(1500);
        r = await llamarResend(apiKey, '/emails', correoPara(d));
      }
      if (r.ok) resultado.enviados++;
      else resultado.fallidos.push({ correo: d.correo, error: `${r.status}: ${r.texto.slice(0, 200)}` });
      await esperar(550); // Resend permite ~2 envíos por segundo en el plan gratuito
    }
  }
  return resultado;
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

  const liberar = () => supabase.from('notificaciones').update({ correo_enviado_at: null }).eq('id', n.id);

  try {
    const [{ data: edif }, destinatarios, replyTo] = await Promise.all([
      supabase.from('edificios').select('descripcion').eq('codigo_edificio', n.codigo_edificio).maybeSingle(),
      resolverDestinatarios(n),
      resolverReplyTo(n.codigo_edificio),
    ]);
    const edificio = edif?.descripcion || n.codigo_edificio;

    if (destinatarios.length === 0) return json({ ok: true, enviados: 0, motivo: 'sin correos registrados' });

    const { enviados, fallidos } = await enviarCorreos(n, destinatarios, edificio, replyTo);
    const sms = await enviarSMS(n, destinatarios);

    if (fallidos.length) console.warn('Correos no enviados', n.id, JSON.stringify(fallidos));

    // Si no salió ninguno se libera la reserva para poder reintentar; si salió al menos uno
    // se deja marcado para no duplicar los que sí llegaron.
    if (enviados === 0) {
      await liberar();
      return json({ ok: false, enviados, fallidos }, 500);
    }
    return json({ ok: true, enviados, fallidos, sms });
  } catch (e) {
    console.error('Error enviando aviso', n.id, e);
    await liberar();
    return json({ ok: false, error: String((e as Error).message || e) }, 500);
  }
});
