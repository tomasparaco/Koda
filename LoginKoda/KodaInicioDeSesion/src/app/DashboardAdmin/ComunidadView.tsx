import { useState, useEffect, FormEvent, useCallback } from 'react';
import {
  MessageSquare, Vote, Wrench, Eye, Edit, Trash2, Send, CheckCircle,
  Settings, Upload, Plus, FileText, Phone, X, AlertTriangle, ChevronDown, Star, 
  Image as ImageIcon, Calendar, Search, Filter, RefreshCw, Megaphone,
  ChevronLeft, ChevronRight, ChevronUp, Clock
} from 'lucide-react';
import { ComunidadService, DocumentoCondominio, ContactoEmergencia } from '../../services/comunidad.service';
import { TicketService, Ticket } from '../../services/ticket.service';
import { EncuestaService } from '../../services/encuesta.service';
import { NotificacionService } from '../../services/notificacion.service';
import type { Propietario } from '../../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { supabase } from '../../lib/supabase';


interface ComunidadViewProps {
  propiedad: Propietario;
  onNavigateToVotaciones?: () => void; // <-- PARA EL ENLACE AL CREADOR DE ENCUESTAS
  initialAction?: 'comunicado' | 'evento' | null;
  onActionConsumed?: () => void;
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

export function ComunidadView({ propiedad, onNavigateToVotaciones, initialAction, onActionConsumed }: ComunidadViewProps) {
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
  // ── ESTADOS PARA COMUNICADOS ────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [comTitulo, setComTitulo] = useState('');
  const [comCuerpo, setComCuerpo] = useState('');
  const [comCategoria, setComCategoria] = useState<'Mantenimiento' | 'Informativo' | 'Urgente'>('Informativo');
  const [comImagen, setComImagen] = useState<File | null>(null);
  const [isSubmittingCom, setIsSubmittingCom] = useState(false);
  const [comNotificar, setComNotificar] = useState(false);
  const [selectedComunicado, setSelectedComunicado] = useState<any | null>(null);

  // ── ESTADOS PARA FILTROS DE COMUNICADOS ────────────────────────────────────
  const [comSearchTerm, setComSearchTerm] = useState('');
  const [comFilterTag, setComFilterTag] = useState<'Todos' | 'Mantenimiento' | 'Informativo' | 'Urgente'>('Todos');
  const [comDateFrom, setComDateFrom] = useState('');
  const [comDateTo, setComDateTo] = useState('');
  const [comunicadoLimit, setComunicadoLimit] = useState(3);

  // --- ESTADOS PARA EVENTOS ---
  const [eventos, setEventos] = useState<any[]>([]);
  const [fechaActual, setFechaActual] = useState(new Date());
  const [eventoSeleccionado, setEventoSeleccionado] = useState<any | null>(null);

  // --- ESTADOS PARA EVENTOS ---
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({
    titulo: '',
    descripcion: '',
    fecha: '',
    fecha_fin: '',
    hora_inicio: '',
    hora_fin: '',
    tipo: 'Asamblea' as 'Asamblea' | 'Mantenimiento' | 'Social',
    notificar_ahora: false
  });


  useEffect(() => {
    if (initialAction === 'comunicado') {
      setIsModalOpen(true);
      onActionConsumed?.();
    } else if (initialAction === 'evento') {
      setIsEventModalOpen(true);
      onActionConsumed?.();
    }
  }, [initialAction, onActionConsumed]);

  const handlePublicarComunicado = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCom(true);

    try {
      const response = await ComunidadService.crearComunicado(
        {
          codigo_edificio: propiedad.codigo_edificio,
          titulo: comTitulo,
          cuerpo: comCuerpo,
          categoria: comCategoria
        },
        comImagen
      );

      if (!response.exito) throw new Error(response.mensaje);

      showToast('¡Comunicado publicado con éxito!', 'success');
      cargarComunicados();

      // Notificar a todos los usuarios del edificio
      await NotificacionService.crear({
        codigo_edificio: propiedad.codigo_edificio,
        tipo: 'comunicado',
        titulo: 'Nuevo Comunicado',
        mensaje: `"${comTitulo}" — ${comCategoria}`,
        destinatario: 'usuarios',
      });

      setIsModalOpen(false);

      // NOTIFICAR POR CORREO DE FONDO
      if (comNotificar) {
        const tituloCom = comTitulo;
        const catCom = comCategoria;
        supabase.from('propietarios').select('correo, nombre').eq('codigo_edificio', propiedad.codigo_edificio).then(({ data: propietarios }) => {
          if (propietarios && propietarios.length > 0) {
            propietarios.forEach(async (p) => {
              if (p.correo) {
                try {
                   await fetch(`https://formsubmit.co/ajax/${p.correo}`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Accept: "application/json" },
                      body: JSON.stringify({
                          _subject: `Nuevo Comunicado: ${tituloCom} - Koda Mantenimiento`,
                          _template: "table",
                          Para: p.correo,
                          Propietario: p.nombre,
                          Categoría: catCom,
                          Título: tituloCom,
                          Mensaje: `Hola ${p.nombre}, la administración ha publicado un nuevo comunicado en la plataforma. Por favor, ingresa a la aplicación para más detalles.`
                      })
                  });
                } catch (e) {
                    console.error("Error enviando correo de comunicado a", p.correo, e);
                }
              }
            });
          }
        });
      }

