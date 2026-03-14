import { useState, useEffect, FormEvent, useCallback } from 'react';
import {
  MessageSquare, Vote, Wrench, Eye, Edit, Trash2, Send, CheckCircle,
  Settings, Upload, Plus, FileText, Phone, X, AlertTriangle, ChevronDown, Star
} from 'lucide-react';
import { ComunidadService, DocumentoCondominio, ContactoEmergencia } from '../../services/comunidad.service';
import { TicketService, Ticket } from '../../services/ticket.service';
import { EncuestaService } from '../../services/encuesta.service'; // <-- SERVICIO REAL IMPORTADO
import type { Propietario } from '../../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

interface ComunidadViewProps {
  propiedad: Propietario;
  onNavigateToVotaciones?: () => void; // <-- PARA EL ENLACE AL CREADOR DE ENCUESTAS
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PREFIJOS_VE = ['0424', '0414', '0416', '0422', '0412', '0426'];

// ─── Toast ────────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error';
interface Toast { id: number; msg: string; type: ToastType }

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
interface ConfirmState {
  open: boolean;
  title: string;
  body: string;
  onConfirm: () => void;
}

export function ComunidadView({ propiedad, onNavigateToVotaciones }: ComunidadViewProps) {
  const [subTab, setSubTab] = useState<'comunicados' | 'votaciones' | 'tickets' | 'configuraciones'>('comunicados');

  // ── Toasts ──────────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<Toast[]>([]);
  let toastId = 0;
  const showToast = useCallback((msg: string, type: ToastType = 'success') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  // ── Confirm ─────────────────────────────────────────────────────────────────
  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false, title: '', body: '', onConfirm: () => {}
  });
  const askConfirm = (title: string, body: string, onConfirm: () => void) =>
    setConfirm({ open: true, title, body, onConfirm });
  const closeConfirm = () => setConfirm(prev => ({ ...prev, open: false }));

  // ── Preview ─────────────────────────────────────────────────────────────────
  const [previewDoc, setPreviewDoc] = useState<DocumentoCondominio | null>(null);

  // ── Stubs para pestañas existentes ─────────────────────────────────────────
  const comunicados = [
    { id: 1, titulo: 'Corte de Agua Programado', fecha: '2026-02-10', vistos: 25, total: 30 },
    { id: 2, titulo: 'Reunión de Junta Directiva', fecha: '2026-02-05', vistos: 28, total: 30 },
    { id: 3, titulo: 'Mantenimiento de Ascensores', fecha: '2026-02-01', vistos: 30, total: 30 },
  ];
  
  // <-- AQUÍ GUARDAMOS LAS VOTACIONES REALES DE LA BDD
  const [votacionesReales, setVotacionesReales] = useState<any[]>([]);

