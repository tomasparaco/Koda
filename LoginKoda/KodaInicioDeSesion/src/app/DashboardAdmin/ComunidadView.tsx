import { useState, useEffect, FormEvent, useCallback } from 'react';
import {
  MessageSquare, Vote, Wrench, Eye, Edit, Trash2, Send, CheckCircle,
  Settings, Upload, Plus, FileText, Phone, X, AlertTriangle, ChevronDown
} from 'lucide-react';
import { ComunidadService, DocumentoCondominio, ContactoEmergencia } from '../../services/comunidad.service';
import type { Propietario } from '../../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

interface ComunidadViewProps {
  propiedad: Propietario;
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

export function ComunidadView({ propiedad }: ComunidadViewProps) {
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
  const votaciones = [
    { id: 1, pregunta: '¿Aprobar pintura de fachada?', activa: true, si: 18, no: 7, abstenciones: 5, total: 30 },
    { id: 2, pregunta: '¿Instalar cámaras de seguridad?', activa: true, si: 22, no: 4, abstenciones: 4, total: 30 },
    { id: 3, pregunta: '¿Cambiar empresa de limpieza?', activa: false, si: 15, no: 12, abstenciones: 3, total: 30 },
  ];
  const tickets = [
    { id: 1, titulo: 'Filtración en Apto 304', apartamento: '304', estado: 'pendiente', fecha: '2026-02-14', prioridad: 'alta' },
    { id: 2, titulo: 'Luz del pasillo no funciona', apartamento: '205', estado: 'en_proceso', fecha: '2026-02-12', prioridad: 'media' },
  ];

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

  useEffect(() => {
    if (propiedad.codigo_edificio) cargarConfiguraciones();
  }, [propiedad.codigo_edificio]);

  const cargarConfiguraciones = async () => {
    const resDocs = await ComunidadService.getDocumentos(propiedad.codigo_edificio!);
    if (resDocs.exito) setDocumentos(resDocs.data);

    const resCont = await ComunidadService.getContactos(propiedad.codigo_edificio!);
    if (resCont.exito) setContactos(resCont.data);
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
            onClick={() => setSubTab(key)}
            className={`flex-1 min-w-[110px] py-3 px-2 rounded-xl font-semibold transition-all ${
              subTab === key ? 'bg-white text-blue-600' : 'text-white hover:bg-white/10'
            }`}
          >
            <Icon className="w-5 h-5 mx-auto mb-1" />
            {label}
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
          <h2 className="text-xl font-semibold mb-4">Resultados de Votaciones</h2>
          <div className="space-y-4">
            {votaciones.map(v => (
              <div key={v.id} className="bg-white/10 border border-white/20 rounded-2xl p-5">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg">{v.pregunta}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${v.activa ? 'bg-green-500' : 'bg-gray-500'} text-white`}>{v.activa ? 'Activa' : 'Cerrada'}</span>
                </div>
                <div className="space-y-3 mb-4">
                  {[{ label: 'Sí', val: v.si, color: 'bg-green-400', textColor: 'text-green-400' }, { label: 'No', val: v.no, color: 'bg-red-400', textColor: 'text-red-400' }].map(row => (
                    <div key={row.label}>
                      <div className="flex justify-between text-sm mb-1"><span className={row.textColor}>{row.label}</span><span>{row.val} votos</span></div>
                      <div className="w-full bg-white/20 rounded-full h-3"><div className={`${row.color} h-full rounded-full`} style={{ width: `${(row.val / v.total) * 100}%` }}></div></div>
                    </div>
                  ))}
                </div>
                {v.activa && <button className="w-full bg-blue-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5"/>Cerrar Votación</button>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── TICKETS ────────────────────────────────────────────────────────── */}
      {subTab === 'tickets' && (
        <section className="animate-in fade-in">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Wrench className="w-5 h-5"/> Gestión de Mantenimiento</h2>
          <div className="space-y-3">
            {tickets.map(t => (
              <div key={t.id} className="bg-white/10 border border-white/20 rounded-2xl p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{t.titulo}</h3>
                    <p className="text-sm text-blue-200">Apto {t.apartamento}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getEstadoColor(t.estado)}`}>{getEstadoTexto(t.estado)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
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