      setComTitulo('');
      setComCuerpo('');
      setComCategoria('Informativo');
      setComImagen(null);
      
    } catch (error: any) {
      console.error('Error al publicar:', error);
      showToast(error.message || 'Ocurrió un error al publicar.', 'error');
    } finally {
      setIsSubmittingCom(false);
    }
  };
  // ────────────────────────────────────────────────────────────────────────────
  const handleGuardarEvento = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmittingEvent(true);
    try {
      let response;
      if (isEditingEvent && editingEventId) {
        response = await ComunidadService.updateEvento(editingEventId, newEvent);
      } else {
        response = await ComunidadService.crearEvento({
          ...newEvent,
          codigo_edificio: propiedad.codigo_edificio
        });
      }

      if (response.exito) {
        showToast(`¡Evento ${isEditingEvent ? 'modificado' : 'agendado'} con éxito!`, 'success');
        setIsEventModalOpen(false);

        // Notificar a todos los usuarios del edificio
        await NotificacionService.crear({
          codigo_edificio: propiedad.codigo_edificio,
          tipo: 'evento',
          titulo: isEditingEvent ? 'Evento Reprogramado' : 'Nuevo Evento',
          mensaje: `"${newEvent.titulo}" — ${newEvent.fecha}`,
          destinatario: 'usuarios',
        });
        
        cargarComunicados();

        // NOTIFICAR POR CORREO DE FONDO
        if (newEvent.notificar_ahora) {
          const evTitulo = newEvent.titulo;
          const evFecha = newEvent.fecha;
          supabase.from('propietarios').select('correo, nombre').eq('codigo_edificio', propiedad.codigo_edificio).then(({ data: propietarios }) => {
            if (propietarios && propietarios.length > 0) {
              propietarios.forEach(async (p) => {
                if (p.correo) {
                  try {
                     await fetch(`https://formsubmit.co/ajax/${p.correo}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Accept: "application/json" },
                        body: JSON.stringify({
                            _subject: `${isEditingEvent ? 'Aviso de Evento Reprogramado' : 'Nuevo Evento Agendado'}: ${evTitulo} - Koda Mantenimiento`,
                            _template: "table",
                            Para: p.correo,
                            Propietario: p.nombre,
                            Evento: evTitulo,
                            Fecha: evFecha,
                            Mensaje: `Hola ${p.nombre}, la administración ha ${isEditingEvent ? 'reprogramado o modificado' : 'agendado'} un evento. Por favor, revisa la información en la aplicación para más detalles.`
                        })
                    });
                  } catch (e) {
                      console.error("Error enviando correo de evento a", p.correo, e);
                  }
                }
              });
            }
          });
        }

        setNewEvent({ 
          titulo: '', descripcion: '', fecha: '', fecha_fin: '', 
          hora_inicio: '', hora_fin: '', tipo: 'Asamblea', 
          notificar_ahora: false 
        });
        setIsEditingEvent(false);
        setEditingEventId(null);
      } else {
        showToast(response.mensaje || 'Error al agendar', 'error');
      }
    } catch (error) {
      showToast('Error de conexión', 'error');
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  const handleEditarEvento = (evento: any) => {
    setNewEvent({
      titulo: evento.titulo,
      descripcion: evento.descripcion || '',
      fecha: evento.fecha,
      fecha_fin: evento.fecha_fin || '',
      hora_inicio: evento.hora_inicio,
      hora_fin: evento.hora_fin,
      tipo: evento.tipo,
      notificar_ahora: false
    });
    setIsEditingEvent(true);
    setEditingEventId(evento.id);
    setIsEventModalOpen(true);
  };

  const handleEliminarEvento = (evento: any) => {
    askConfirm(
      'Eliminar Evento',
      `¿Estás seguro de cancelar o eliminar el evento "${evento.titulo}"? Esta acción no puede revertirse.`,
      async () => {
        const result = await ComunidadService.deleteEvento(String(evento.id));
        if (result.exito) {
          setEventoSeleccionado(null);
          cargarComunicados();
          showToast('✨ Evento borrado con éxito.', 'success');
          // Notificar
          await NotificacionService.crear({
            codigo_edificio: propiedad.codigo_edificio,
            tipo: 'evento',
            titulo: 'Evento Cancelado',
            mensaje: `El evento "${evento.titulo}" programado para el ${new Date(evento.fecha).toLocaleDateString()} ha sido cancelado.`,
            destinatario: 'usuarios',
          });
        } else {
          showToast('Error al eliminar evento: ' + result.mensaje, 'error');
        }
      }
    );
  };


  const handleEliminarComunicado = (id: any, titulo: string, imagen_url?: string | null) => {
    askConfirm(
      'Eliminar Comunicado',
      `¿Estás seguro de eliminar el comunicado "${titulo}"? Esta acción no se puede deshacer.`,
      async () => {
        const result = await ComunidadService.deleteComunicado(String(id), imagen_url);
        if (result.exito) {
          setComunicadosLista(prev => prev.filter(c => c.id !== id));
          showToast('✨ Comunicado borrado con éxito.', 'success');
        } else {
          showToast('Error al eliminar: ' + result.mensaje, 'error');
        }
      }
    );
  };

  // ── Stubs para pestañas existentes ─────────────────────────────────────────
  const comunicados = [
    { id: 1, titulo: 'Corte de Agua Programado', fecha: '2026-02-10', vistos: 25, total: 30 },
    { id: 2, titulo: 'Reunión de Junta Directiva', fecha: '2026-02-05', vistos: 28, total: 30 },
    { id: 3, titulo: 'Mantenimiento de Ascensores', fecha: '2026-02-01', vistos: 30, total: 30 },
  ];
  
  // <-- AQUÍ GUARDAMOS LAS VOTACIONES REALES DE LA BDD
  const [votacionesReales, setVotacionesReales] = useState<any[]>([]);
  const [votacionesFilter, setVotacionesFilter] = useState<'todas' | 'activas' | 'cerradas'>('todas');
  const [selectedVotacion, setSelectedVotacion] = useState<any | null>(null);

  // Survey creation state
  const [showCrearEncuestaModal, setShowCrearEncuestaModal] = useState(false);
  const [encPregunta, setEncPregunta] = useState('');
  const [encOpciones, setEncOpciones] = useState(['Sí', 'No', 'Abstención']);
  const [encFechaCierre, setEncFechaCierre] = useState('');
  const [encArchivo, setEncArchivo] = useState<File | null>(null);
  const [encArchivoPreview, setEncArchivoPreview] = useState<string | null>(null);
  const [isCreandoEnc, setIsCreandoEnc] = useState(false);

  const handleEncArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setEncArchivo(file);
      setEncArchivoPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : 'pdf');
    }
  };

  const handleCrearEncuesta = async () => {
    if (!encPregunta || !encFechaCierre || !propiedad.codigo_edificio) {
      showToast('Completa los campos obligatorios.', 'error');
      return;
    }
    if (new Date(encFechaCierre) <= new Date()) {
      showToast('La fecha de cierre debe ser en el futuro.', 'error');
      return;
    }
    setIsCreandoEnc(true);
    const res = await EncuestaService.crearEncuesta(propiedad.codigo_edificio!, encPregunta, encOpciones, encFechaCierre, encArchivo);
    setIsCreandoEnc(false);
    if (res.exito) {
      setShowCrearEncuestaModal(false);
      setEncPregunta('');
      setEncOpciones(['Sí', 'No', 'Abstención']);
      setEncFechaCierre('');
      setEncArchivo(null);
      setEncArchivoPreview(null);
      cargarVotacionesReales();
      showToast('¡Encuesta publicada exitosamente!', 'success');
      // Notificar a todos los usuarios
      await NotificacionService.crear({
        codigo_edificio: propiedad.codigo_edificio!,
        tipo: 'encuesta',
        titulo: 'Nueva Votación',
        mensaje: encPregunta,
        destinatario: 'usuarios',
      });
    } else {
      showToast('Error: ' + res.mensaje, 'error');
    }
  };

  // Estado para guardar los comunicados de la base de datos
  const [comunicadosLista, setComunicadosLista] = useState<any[]>([]);

  // Función para ir a buscar los comunicados a Supabase
  const cargarComunicados = async () => {
    if (!propiedad.codigo_edificio) return;
    const response = await ComunidadService.getComunicados(propiedad.codigo_edificio);
    if (response.exito) {
      setComunicadosLista(response.data);
    }
    const evtRes = await ComunidadService.getEventos(propiedad.codigo_edificio);
    if (evtRes && "exito" in evtRes && evtRes.exito) {
      setEventos(evtRes.data);
    }
  };

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
      cargarComunicados();
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

      // Notificar al residente
      const estadoLegible = 
        estadoAEviar === 'en_proceso' ? 'En Proceso' :
        estadoAEviar === 'cerrado' ? 'Resuelto/Cerrado' :
        estadoAEviar === 'rechazado' ? 'Rechazado' : 'Abierto';

      await NotificacionService.crear({
        codigo_edificio: propiedad.codigo_edificio,
        tipo: 'ticket',
        titulo: 'Actualización de Ticket',
        mensaje: `Tu ticket #${selectedTicket.id_ticket} pasó a estado: ${estadoLegible}.`,
        destinatario: (selectedTicket.propietarios as any)?.apartamento || '',
      });
      
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

  const comunicadosFiltrados = comunicadosLista.filter((c) => {
    const coincideBusqueda = c.titulo.toLowerCase().includes(comSearchTerm.toLowerCase()) || 
                             c.cuerpo.toLowerCase().includes(comSearchTerm.toLowerCase());
    const coincideFiltro = comFilterTag === 'Todos' || c.categoria === comFilterTag;
    let coincideFecha = true;
    if (comDateFrom || comDateTo) {
      const d = new Date(c.creado_en);
      const fechaStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (comDateFrom) coincideFecha = coincideFecha && fechaStr >= comDateFrom;
      if (comDateTo)   coincideFecha = coincideFecha && fechaStr <= comDateTo;
    }
    return coincideBusqueda && coincideFiltro && coincideFecha;
  });

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
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-6">
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

      {/* ── DETAIL MODAL FOR COMUNICADO ────────────────────────────────────── */}
      {selectedComunicado && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-8">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedComunicado(null)} />
          <div className="relative bg-[#0f172a] rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col border border-white/20 overflow-hidden shadow-2xl animate-in zoom-in-95 fade-in duration-200">
            <div className={`px-6 py-4 flex items-center justify-between shrink-0 ${
              selectedComunicado.categoria === 'Urgente' ? 'bg-gradient-to-r from-red-700 to-red-800' :
              selectedComunicado.categoria === 'Mantenimiento' ? 'bg-gradient-to-r from-orange-700 to-orange-800' :
              'bg-gradient-to-r from-blue-700 to-blue-800'
            }`}>
              <h3 className="text-white font-semibold flex items-center gap-2 text-lg">
                <Megaphone className="w-5 h-5 shrink-0" /> {selectedComunicado.categoria}
              </h3>
              <button onClick={() => setSelectedComunicado(null)} className="ml-4 p-1.5 rounded-full hover:bg-white/20 transition-colors shrink-0">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">{selectedComunicado.titulo}</h3>
                <div className="flex items-center gap-1.5 text-white/50 text-xs">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(selectedComunicado.creado_en).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>
              <div className="bg-black/20 border border-white/10 rounded-xl p-4 text-white/90 text-sm whitespace-pre-wrap leading-relaxed">
                {selectedComunicado.cuerpo}
              </div>
              {selectedComunicado.imagen_url && (
                <div className="rounded-xl overflow-hidden border border-white/10 bg-black/40">
                  <img src={selectedComunicado.imagen_url} alt={selectedComunicado.titulo} className="w-full h-auto object-contain max-h-80" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── SUB-PESTAÑAS ───────────────────────────────────────────────────── */}
      <div className="flex gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-2 overflow-x-auto">
        {([
          { key: 'comunicados', label: 'Comunicados / Eventos', Icon: MessageSquare },
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
              <MessageSquare className="w-5 h-5 text-blue-400" /> Archivo de Comunicados
            </h2>

            <div className="flex gap-3 w-full sm:w-auto">
                  <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 whitespace-nowrap">
                    <Plus className="w-5 h-5" /> Nuevo Comunicado
                  </button>
                  <button onClick={() => {
                      setIsEditingEvent(false);
                      setEditingEventId(null);
                      setNewEvent({ titulo: '', descripcion: '', fecha: '', fecha_fin: '', hora_inicio: '', hora_fin: '', tipo: 'Asamblea', notificar_ahora: false });
                      setIsEventModalOpen(true);
                    }}
                    className="bg-green-500 hover:bg-green-400 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 whitespace-nowrap shadow-lg shadow-green-500/20"
                  >
                    <Calendar className="w-5 h-5" /> Agendar Evento
                  </button>
                </div>
          </div>
          </h2>

          {/* FILTROS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {/* Búsqueda por texto */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <input
                type="text"
                placeholder="Buscar por título o contenido..."
                value={comSearchTerm}
                onChange={(e) => setComSearchTerm(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl pl-9 pr-4 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            {/* Categoría */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 z-10" />
              <select
                value={comFilterTag}
                onChange={(e) => setComFilterTag(e.target.value as any)}
                className="w-full bg-white/10 border border-white/20 rounded-xl pl-9 pr-4 py-2 text-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="Todos" className="bg-[#0f172a]">Todas las categorías</option>
                <option value="Informativo" className="bg-[#0f172a]">Informativo</option>
                <option value="Mantenimiento" className="bg-[#0f172a]">Mantenimiento</option>
                <option value="Urgente" className="bg-[#0f172a]">Urgente</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none z-10" />
            </div>
            {/* Fecha desde */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
              <input
                type="date"
                value={comDateFrom}
                onChange={(e) => setComDateFrom(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl pl-9 pr-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 [color-scheme:dark]"
              />
            </div>
            {/* Fecha hasta */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
              <input
                type="date"
                value={comDateTo}
                onChange={(e) => setComDateTo(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl pl-9 pr-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Botón reiniciar filtros */}
          {(comSearchTerm || comFilterTag !== 'Todos' || comDateFrom || comDateTo) && (
            <div className="flex justify-end mb-4">
              <button
                onClick={() => { setComSearchTerm(''); setComFilterTag('Todos'); setComDateFrom(''); setComDateTo(''); }}
                className="flex items-center gap-1.5 text-white/60 hover:text-white text-xs font-medium transition-colors border border-white/20 hover:border-white/40 px-3 py-1.5 rounded-lg"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reiniciar filtros
              </button>
            </div>
          )}

          <div className="space-y-3">
            {comunicadosFiltrados.length === 0 ? (
              <p className="text-center text-white/50 py-8 bg-black/20 rounded-2xl border border-white/5">
                No se encontraron comunicados con esos filtros.
              </p>
            ) : (
              comunicadosFiltrados.slice(0, comunicadoLimit).map((c) => (
                <div
                  key={c.id}
                  className="bg-white/10 border border-white/20 rounded-2xl p-4 relative overflow-hidden hover:bg-white/20 cursor-pointer transition-all"
                  onClick={() => setSelectedComunicado(c)}
                >
                  {/* Etiqueta de Categoría */}
                  <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl font-bold text-xs ${
                    c.categoria === 'Urgente' ? 'bg-red-500 text-white' :
                    c.categoria === 'Mantenimiento' ? 'bg-orange-500 text-white' :
                    'bg-blue-500 text-white'
                  }`}>
                    {c.categoria}
                  </div>

                  <div className="flex justify-between items-start mb-2 mt-1">
                    <div className="flex-1 pr-4">
                      <h3 className="font-bold text-base mb-0.5 text-white leading-tight">{c.titulo}</h3>
                      <p className="text-xs text-blue-200">
                        Publicado el {new Date(c.creado_en).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Cuerpo del mensaje */}
                  <p className="text-white/80 text-sm mb-3 whitespace-pre-wrap line-clamp-2">{c.cuerpo}</p>

                  {/* Si tiene imagen adjunta, mostramos un indicador */}
                  {c.imagen_url && (
                    <div className="mb-3 inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-lg text-[10px] font-semibold border border-blue-500/30">
                      <ImageIcon className="w-3 h-3" /> Contiene imagen adjunta
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEliminarComunicado(c.id, c.titulo, c.imagen_url); }}
                      className="flex-1 bg-red-500/20 hover:bg-red-500/40 text-red-300 py-1.5 rounded-xl font-semibold flex justify-center items-center gap-2 transition-colors border border-red-500/20 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5"/> Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Mostrar más / menos */}
            {comunicadosFiltrados.length > 3 && (
              <div className="flex justify-center pt-3 pb-5">
                {comunicadoLimit < comunicadosFiltrados.length ? (
                  <button
                    onClick={() => setComunicadoLimit(prev => prev + 3)}
                    className="flex items-center gap-2 text-blue-300 hover:text-blue-200 text-sm font-medium transition-colors"
                  >
                    <ChevronDown className="w-4 h-4" /> Ver más comunicados
                  </button>
                ) : (
                  <button
                    onClick={() => setComunicadoLimit(3)}
                    className="flex items-center gap-2 text-blue-300 hover:text-blue-200 text-sm font-medium transition-colors"
                  >
                    <ChevronUp className="w-4 h-4" /> Ver menos
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ─── CALENDARIO DE EVENTOS ─── */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md mb-8 mt-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" /> Agenda del Edificio
              </h3>
              <div className="flex items-center gap-4 text-white/80 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                <button onClick={() => setFechaActual(new Date(fechaActual.setMonth(fechaActual.getMonth() - 1)))} className="hover:text-blue-400">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm font-bold min-w-[120px] text-center capitalize">
                  {fechaActual.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={() => setFechaActual(new Date(fechaActual.setMonth(fechaActual.getMonth() + 1)))} className="hover:text-blue-400">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Grilla del Calendario */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'].map(d => (
                <div key={d} className="text-center text-[10px] uppercase tracking-widest text-white/30 font-bold py-2">{d}</div>
              ))}

              {Array.from({ length: new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0).getDate() }).map((_, i) => {
                const dia = i + 1;
                const fechaIterada = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), dia);
                const esPasado = fechaIterada.getTime() < new Date().setHours(0,0,0,0);

                const eventosDelDia = eventos.filter(e => {
                  const f = new Date(e.fecha);
                  return f.getUTCDate() === dia && f.getUTCMonth() === fechaActual.getMonth() && f.getUTCFullYear() === fechaActual.getFullYear();
                });

                return (
                  <button
                    key={i}
                    onClick={() => eventosDelDia.length > 0 && setEventoSeleccionado(eventosDelDia[0])}
                    className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all relative ${
                      esPasado ? 'opacity-20' : 'hover:bg-white/10 active:scale-90'
                    } ${eventosDelDia.length > 0 ? 'bg-white/10 border border-white/20 shadow-lg shadow-black/20' : 'bg-white/[0.02]'}`}
                  >
                    <span className={`text-sm font-semibold ${eventosDelDia.length > 0 ? 'text-blue-400' : 'text-white/60'}`}>{dia}</span>
                    <div className="flex gap-0.5">
                      {eventosDelDia.slice(0, 3).map((e, idx) => (
                        <div key={idx} className={`w-1.5 h-1.5 rounded-full ${
                          e.tipo === 'Asamblea' ? 'bg-red-500' :
                          e.tipo === 'Mantenimiento' ? 'bg-yellow-500' : 'bg-emerald-500'
                        }`} />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Tarjeta de Detalle Dinámica */}
            {eventoSeleccionado && (
              <div className="mt-6 p-5 bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex justify-between items-start">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md ${
                        eventoSeleccionado.tipo === 'Asamblea' ? 'bg-red-500 text-white' :
                        eventoSeleccionado.tipo === 'Mantenimiento' ? 'bg-yellow-500 text-black' : 'bg-emerald-500 text-white'
                      }`}>
                        {eventoSeleccionado.tipo}
                      </span>
                      <span className="text-white/40 text-[10px] font-bold">EVENTO CONFIRMADO</span>
                    </div>
                    <h4 className="text-white text-lg font-bold leading-tight">{eventoSeleccionado.titulo}</h4>
                    <div className="flex flex-wrap gap-4 text-white/60 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        {eventoSeleccionado.hora_inicio.slice(0,5)} - {eventoSeleccionado.hora_fin.slice(0,5)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        {new Date(eventoSeleccionado.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    {eventoSeleccionado.descripcion && (
                      <p className="text-white/80 text-sm bg-black/20 p-3 rounded-xl border border-white/5">{eventoSeleccionado.descripcion}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditarEvento(eventoSeleccionado)}
                      className="bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-300 p-2.5 rounded-xl transition-colors border border-yellow-500/20 flex flex-col items-center justify-center aspect-square"
                      title="Reprogramar o Modificar Evento"
                    >
                      <Edit className="w-4 h-4"/>
                    </button>
                    <button
                      onClick={() => handleEliminarEvento(eventoSeleccionado)}
                      className="bg-red-500/20 hover:bg-red-500/40 text-red-300 p-2.5 rounded-xl transition-colors border border-red-500/20 flex flex-col items-center justify-center aspect-square"
                      title="Eliminar Evento"
                    >
                      <Trash2 className="w-4 h-4"/>
                    </button>
                    <button
                      onClick={() => setEventoSeleccionado(null)}
                      title="Cerrar detalle"
                      className="bg-white/5 hover:bg-white/10 p-2.5 rounded-xl transition-colors border border-white/10 flex flex-col items-center justify-center aspect-square"
                    >
                      <X className="w-4 h-4 text-white/40" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── VOTACIONES ─────────────────────────────────────────────────────── */}
      {subTab === 'votaciones' && (
        <section className="animate-in fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
              <Vote className="w-5 h-5 text-purple-400" /> Resultados de Votaciones
            </h2>
            <button
              onClick={() => setShowCrearEncuestaModal(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2 border border-purple-400/20"
            >
              <Plus className="w-4 h-4" /> Crear Encuesta
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
             <div onClick={() => setVotacionesFilter('todas')} className={`cursor-pointer border rounded-2xl p-3 text-center transition-all ${votacionesFilter === 'todas' ? 'bg-blue-500/30 border-blue-500' : 'bg-white/5 hover:bg-white/10 border-white/10'}`}>
                <div className="text-2xl font-bold text-white">{votacionesReales.length}</div>
                <div className="text-[10px] text-white/70 font-medium uppercase tracking-wider mt-1">Todas</div>
             </div>
             <div onClick={() => setVotacionesFilter('activas')} className={`cursor-pointer border rounded-2xl p-3 text-center transition-all ${votacionesFilter === 'activas' ? 'bg-green-500/40 border-green-500' : 'bg-green-500/10 border-green-500/20 hover:bg-green-500/30'}`}>
               <div className="text-2xl font-bold text-green-400">{votacionesReales.filter(v => v.activa).length}</div>
               <div className="text-[10px] text-green-300 font-medium uppercase tracking-wider mt-1">Activas</div>
             </div>
             <div onClick={() => setVotacionesFilter('cerradas')} className={`cursor-pointer border rounded-2xl p-3 text-center transition-all ${votacionesFilter === 'cerradas' ? 'bg-gray-500/40 border-gray-500' : 'bg-gray-500/10 border-gray-500/20 hover:bg-gray-500/30'}`}>
               <div className="text-2xl font-bold text-gray-400">{votacionesReales.filter(v => !v.activa).length}</div>
               <div className="text-[10px] text-gray-300 font-medium uppercase tracking-wider mt-1">Cerradas</div>
             </div>
          </div>

          <div className="space-y-4">
            {(() => {
              const filteredVotaciones = votacionesFilter === 'todas' ? votacionesReales : votacionesReales.filter(v => votacionesFilter === 'activas' ? v.activa : !v.activa);

              if (filteredVotaciones.length === 0) {
                return (
                 <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center text-white/50">
                   <Vote className="w-12 h-12 mx-auto mb-3 opacity-50" />
                   <p>No hay encuestas en esta categoría.</p>
                 </div>
                );
              }

              return filteredVotaciones.map(enc => (
                <div key={enc.id} className="bg-white/10 border border-white/20 rounded-2xl p-5 hover:bg-white/15 transition-colors group">
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-white mb-1">{enc.pregunta}</h3>
                      <p className="text-sm text-blue-200">
                        Total votos: {enc.votos?.length || 0} • Cierre: {new Date(enc.fecha_cierre).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 self-end md:self-auto">
                      <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${enc.activa ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {enc.activa ? 'Activa' : 'Cerrada'}
                      </span>
                      <button
                        onClick={() => setSelectedVotacion(enc)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
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

      {/* ── MODAL DE CREAR ENCUESTA (desde Comunidad) ──────────────────────── */}
      {showCrearEncuestaModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCrearEncuestaModal(false)} />
          <div className="relative bg-gray-900 border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 fade-in duration-200">
            <div className="bg-gradient-to-r from-purple-800 to-purple-900 px-6 py-4 flex items-center justify-between shrink-0">
              <h3 className="text-white text-lg font-bold flex items-center gap-2">
                <Vote className="w-5 h-5" /> Crear Nueva Encuesta
              </h3>
              <button onClick={() => setShowCrearEncuestaModal(false)} className="p-1 rounded-full hover:bg-white/20 transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              <div>
                <Label className="text-white/80">Pregunta o Tema a Votar *</Label>
                <Input
                  value={encPregunta}
                  onChange={e => setEncPregunta(e.target.value)}
                  placeholder="Ej. ¿Aprobar el presupuesto de pintura?"
                  className="bg-white/5 border-white/10 text-white mt-1"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <Label className="text-white/80">Opciones de Respuesta</Label>
                  <div className="space-y-2 mt-1">
                    {encOpciones.map((op, idx) => (
                      <Input
                        key={idx}
                        value={op}
                        onChange={e => {
                          const nuevas = [...encOpciones];
                          nuevas[idx] = e.target.value;
                          setEncOpciones(nuevas);
                        }}
                        className="bg-white/5 border-white/10 text-white"
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-white/80">Fecha límite de cierre *</Label>
                  <Input
                    type="datetime-local"
                    value={encFechaCierre}
                    onChange={e => setEncFechaCierre(e.target.value)}
                    className="bg-white/5 border-white/10 text-white mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-white/80 block mb-2">Documento Soporte (Opcional)</Label>
                {!encArchivo ? (
                  <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-white/20 border-dashed rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-8 w-8 text-white/50 mb-3" />
                      <Label htmlFor="enc-com-file" className="cursor-pointer text-purple-400 hover:text-purple-300 text-sm font-medium">
                        <span>Añadir archivo</span>
                        <input id="enc-com-file" type="file" className="sr-only" onChange={handleEncArchivoChange} accept=".pdf,image/*" />
                      </Label>
                      <p className="text-xs text-white/40 mt-1">PDF o Imágenes</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full h-24 border border-white/20 rounded-xl overflow-hidden bg-black/40 flex items-center justify-center group">
                    {encArchivoPreview === 'pdf' ? (
                      <div className="flex flex-col items-center text-white">
                        <FileText className="w-8 h-8 text-red-400 mb-1" />
                        <span className="text-sm">{encArchivo.name}</span>
                      </div>
                    ) : (
                      <img src={encArchivoPreview!} alt="Preview" className="w-full h-full object-contain" />
                    )}
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button onClick={() => { setEncArchivo(null); setEncArchivoPreview(null); }} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm">Eliminar</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="border-t border-white/10 p-4 flex gap-3 shrink-0">
              <button onClick={() => setShowCrearEncuestaModal(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-medium border border-white/10 transition-colors">
                Cancelar
              </button>
              <button onClick={handleCrearEncuesta} disabled={isCreandoEnc} className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white py-3 rounded-xl font-bold transition-colors">
                {isCreandoEnc ? 'Publicando...' : 'Publicar Encuesta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE DETALLE DE VOTACIÓN ───────────────────────────────────── */}
      {selectedVotacion && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedVotacion(null)} />
          <div className="relative bg-[#0f172a] rounded-3xl w-full max-w-lg flex flex-col border border-white/20 shadow-2xl animate-in zoom-in-95 fade-in duration-200">
            <div className="bg-gradient-to-r from-purple-900 to-purple-800 px-6 py-4 flex items-center justify-between shrink-0 rounded-t-3xl">
              <div>
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  <Vote className="w-5 h-5 shrink-0" />
                  Detalles de la Votación
                </h3>
              </div>
              <button onClick={() => setSelectedVotacion(null)} className="p-1.5 rounded-full hover:bg-white/20 transition-colors shrink-0">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-white max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div>
                <h4 className="text-xl font-bold text-white mb-2">{selectedVotacion.pregunta}</h4>
                <div className="flex gap-3 text-sm mb-4">
                  <span className={`px-2.5 py-1 rounded-full font-semibold ${selectedVotacion.activa ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {selectedVotacion.activa ? 'Activa' : 'Cerrada'}
                  </span>
                  <span className="text-white/60 flex items-center">
                    Cierre: {new Date(selectedVotacion.fecha_cierre).toLocaleString()}
                  </span>
                </div>
                {selectedVotacion.documento_url && (
                  <div className="mt-4 mb-2 rounded-xl overflow-hidden border border-white/20 bg-black/40">
                    <img src={selectedVotacion.documento_url} alt="Documento adjunto" className="w-full max-h-60 object-contain" />
                  </div>
                )}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <h5 className="font-semibold text-blue-200 mb-4">Resultados ({selectedVotacion.votos?.length || 0} votos)</h5>
                <div className="space-y-4">
                  {selectedVotacion.opciones.map((op: string, idx: number) => {
                    const totalVotos = selectedVotacion.votos?.length || 0;
                    const isYes = op.toLowerCase() === 'sí' || op.toLowerCase() === 'si' || idx === 0;
                    const isNo = op.toLowerCase() === 'no' || idx === 1;
                    const color = isYes ? 'bg-green-400' : (isNo ? 'bg-red-400' : 'bg-yellow-400');
                    const textColor = isYes ? 'text-green-400' : (isNo ? 'text-red-400' : 'text-yellow-400');

                    const votosOpcion = selectedVotacion.votos?.filter((v: any) => v.opcion_seleccionada === op).length || 0;
                    const porcentaje = totalVotos === 0 ? 0 : Math.round((votosOpcion / totalVotos) * 100);

                    return (
                      <div key={op}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className={`font-medium ${textColor}`}>{op}</span>
                          <span className="text-white/80 font-medium">{votosOpcion} votos <span className="opacity-50 font-normal">({porcentaje}%)</span></span>
                        </div>
                        <div className="w-full bg-black/40 rounded-full h-3 border border-white/5">
                          <div className={`${color} h-full rounded-full transition-all duration-1000`} style={{ width: `${porcentaje}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedVotacion.activa && (
                <button
                  onClick={() => {
                    askConfirm(
                      'Cerrar Votación',
                      '¿Seguro que deseas cerrar la votación anticipadamente?',
                      async () => {
                        await EncuestaService.cerrarEncuesta(selectedVotacion.id);
                        cargarVotacionesReales();
                        setSelectedVotacion(null);
                      }
                    );
                  }}
                  className="w-full bg-red-500/80 hover:bg-red-500 transition-colors text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 mt-4 shadow-lg"
                >
                  <CheckCircle className="w-5 h-5"/> Cerrar Votación Ahora
                </button>
              )}
            </div>
          </div>
        </div>
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
    { /* ── MODAL NUEVO COMUNICADO ────────────────────────────────────────── */ }
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isSubmittingCom && setIsModalOpen(false)} />
          
          <div className="relative bg-[#0f172a] rounded-3xl w-full max-w-lg border border-white/10 overflow-hidden shadow-2xl z-10 animate-in zoom-in-95 fade-in duration-200">
            {/* Header del modal */}
            <div className="bg-white/5 border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-400" /> Redactar Comunicado
              </h3>
              <button 
                onClick={() => !isSubmittingCom && setIsModalOpen(false)} 
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Cuerpo del formulario */}
            <form onSubmit={handlePublicarComunicado} className="p-6 space-y-5">
              
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-white/80">Título del aviso</Label>
                <Input 
                  required 
                  value={comTitulo} 
                  onChange={(e) => setComTitulo(e.target.value)}
                  placeholder="Ej: Mantenimiento de Ascensores"
                  className="w-full bg-black/40 border-white/10 text-white placeholder:text-white/30 h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-white/80">Categoría</Label>
                <select 
                  value={comCategoria} 
                  onChange={(e) => setComCategoria(e.target.value as any)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 h-11 text-white outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none"
                >
                  <option value="Informativo" className="bg-[#0f172a]">Informativo</option>
                  <option value="Mantenimiento" className="bg-[#0f172a]">Mantenimiento</option>
                  <option value="Urgente" className="bg-[#0f172a]">Urgente</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-white/80">Cuerpo del mensaje</Label>
                <textarea 
                  required 
                  rows={4} 
                  value={comCuerpo} 
                  onChange={(e) => setComCuerpo(e.target.value)}
                  placeholder="Detalla la información aquí..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-white/80 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-blue-400" /> Imagen Adjunta (Opcional)
                </Label>
                <Input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setComImagen(e.target.files ? e.target.files[0] : null)}
                  className="w-full bg-black/40 border-white/10 text-white/70 file:text-white file:bg-blue-600/80 file:border-none file:rounded-lg file:px-4 file:py-1 file:mr-4 hover:file:bg-blue-600 cursor-pointer h-11 pt-1.5"
                />
              </div>

              {/* Toggle de Notificación */}
              <label className="flex items-center gap-3 cursor-pointer p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={comNotificar}
                    onChange={e => setComNotificar(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/40 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-checked:after:bg-white"></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-white text-sm font-semibold group-hover:text-blue-400 transition-colors">Notificar inmediatamente</span>
                  <span className="text-white/30 text-[10px]">Envía correo automático a los vecinos</span>
                </div>
              </label>

              {/* Botones */}
              <div className="pt-2 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-sm transition-colors border border-white/10"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmittingCom}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:text-white/50 text-white font-semibold text-sm transition-colors flex justify-center items-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  {isSubmittingCom ? 'Publicando...' : <><Send size={16} /> Publicar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ─── MODAL DE AGENDAR EVENTO ─── */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1e293b] border border-white/10 rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in duration-300">
            
            {/* Cabecera */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white leading-none">Agendar Evento</h2>
                  <p className="text-white/40 text-xs mt-1">Organiza la agenda del condominio</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEventModalOpen(false)} 
                className="text-white/40 hover:text-white p-2 hover:bg-white/5 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleGuardarEvento} className="space-y-4">
              {/* Título */}
              <div>
                <Label className="text-white/60 ml-1 mb-1.5 block text-sm">Título del Evento</Label>
                <Input
                  placeholder="Ej: Asamblea Extraordinaria de Propietarios"
                  className="bg-black/40 border-white/10 text-white placeholder:text-white/20 focus:border-emerald-500/50 transition-all"
                  value={newEvent.titulo}
                  onChange={e => setNewEvent({...newEvent, titulo: e.target.value})}
                  required
                />
              </div>

              {/* Fechas: Inicio y Fin */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/60 ml-1 mb-1.5 block text-sm">Fecha Inicio</Label>
                  <Input
                    type="date"
                    className="bg-black/40 border-white/10 text-white focus:border-emerald-500/50 [color-scheme:dark]"
                    value={newEvent.fecha}
                    onChange={e => setNewEvent({...newEvent, fecha: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label className="text-white/60 ml-1 mb-1.5 block text-sm">Fecha Fin</Label>
                  <Input
                    type="date"
                    className="bg-black/40 border-white/10 text-white focus:border-emerald-500/50 [color-scheme:dark]"
                    value={newEvent.fecha_fin}
                    onChange={e => setNewEvent({...newEvent, fecha_fin: e.target.value})}
                    required
                  />
                </div>
              </div>

              {/* Horas y Categoría */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <Label className="text-white/60 ml-1 mb-1.5 block text-sm">Hora Inicio</Label>
                    <Input 
                      type="time" 
                      className="bg-black/40 border-white/10 text-white [color-scheme:dark]" 
                      value={newEvent.hora_inicio} 
                      onChange={e => setNewEvent({...newEvent, hora_inicio: e.target.value})} 
                      required 
                    />
                  </div>
                  <div>
                    <Label className="text-white/60 ml-1 mb-1.5 block text-sm">Hora Fin</Label>
                    <Input 
                      type="time" 
                      className="bg-black/40 border-white/10 text-white [color-scheme:dark]" 
                      value={newEvent.hora_fin} 
                      onChange={e => setNewEvent({...newEvent, hora_fin: e.target.value})} 
                      required 
                    />
                  </div>
                </div>

                <div className="flex flex-col">
                  <Label className="text-white/60 ml-1 mb-1.5 block text-sm">Categoría del Evento</Label>
                  <div className="flex-1 flex flex-col gap-2">
                    <select
                      className={`w-full rounded-xl px-4 h-full text-white font-bold border-none outline-none transition-colors shadow-inner ${
                        newEvent.tipo === 'Asamblea' ? 'bg-red-500/80 hover:bg-red-500' : 
                        newEvent.tipo === 'Mantenimiento' ? 'bg-yellow-500/80 hover:bg-yellow-500 text-black' : 
                        'bg-emerald-500/80 hover:bg-emerald-500'
                      }`}
                      value={newEvent.tipo}
                      onChange={e => setNewEvent({...newEvent, tipo: e.target.value as any})}
                    >
                      <option value="Asamblea" className="bg-[#1e293b] text-white">Asamblea </option>
                      <option value="Mantenimiento" className="bg-[#1e293b] text-white">Mantenimiento </option>
                      <option value="Social" className="bg-[#1e293b] text-white">Social </option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <Label className="text-white/60 ml-1 mb-1.5 block text-sm">Descripción / Detalles</Label>
                <textarea
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white h-24 text-sm focus:ring-1 focus:ring-emerald-500 outline-none placeholder:text-white/20"
                  placeholder="Ej: Se requiere la presencia de todos los copropietarios..."
                  value={newEvent.descripcion}
                  onChange={e => setNewEvent({...newEvent, descripcion: e.target.value})}
                />
              </div>

              {/* Toggle de Notificación */}
              <label className="flex items-center gap-3 cursor-pointer p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={newEvent.notificar_ahora}
                    onChange={e => setNewEvent({...newEvent, notificar_ahora: e.target.checked})}
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/40 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white"></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-white text-sm font-semibold group-hover:text-emerald-400 transition-colors">Notificar inmediatamente</span>
                  <span className="text-white/30 text-[10px]">Envía correo automático a los vecinos</span>
                </div>
              </label>

              {/* Botones de acción */}
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsEventModalOpen(false)} 
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-sm transition-colors border border-white/5"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmittingEvent}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white font-bold text-sm shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
                >
                  {isSubmittingEvent ? 'Agendando...' : 'Agendar Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}