  const [tickets, setTickets] = useState<Ticket[]>([]);

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'bg-red-500/20 text-red-400';
      case 'en_proceso': return 'bg-yellow-500/20 text-yellow-400';
      case 'cerrado': return 'bg-green-500/20 text-green-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };
  const getEstadoTexto = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'Pendiente';
      case 'en_proceso': return 'En Proceso';
      case 'cerrado': return 'Cerrado';
      default: return estado;
    }
  };

  // ── Configuraciones: estado ─────────────────────────────────────────────────
  const [documentos, setDocumentos] = useState<DocumentoCondominio[]>([]);
  const [contactos, setContactos] = useState<ContactoEmergencia[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [docTitulo, setDocTitulo] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [contNombre, setContNombre] = useState('');
  const [contPrefijo, setContPrefijo] = useState('0424');
  const [contNumero, setContNumero] = useState('');
  const [showPrefixDropdown, setShowPrefixDropdown] = useState(false);

  // ── Tickets: estado ─────────────────────────────────────────────────────────
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketNotaAdmin, setTicketNotaAdmin] = useState('');
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketFilter, setTicketFilter] = useState<'todos' | 'abierto' | 'en_proceso' | 'cerrado' | 'rechazado'>('todos');
  const [ticketEvidenciaArchivo, setTicketEvidenciaArchivo] = useState<File | null>(null);

  useEffect(() => {
    if (propiedad.codigo_edificio) {
      cargarConfiguraciones();
      cargarVotacionesReales();
    }
  }, [propiedad.codigo_edificio]);

  const cargarVotacionesReales = async () => {
    const data = await EncuestaService.getEncuestas(propiedad.codigo_edificio!);
    const actualizadas = data.map(enc => {
      if (enc.activa && new Date(enc.fecha_cierre) < new Date()) {
        enc.activa = false;
        EncuestaService.cerrarEncuesta(enc.id);
      }
      return enc;
    });
    setVotacionesReales(actualizadas);
  };

  const cargarConfiguraciones = async () => {
    const resDocs = await ComunidadService.getDocumentos(propiedad.codigo_edificio!);
    if (resDocs.exito) setDocumentos(resDocs.data);

    const resCont = await ComunidadService.getContactos(propiedad.codigo_edificio!);
    if (resCont.exito) setContactos(resCont.data);

    const resTickets = await TicketService.getTicketsByEdificio(propiedad.codigo_edificio!);
    if (resTickets.exito) setTickets(resTickets.data);
  };

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSubirDocumento = async (e: FormEvent) => {
    e.preventDefault();
    if (!docFile || !docTitulo) {
      showToast('Debes ingresar un título y seleccionar un archivo.', 'error');
      return;
    }
    askConfirm(
      'Subir documento',
      `¿Estás seguro de subir el documento "${docTitulo}"? Quedará visible para todos los copropietarios.`,
      async () => {
        setIsLoading(true);
        const result = await ComunidadService.addDocumento(
          { titulo: docTitulo, codigo_edificio: propiedad.codigo_edificio! },
          docFile!
        );
        setIsLoading(false);
        if (result.exito && result.data) {
          setDocumentos(prev => [result.data!, ...prev]);
          setDocTitulo('');
          setDocFile(null);
          showToast('✅ Documento subido correctamente.', 'success');
        } else {
          showToast('Error al subir el documento: ' + result.mensaje, 'error');
        }
      }
    );
  };

  const handleEliminarDocumento = (id: number, url: string, titulo: string) => {
    askConfirm(
      'Eliminar documento',
      `¿Estás seguro de eliminar "${titulo}"? Esta acción no se puede deshacer.`,
      async () => {
        setIsLoading(true);
        const result = await ComunidadService.deleteDocumento(id, url);
        setIsLoading(false);
        if (result.exito) {
          setDocumentos(prev => prev.filter(d => d.id !== id));
          showToast('Documento eliminado correctamente.', 'success');
        } else {
          showToast('Error al eliminar: ' + result.mensaje, 'error');
        }
      }
    );
  };

  const handleAñadirContacto = async (e: FormEvent) => {
    e.preventDefault();
    if (!contNombre || contNumero.length !== 7) {
      showToast('El nombre y un número de 7 dígitos son obligatorios.', 'error');
      return;
    }
    const telefonoCompleto = `${contPrefijo}${contNumero}`;
    askConfirm(
      'Añadir contacto',
      `¿Estás seguro de añadir a "${contNombre}" (${telefonoCompleto}) como contacto de emergencia?`,
      async () => {
        setIsLoading(true);
        const result = await ComunidadService.addContacto({
          codigo_edificio: propiedad.codigo_edificio!,
          nombre: contNombre,
          telefono: telefonoCompleto,
        });
        setIsLoading(false);
        if (result.exito && result.data) {
          setContactos(prev => [...prev, result.data!]);
          setContNombre('');
          setContNumero('');
          setContPrefijo('0424');
          showToast('✅ Contacto añadido correctamente.', 'success');
        } else {
          showToast('Error al añadir contacto: ' + result.mensaje, 'error');
        }
      }
    );
  };

  const handleEliminarContacto = (id: number, nombre: string) => {
    askConfirm(
      'Eliminar contacto',
      `¿Estás seguro de eliminar el contacto "${nombre}"? Esta acción no se puede deshacer.`,
      async () => {
        setIsLoading(true);
        const result = await ComunidadService.deleteContacto(id);
        setIsLoading(false);
        if (result.exito) {
          setContactos(prev => prev.filter(c => c.id !== id));
          showToast('Contacto eliminado correctamente.', 'success');
        } else {
          showToast('Error al eliminar: ' + result.mensaje, 'error');
        }
      }
    );
  };

  const handleUpdateTicketStatus = async (nuevoEstado: string) => {
    if (!selectedTicket || !selectedTicket.id_ticket) return;
    
    // Validación: si se rechaza, la nota es obligatoria
    if (nuevoEstado === 'rechazado' && (!ticketNotaAdmin || ticketNotaAdmin.trim() === '')) {
      alert('Debes escribir un motivo para poder rechazar esta solicitud.');
      showToast('Error: falta el motivo.', 'error');
      return;
    }

    // Validación de flujo estricto
    if (nuevoEstado === 'cerrado' && selectedTicket.estado !== 'en_proceso') {
      alert('Solo se puede marcar como Cerrado/Resuelto si el ticket está actualmente "En Proceso".');
      showToast('El ticket debe estar En Proceso primero.', 'error');
      return;
    }
    if (nuevoEstado === 'cerrado' && (!ticketNotaAdmin || ticketNotaAdmin.trim() === '')) {
      alert('Debes escribir una nota de resolución justificando cómo se cerró el ticket.');
      showToast('Error: falta nota de resolución.', 'error');
      return;
    }
    if (nuevoEstado === 'abierto' && selectedTicket.estado !== 'abierto') {
      alert('Un ticket no puede retroceder a estado Abierto una vez ha comenzado a procesarse o ha sido cerrado.');
      showToast('Flujo inválido.', 'error');
      return;
    }

    setTicketLoading(true);
    // Para conservar el estado actual (ej: solo actualizar la nota estando "en proceso")
    const estadoAEviar = nuevoEstado === 'mantener' ? selectedTicket.estado : nuevoEstado;
    const result = await TicketService.updateTicketStatus(selectedTicket.id_ticket, estadoAEviar, ticketNotaAdmin, ticketEvidenciaArchivo);
    setTicketLoading(false);

    if (result.exito) {
      setTickets(prev => prev.map(t => 
        t.id_ticket === selectedTicket.id_ticket 
          ? { ...t, estado: estadoAEviar as any, nota_admin: ticketNotaAdmin } 
          : t
      ));
      showToast('Estado del ticket actualizado con éxito.', 'success');
      
      const propInfo = selectedTicket.propietarios as any;
      if (propInfo?.correo) {
        try {
          const estadoLegible = 
            estadoAEviar === 'en_proceso' ? 'En Proceso' :
            estadoAEviar === 'cerrado' ? 'Resuelto/Cerrado' :
            estadoAEviar === 'rechazado' ? 'Rechazado' : 'Abierto';

          await fetch("https://formsubmit.co/ajax/" + propInfo.correo, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json"
            },
            body: JSON.stringify({
              _subject: `Actualización de su Ticket #${selectedTicket.id_ticket} - Koda Mantenimiento`,
              _template: "table",
              "Asunto del Ticket": selectedTicket.titulo,
              "Nuevo Estado": estadoLegible,
              "Respuesta Administración": ticketNotaAdmin || "No se ha proporcionado nota adicional."
            })
          });
          showToast('Notificación enviada al residente por correo.', 'success');
        } catch (error) {
          console.error("Error al enviar notificación de ticket:", error);
          showToast('No se pudo enviar la notificación por correo al residente.', 'error');
        }
      } else {
        showToast('El residente no tiene correo registrado para notificar.', 'error');
      }

      setTicketEvidenciaArchivo(null);
      setSelectedTicket(null); 
    } else {
      showToast('Error al actualizar ticket: ' + result.mensaje, 'error');
    }
  };

  return (
    <div className="space-y-6">

      {/* ── TOASTS ─────────────────────────────────────────────────────────── */}
      <div className="fixed top-5 right-5 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white text-sm font-semibold backdrop-blur-md border transition-all animate-in slide-in-from-top-4 fade-in duration-300 ${
              t.type === 'success'
                ? 'bg-green-600/95 border-green-400/40'
                : 'bg-red-600/95 border-red-400/40'
            }`}
          >
            {t.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
            {t.msg}
          </div>
        ))}
      </div>

      {/* ── CONFIRM MODAL ──────────────────────────────────────────────────── */}
      {confirm.open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeConfirm} />
          <div className="relative bg-[#0f172a] border border-white/20 rounded-3xl p-7 w-full max-w-sm shadow-2xl animate-in zoom-in-95 fade-in duration-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-yellow-500/20 p-2.5 rounded-xl border border-yellow-500/30">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
              </div>
              <h3 className="text-white font-bold text-lg">{confirm.title}</h3>
            </div>
            <p className="text-white/70 text-sm mb-6 leading-relaxed">{confirm.body}</p>
            <div className="flex gap-3">
              <button
                onClick={closeConfirm}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-colors border border-white/10"
              >
                Cancelar
              </button>
              <button
                onClick={() => { closeConfirm(); confirm.onConfirm(); }}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PREVIEW MODAL ──────────────────────────────────────────────────── */}
      {previewDoc && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-8">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewDoc(null)} />
          <div className="relative bg-[#0f172a] rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-white/20 overflow-hidden shadow-2xl animate-in zoom-in-95 fade-in duration-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-5 py-4 flex items-center justify-between shrink-0">
              <h3 className="text-white font-semibold flex items-center gap-2 truncate">
                <FileText className="w-5 h-5 shrink-0" /> {previewDoc.titulo}
              </h3>
              <button onClick={() => setPreviewDoc(null)} className="ml-4 p-1.5 rounded-full hover:bg-white/20 transition-colors shrink-0">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden bg-black/40 min-h-[60vh]">
              {previewDoc.formato === 'PDF' ? (
                <iframe
                  src={previewDoc.url_archivo}
                  title={previewDoc.titulo}
                  className="w-full h-full min-h-[60vh]"
                  style={{ border: 'none' }}
                />
              ) : (
                <div className="flex items-center justify-center h-full p-4">
                  <img
                    src={previewDoc.url_archivo}
                    alt={previewDoc.titulo}
                    className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-2xl"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── SUB-PESTAÑAS ───────────────────────────────────────────────────── */}
      <div className="flex gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-2 overflow-x-auto">
        {([
          { key: 'comunicados', label: 'Comunicados', Icon: MessageSquare },
          { key: 'votaciones',  label: 'Votaciones',  Icon: Vote },
          { key: 'tickets',     label: 'Tickets',     Icon: Wrench },
          { key: 'configuraciones', label: 'Configuración', Icon: Settings },
        ] as const).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setSubTab(key as any)}
            className={`flex-1 min-w-[110px] py-3 px-2 rounded-xl font-semibold transition-all ${
              subTab === key ? 'bg-white text-blue-600' : 'text-white hover:bg-white/10'
            }`}
          >
            <Icon className="w-5 h-5 mx-auto mb-1" />
            {label}
            {key === 'tickets' && tickets.filter(t => t.estado === 'abierto' || t.estado === 'en_proceso').length > 0 && (
              <span className="absolute top-2 right-2 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── COMUNICADOS ────────────────────────────────────────────────────── */}
      {subTab === 'comunicados' && (
        <section className="animate-in fade-in">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" /> Archivo de Comunicados
          </h2>
          <div className="space-y-3">
            {comunicados.map(c => (
              <div key={c.id} className="bg-white/10 border border-white/20 rounded-2xl p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1">{c.titulo}</h3>
                    <p className="text-sm text-blue-200">Enviado el {new Date(c.fecha).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm bg-white/10 px-3 py-1 rounded-full">
                    <Eye className="w-4 h-4" /> <span>{c.vistos}/{c.total}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-semibold flex justify-center items-center gap-2 transition-colors"><Edit className="w-4 h-4"/> Editar</button>
                  <button className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-semibold flex justify-center items-center gap-2 transition-colors"><Send className="w-4 h-4"/> Reenviar</button>
                  <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── VOTACIONES ─────────────────────────────────────────────────────── */}
      {subTab === 'votaciones' && (
        <section className="animate-in fade-in">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Resultados de Votaciones</h2>
            {onNavigateToVotaciones && (
              <button 
                onClick={onNavigateToVotaciones}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-purple-500/20 transition-colors"
              >
                Gestionar / Nueva
              </button>
            )}
          </div>
          
          <div className="space-y-4">
            {votacionesReales.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-white/50">
                No hay encuestas registradas en este edificio.
              </div>
            ) : votacionesReales.map(enc => {
              const totalVotos = enc.votos?.length || 0;
              
              return (
                <div key={enc.id} className="bg-white/10 border border-white/20 rounded-2xl p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-white">{enc.pregunta}</h3>
                      <span className="text-white/50 text-sm">Cierre: {new Date(enc.fecha_cierre).toLocaleString()}</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${enc.activa ? 'bg-green-500' : 'bg-gray-500'} text-white`}>
                      {enc.activa ? 'Activa' : 'Cerrada'}
                    </span>
                  </div>
                  <div className="space-y-3 mb-4">
                    {enc.opciones.map((op: string, idx: number) => {
                      // Colores estéticos por opción (similar al original que tenía verde/rojo)
                      const isYes = op.toLowerCase() === 'sí' || op.toLowerCase() === 'si' || idx === 0;
                      const isNo = op.toLowerCase() === 'no' || idx === 1;
                      const color = isYes ? 'bg-green-400' : (isNo ? 'bg-red-400' : 'bg-yellow-400');
                      const textColor = isYes ? 'text-green-400' : (isNo ? 'text-red-400' : 'text-yellow-400');

                      const votosOpcion = enc.votos?.filter((v: any) => v.opcion_seleccionada === op).length || 0;
                      const porcentaje = totalVotos === 0 ? 0 : Math.round((votosOpcion / totalVotos) * 100);
                      
                      return (
                        <div key={op}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className={`font-medium ${textColor}`}>{op}</span>
                            <span className="text-white/80">{votosOpcion} votos <span className="opacity-50">({porcentaje}%)</span></span>
                          </div>
                          <div className="w-full bg-white/20 rounded-full h-3">
                            <div className={`${color} h-full rounded-full transition-all duration-1000`} style={{ width: `${porcentaje}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {enc.activa && (
                    <button 
                      onClick={() => {
                        askConfirm(
                          'Cerrar Votación',
                          '¿Seguro que deseas cerrar la votación anticipadamente?',
                          async () => {
                            await EncuestaService.cerrarEncuesta(enc.id);
                            cargarVotacionesReales();
                          }
                        );
                      }}
                      className="w-full bg-blue-500 hover:bg-blue-600 transition-colors text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 mt-4"
                    >
                      <CheckCircle className="w-5 h-5"/> Cerrar Votación
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── TICKETS ────────────────────────────────────────────────────────── */}
      {subTab === 'tickets' && (
        <section className="animate-in fade-in">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Wrench className="w-5 h-5"/> Gestión de Mantenimiento
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
             <div onClick={() => setTicketFilter('todos')} className={`cursor-pointer border rounded-2xl p-3 text-center transition-all ${ticketFilter === 'todos' ? 'bg-blue-500/30 border-blue-500' : 'bg-white/5 hover:bg-white/10 border-white/10'}`}>
                <div className="text-2xl font-bold text-white">{tickets.length}</div>
                <div className="text-[10px] text-white/70 font-medium uppercase tracking-wider mt-1">Todos</div>
             </div>
             <div onClick={() => setTicketFilter('abierto')} className={`cursor-pointer border rounded-2xl p-3 text-center transition-all ${ticketFilter === 'abierto' ? 'bg-red-500/40 border-red-500' : 'bg-red-500/10 border-red-500/20 hover:bg-red-500/30'}`}>
               <div className="text-2xl font-bold text-red-400">{tickets.filter(t => t.estado === 'abierto').length}</div>
               <div className="text-[10px] text-red-300 font-medium uppercase tracking-wider mt-1">Abiertos</div>
             </div>
             <div onClick={() => setTicketFilter('en_proceso')} className={`cursor-pointer border rounded-2xl p-3 text-center transition-all ${ticketFilter === 'en_proceso' ? 'bg-yellow-500/40 border-yellow-500' : 'bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/30'}`}>
               <div className="text-2xl font-bold text-yellow-500">{tickets.filter(t => t.estado === 'en_proceso').length}</div>
               <div className="text-[10px] text-yellow-400 font-medium uppercase tracking-wider mt-1">En Proceso</div>
             </div>
             <div onClick={() => setTicketFilter('cerrado')} className={`cursor-pointer border rounded-2xl p-3 text-center transition-all ${ticketFilter === 'cerrado' ? 'bg-green-500/40 border-green-500' : 'bg-green-500/10 border-green-500/20 hover:bg-green-500/30'}`}>
               <div className="text-2xl font-bold text-green-400">{tickets.filter(t => t.estado === 'cerrado').length}</div>
               <div className="text-[10px] text-green-300 font-medium uppercase tracking-wider mt-1">Cerrados</div>
             </div>
             <div onClick={() => setTicketFilter('rechazado')} className={`cursor-pointer border rounded-2xl p-3 text-center transition-all ${ticketFilter === 'rechazado' ? 'bg-gray-500/40 border-gray-500' : 'bg-gray-500/10 border-gray-500/20 hover:bg-gray-500/30'}`}>
               <div className="text-2xl font-bold text-gray-400">{tickets.filter(t => t.estado === 'rechazado').length}</div>
               <div className="text-[10px] text-gray-300 font-medium uppercase tracking-wider mt-1">Rechazados</div>
             </div>
          </div>

          <div className="space-y-3">
            {(() => {
              const filteredTickets = ticketFilter === 'todos' ? tickets : tickets.filter(t => t.estado === ticketFilter);
              
              if (filteredTickets.length === 0) {
                return (
                 <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center text-white/50">
                   <Wrench className="w-12 h-12 mx-auto mb-3 opacity-50" />
                   <p>No hay tickets en esta categoría.</p>
                 </div>
                );
              }

              return filteredTickets.map(t => (
                <div key={t.id_ticket} className="bg-white/10 border border-white/20 rounded-2xl p-5 hover:bg-white/15 transition-colors group">
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div className="flex items-center gap-4">
                      {t.foto_url ? (
                        <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-white/10">
                          <img src={t.foto_url} alt="Evidencia" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-white/5 shrink-0 flex items-center justify-center border border-white/10">
                          <Wrench className="w-6 h-6 text-white/30" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg leading-tight">{t.titulo} <span className="text-[10px] uppercase font-bold text-white/50 bg-black/30 px-2 py-0.5 rounded-full tracking-wider">{t.prioridad}</span></h3>
                        </div>
                        <p className="text-sm text-blue-200">Apto {t.propietarios?.apartamento} • {t.propietarios?.nombre}</p>
                        {t.created_at && (
                          <p className="text-xs text-blue-200/50 mt-1">
                            Reportado el {new Date(t.created_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 self-end md:self-auto">
                      <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${getEstadoColor(t.estado)}`}>
                        {getEstadoTexto(t.estado)}
                      </span>
                      <button 
                        onClick={() => { 
                          setSelectedTicket(t); 
                          setTicketNotaAdmin(t.nota_admin || ''); 
                          setTicketEvidenciaArchivo(null); 
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
                      >
                        Ver Detalles
                      </button>
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </section>
      )}

      {/* ── MODAL DE DETALLE DEL TICKET ───────────────────────────────────── */}
      {selectedTicket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !ticketLoading && setSelectedTicket(null)} />
          <div className="relative bg-[#0f172a] rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-white/20 shadow-2xl animate-in zoom-in-95 fade-in duration-200">
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-4 flex items-center justify-between shrink-0 rounded-t-3xl">
              <div>
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  <Wrench className="w-5 h-5 shrink-0" />
                  Ticket #{selectedTicket.id_ticket}
                </h3>
              </div>
              <button 
                onClick={() => {
                  if (!ticketLoading) {
                    setSelectedTicket(null);
                    setTicketEvidenciaArchivo(null);
                  }
                }} 
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors shrink-0"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-white">
               {/* Metadata del Reporte */}
               <div className="flex flex-col md:flex-row gap-6">
                 {selectedTicket.foto_url && (
                    <div className="w-full md:w-1/3 shrink-0">
                      <a href={selectedTicket.foto_url} target="_blank" rel="noreferrer" className="block w-full aspect-square rounded-2xl overflow-hidden border border-white/20 hover:opacity-90 transition-opacity">
                        <img src={selectedTicket.foto_url} alt="Evidencia" className="w-full h-full object-cover" />
                      </a>
                    </div>
                 )}
                 <div className="flex-1 space-y-4">
                    <div>
                      <h4 className="text-2xl font-bold text-white mb-1">{selectedTicket.titulo}</h4>
                      <p className="text-blue-300 font-medium">Reportado por: Apto {selectedTicket.propietarios?.apartamento} ({selectedTicket.propietarios?.nombre})</p>
                      <p className="text-white/50 text-xs mt-1">Ubicación provista: {selectedTicket.ubicacion || 'No especificada'}</p>
                    </div>
                    
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <p className="text-sm text-blue-100 whitespace-pre-wrap">{selectedTicket.descripcion}</p>
                    </div>

                    {/* HU-33: Visor de Calificación del Usuario */}
                    {selectedTicket.calificacion && (
                      <div className="mt-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-4">
                        <h5 className="text-yellow-300 text-sm font-bold flex items-center gap-2 mb-2">
                          <Star className="w-4 h-4 fill-yellow-400" /> Calificación del Residente
                        </h5>
                        <div className="flex gap-1 mb-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              className={`w-5 h-5 ${star <= (selectedTicket.calificacion || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-white/20'}`} 
                            />
                          ))}
                        </div>
                        {selectedTicket.comentario_calificacion && (
                          <p className="text-white/80 text-sm italic">"{selectedTicket.comentario_calificacion}"</p>
                        )}
                      </div>
                    )}
                 </div>
               </div>

               <hr className="border-white/10" />

               {/* Acciones de Administrador */}
               <div>
                 <h4 className="text-lg font-bold mb-3 flex items-center gap-2"><Edit className="w-4 h-4 text-blue-400"/> Gestión del Administrador</h4>
                 
                 <div className="space-y-4">
                   <div>
                     <Label className="text-blue-200 mb-2 block">Nota o respuesta para el residente (Visible para ellos)</Label>
                     <textarea 
                        value={ticketNotaAdmin}
                        onChange={(e) => setTicketNotaAdmin(e.target.value)}
                        placeholder="Ej: Ya se llamó al plomero, vendrá mañana al mediodía..."
                        className="w-full h-24 bg-black/30 border border-white/20 rounded-xl p-3 text-white placeholder:text-white/30 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                     />
                   </div>

                   {selectedTicket.estado === 'en_proceso' && (
                     <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                       <Label className="text-blue-200 mb-2 block flex items-center gap-2">
                         <Upload className="w-4 h-4" /> Evidencia de Resolución (Opcional - solo aplica al Cerrar)
                       </Label>
                       <p className="text-xs text-white/50 mb-3">Si vas a marcar el ticket como Resuelto, puedes adjuntar una foto del trabajo finalizado.</p>
                       <Input 
                         type="file" 
                         accept="image/*" 
                         onChange={(e) => {
                           if (e.target.files && e.target.files[0]) {
                             setTicketEvidenciaArchivo(e.target.files[0]);
                           } else {
                             setTicketEvidenciaArchivo(null);
                           }
                         }}
                         className="bg-black/30 border-white/20 text-white file:text-white file:bg-blue-600 file:border-none file:rounded-lg file:px-4 file:py-1 hover:file:bg-blue-700 cursor-pointer"
                       />
                       
                       {ticketEvidenciaArchivo && (
                         <div className="mt-4 flex justify-center bg-black/40 rounded-xl p-2 border border-blue-500/20 shadow-inner">
                           <img 
                             src={URL.createObjectURL(ticketEvidenciaArchivo)} 
                             alt="Vista previa" 
                             className="max-h-48 object-contain rounded-lg"
                           />
                         </div>
                       )}
                     </div>
                   )}

                   <div className="flex flex-col sm:flex-row gap-3">
                     {/* Si el ticket es Abierto, se puede pasar a En Proceso o Rechazar */}
                     {selectedTicket.estado === 'abierto' && (
                       <>
                         <button
                           disabled={ticketLoading}
                           onClick={() => askConfirm('Marcar en Proceso', '¿Estás seguro de que deseas marcar este ticket como "En Proceso"?', () => handleUpdateTicketStatus('en_proceso'))}
                           className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                         >
                           {ticketLoading ? 'Procesando...' : <><Wrench className="w-4 h-4"/> Marcar En Proceso</>}
                         </button>
                         <button
                           disabled={ticketLoading}
                           onClick={() => askConfirm('Rechazar solicitud', '¿Estás seguro de que deseas rechazar este ticket?', () => handleUpdateTicketStatus('rechazado'))}
                           className="flex-1 bg-red-600/80 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 border border-red-500/30"
                         >
                           <X className="w-4 h-4"/> Rechazar
                         </button>
                       </>
                     )}

                     {/* Si el ticket es En Proceso, se puede Cerrar o Actualizar Nota */}
                     {selectedTicket.estado === 'en_proceso' && (
                       <>
                         <button
                           disabled={ticketLoading}
                           onClick={() => askConfirm('Marcar como Resuelto', '¿Estás seguro de que deseas marcar este ticket como resuelto? Una vez cerrado, no se podrán hacer más cambios.', () => handleUpdateTicketStatus('cerrado'))}
                           className="flex-1 bg-green-500 hover:bg-green-600 text-black px-4 py-2.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                         >
                           {ticketLoading ? 'Cerrando...' : <><CheckCircle className="w-4 h-4"/> Resuelto / Cerrar Ticket</>}
                         </button>
                         <button
                           disabled={ticketLoading}
                           onClick={() => askConfirm('Guardar Nota', '¿Estás seguro de que deseas actualizar la nota actual para el residente?', () => handleUpdateTicketStatus('mantener'))}
                           className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 border border-transparent hover:border-white/20"
                         >
                           <Edit className="w-4 h-4"/> Guardar Nota Actual
                         </button>
                       </>
                     )}
                     
                     {/* Si ya está Cerrado o Rechazado, no proveemos botones de cambio de flujo para cumplir con HU-34 */}
                     {(selectedTicket.estado === 'cerrado' || selectedTicket.estado === 'rechazado') && (
                        <div className="w-full text-center text-sm text-white/50 bg-white/5 p-3 rounded-xl border border-white/5">
                          Este ticket está finalizado y no se admiten más operaciones.
                        </div>
                     )}
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIGURACIONES ────────────────────────────────────────────────── */}
      {subTab === 'configuraciones' && (
        <section className="animate-in fade-in space-y-8">

          {/* Documentos */}
          <div className="bg-black/20 border border-white/10 p-6 rounded-3xl backdrop-blur-md">
            <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-400" /> Documentos y Normativas
            </h2>
            <p className="text-blue-100 text-sm mb-6">Sube reglamentos, estatutos o normas del condominio. Los copropietarios podrán verlos y descargarlos.</p>

            <form onSubmit={handleSubirDocumento} className="bg-white/5 p-4 rounded-2xl mb-6 flex flex-col md:flex-row gap-4 items-end border border-white/5">
              <div className="flex-1 w-full">
                <Label className="text-blue-200 mb-1 block">Título del Documento</Label>
                <Input value={docTitulo} onChange={e => setDocTitulo(e.target.value)} placeholder="Ej: Normas de Convivencia" required className="bg-white/10 border-white/20" />
              </div>
              <div className="flex-1 w-full">
                <Label className="text-blue-200 mb-1 block">Archivo (PDF, JPG)</Label>
                <Input type="file" onChange={e => setDocFile(e.target.files?.[0] || null)} required accept=".pdf,image/*" className="bg-white/10 border-white/20 text-blue-100" />
              </div>
              <Button disabled={isLoading} type="submit" className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 h-[40px] px-8 shrink-0">
                {isLoading ? 'Subiendo...' : <><Upload className="w-4 h-4 mr-2" /> Subir</>}
              </Button>
            </form>

            {documentos.length === 0 ? (
              <p className="text-center text-white/40 py-6 text-sm">No hay documentos aún. Los propietarios verán esta sección vacía.</p>
            ) : (
              <div className="space-y-3">
                {documentos.map(doc => (
                  <div key={doc.id} className="bg-white/10 p-4 rounded-2xl flex items-center gap-3 border border-white/10 hover:bg-white/[0.13] transition-colors">
                    <div className="bg-blue-500/20 p-3 rounded-xl border border-blue-500/30 shrink-0">
                      <FileText className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white truncate">{doc.titulo}</h4>
                      <div className="text-xs text-white/60 mt-0.5 flex gap-2 flex-wrap items-center">
                        <span className="bg-blue-900/50 px-2 py-0.5 rounded-full">{doc.formato}</span>
                        <span>{doc.tamano_archivo}</span>
                        {doc.created_at && (
                          <>
                            <span>•</span>
                            <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-blue-200 text-xs font-semibold transition-colors border border-white/10"
                      >
                        <Eye className="w-3.5 h-3.5" /> Ver
                      </button>
                      <button
                        onClick={() => doc.id && handleEliminarDocumento(doc.id, doc.url_archivo, doc.titulo)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-500/20 hover:bg-red-500/40 rounded-xl text-red-300 text-xs font-semibold transition-colors border border-red-500/20"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contactos */}
          <div className="bg-black/20 border border-white/10 p-6 rounded-3xl backdrop-blur-md">
            <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
              <Phone className="w-6 h-6 text-purple-400" /> Contactos de Emergencia
            </h2>
            <p className="text-blue-100 text-sm mb-6">Añade teléfonos útiles para los copropietarios: Policía, Vigilancia, Administración, etc.</p>

            <form onSubmit={handleAñadirContacto} className="bg-white/5 p-4 rounded-2xl mb-6 flex flex-col gap-4 border border-white/5">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Label className="text-blue-200 mb-1 block">Nombre / Cargo</Label>
                  <Input value={contNombre} onChange={e => setContNombre(e.target.value)} placeholder="Ej: Bomberos" required className="bg-white/10 border-white/20" />
                </div>
                <div className="flex-1">
                  <Label className="text-blue-200 mb-1 block">Teléfono</Label>
                  <div className="flex items-center gap-2">
                    {/* Dropdown de prefijo */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowPrefixDropdown(!showPrefixDropdown)}
                        className="flex items-center gap-1.5 bg-white/10 text-white border border-white/30 hover:border-white/50 rounded-lg pl-3 pr-2 py-2 focus:outline-none transition-all min-w-[90px] h-[40px]"
                      >
                        <span className="font-medium text-sm">{contPrefijo}</span>
                        <ChevronDown className={`w-4 h-4 text-white/70 ml-auto transition-transform ${showPrefixDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      {showPrefixDropdown && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowPrefixDropdown(false)} />
                          <div className="absolute top-full left-0 mt-1 w-full bg-[#0f172a]/95 backdrop-blur-xl border border-white/20 rounded-xl overflow-hidden z-50 shadow-2xl">
                            {PREFIJOS_VE.map(p => (
                              <div
                                key={p}
                                onClick={() => { setContPrefijo(p); setShowPrefixDropdown(false); }}
                                className={`px-3 py-2 text-sm cursor-pointer transition-colors text-center font-medium hover:bg-white/20 ${
                                  contPrefijo === p ? 'bg-white/10 text-blue-300' : 'text-white'
                                }`}
                              >
                                {p}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    <span className="text-white/50 font-bold select-none">-</span>
                    <Input
                      type="text"
                      value={contNumero}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (val.length <= 7) setContNumero(val);
                      }}
                      placeholder="1234567"
                      maxLength={7}
                      inputMode="numeric"
                      className="bg-white/10 border-white/20 flex-1 h-[40px]"
                    />
                  </div>
                  {contNumero.length > 0 && contNumero.length < 7 && (
                    <p className="text-xs text-yellow-400 mt-1">{7 - contNumero.length} dígitos restantes</p>
                  )}
                </div>
              </div>
              <Button disabled={isLoading || contNumero.length !== 7} type="submit" className="w-full md:w-auto self-end bg-purple-600 hover:bg-purple-700 h-[40px] px-8 disabled:opacity-50">
                {isLoading ? 'Guardando...' : <><Plus className="w-4 h-4 mr-2" /> Añadir</>}
              </Button>
            </form>

            {contactos.length === 0 ? (
              <p className="text-center text-white/40 py-6 text-sm">No hay contactos registrados todavía.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {contactos.map(ct => (
                  <div key={ct.id} className="bg-white/10 p-4 rounded-2xl flex justify-between items-center border border-white/10 hover:bg-white/[0.13] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="bg-purple-500/20 p-2.5 rounded-xl border border-purple-500/30 shrink-0">
                        <Phone className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-sm">{ct.nombre}</h4>
                        <p className="text-xs text-purple-300 font-mono mt-0.5">{ct.telefono}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => ct.id && handleEliminarContacto(ct.id, ct.nombre)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-500/20 hover:bg-red-500/40 rounded-xl text-red-300 text-xs font-semibold transition-colors border border-red-500/20 ml-2 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </section>
      )}

    </div>
  );
}