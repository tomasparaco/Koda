import { useState } from 'react';
import { X, Upload, CheckCircle, Loader2, Wrench, FileText, MapPin, AlertTriangle, Camera } from 'lucide-react';
import { TicketService } from '../../services/ticket.service';
import { NotificacionService } from '../../services/notificacion.service';
import type { Propietario } from '../../types';

interface ReportTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  userData: Propietario;
  onSuccess?: () => void;
}

export default function ReportTicketModal({ isOpen, onClose, userData, onSuccess }: ReportTicketModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    ubicacion: '',
    prioridad: 'media' as 'baja' | 'media' | 'alta',
  });

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (selectedFile.type.startsWith('image/')) {
        setFilePreviewUrl(URL.createObjectURL(selectedFile));
      } else {
        setFilePreviewUrl('pdf');
      }
    }
  };

  const removeFile = (e: React.MouseEvent) => {
    e.preventDefault();
    setFile(null);
    if (filePreviewUrl && filePreviewUrl !== 'pdf') {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setFilePreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userData.codigo_edificio || !userData.id_propietario) {
      alert("Error: Faltan datos del usuario para crear el ticket.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await TicketService.createTicket({
        codigo_edificio: userData.codigo_edificio,
        id_propietario: userData.id_propietario,
        titulo: formData.titulo,
        descripcion: formData.descripcion,
        ubicacion: formData.ubicacion,
        prioridad: formData.prioridad,
      }, file || undefined);

      if (!response.exito) {
        throw new Error(response.mensaje || "Error desconocido al crear el ticket");
      }

      // Notificar al admin sobre el nuevo ticket
      await NotificacionService.crear({
        codigo_edificio: userData.codigo_edificio,
        tipo: 'ticket',
        titulo: 'Nuevo Ticket',
        mensaje: `Apto ${userData.apartamento}: "${formData.titulo}"`,
        destinatario: 'admin',
      });

      setIsSuccess(true);
      if (onSuccess) onSuccess();

      setTimeout(() => {
        setIsSuccess(false);
        setFormData({ titulo: '', descripcion: '', ubicacion: '', prioridad: 'media' });
        setFile(null);
        if (filePreviewUrl && filePreviewUrl !== 'pdf') URL.revokeObjectURL(filePreviewUrl);
        setFilePreviewUrl(null);
        onClose();
      }, 2000);

    } catch (error: any) {
      alert(`Hubo un error al reportar la falla: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-kcard rounded-3xl w-full max-w-md shadow-lg overflow-hidden animate-in zoom-in-95 fade-in duration-300 flex flex-col max-h-[90vh]">
        
        <div className="bg-kbg border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Wrench className="w-5 h-5 text-slate-400" />
            <h3 className="text-white text-lg font-semibold">Reportar Falla</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5 text-slate-400 hover:text-white" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-10 flex flex-col items-center justify-center text-center space-y-4 relative z-10">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/30 blur-[30px] rounded-full" />
              <div className="bg-emerald-900/50 p-5 rounded-full border border-emerald-500/30 animate-bounce">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
            </div>
            <h4 className="text-2xl font-bold text-white mt-4">¡Reporte Enviado!</h4>
            <p className="text-white/60 text-sm max-w-[250px]">Tu ticket ha sido creado exitosamente. La administración será notificada en breve.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar relative z-10">
            
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Asunto del Problema</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FileText className="h-4 w-4 text-slate-500 group-focus-within:text-slate-300 transition-colors" />
                </div>
                <input
                  type="text" required maxLength={100}
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ej: Filtración en el pasillo..."
                  className="w-full pl-9 pr-4 py-2.5 bg-kbg border border-slate-700 rounded-xl focus:ring-2 focus:ring-slate-600 outline-none text-slate-200 placeholder:text-slate-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Descripción Detallada</label>
              <textarea
                required rows={3} maxLength={500}
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Describe el problema que estás reportando..."
                className="w-full px-4 py-2.5 bg-kbg border border-slate-700 rounded-xl focus:ring-2 focus:ring-slate-600 outline-none text-slate-200 placeholder:text-slate-500 transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Ubicación</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-4 w-4 text-slate-500 group-focus-within:text-slate-300 transition-colors" />
                  </div>
                  <input
                    type="text" maxLength={50}
                    value={formData.ubicacion}
                    onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                    placeholder="Ej: Piso 3"
                    className="w-full pl-9 pr-3 py-2.5 bg-kbg border border-slate-700 rounded-xl focus:ring-2 focus:ring-slate-600 outline-none text-slate-200 text-sm placeholder:text-slate-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Prioridad</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <AlertTriangle className="h-4 w-4 text-slate-500 group-focus-within:text-slate-300 transition-colors" />
                  </div>
                  <select
                    value={formData.prioridad}
                    onChange={(e) => setFormData({ ...formData, prioridad: e.target.value as any })}
                    className="w-full pl-9 pr-3 py-2.5 bg-kbg border border-slate-700 rounded-xl focus:ring-2 focus:ring-slate-600 outline-none text-slate-200 text-sm transition-colors cursor-pointer"
                  >
                    <option value="baja" className="text-black">Baja</option>
                    <option value="media" className="text-black">Media</option>
                    <option value="alta" className="text-black">Alta</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Evidencia Fotográfica</label>
              {file ? (
                <div className="relative w-full h-32 border border-slate-700 rounded-xl bg-kbg flex items-center justify-center overflow-hidden group">
                  {filePreviewUrl === 'pdf' ? (
                     <div className="flex flex-col items-center">
                       <FileText className="w-10 h-10 text-slate-500 mb-2" />
                       <span className="text-slate-400 font-semibold text-xs">Archivo Subido</span>
                     </div>
                  ) : (
                    <>
                      <img src={filePreviewUrl!} alt="Preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute inset-0 bg-gradient-to-t from-kbg/80 to-transparent pointer-events-none" />
                    </>
                  )}
                  <button type="button" onClick={removeFile} className="absolute top-2 right-2 bg-red-500/90 text-white p-1.5 rounded-full z-10 hover:bg-red-500 transition-colors shadow-lg">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-28 border border-slate-700 border-dashed rounded-xl cursor-pointer bg-kbg hover:bg-kcard transition-colors group">
                  <div className="bg-slate-800 p-3 rounded-full mb-2 group-hover:scale-110 transition-transform">
                    <Camera className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-400 font-medium group-hover:text-slate-300 transition-colors">Toca para adjuntar foto</p>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
              )}
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full bg-slate-100 hover:bg-white disabled:bg-slate-800 disabled:text-slate-500 text-slate-900 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Procesando...
                  </>
                ) : (
                  <>
                    Enviar Reporte Ahora
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

