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
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity" onClick={onClose} />
      <div className="relative bg-gradient-to-br from-blue-700 to-blue-900 rounded-[2rem] border border-white/20 w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300 flex flex-col max-h-[90vh]">
        
        {/* Cabecera Ultra Premium */}
        <div className="relative p-6 pb-4 overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500/30 blur-[50px] rounded-full pointer-events-none -mr-10 -mt-10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-300/30 blur-[40px] rounded-full pointer-events-none -ml-5 -mb-5" />
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-2.5 rounded-2xl shadow-lg shadow-orange-500/30">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-white text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                  Reportar Falla
                </h3>
                <p className="text-white/50 text-xs">Ayúdanos a mantener el edificio.</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-all">
              <X className="w-5 h-5 text-white/70" />
            </button>
          </div>
        </div>

        {isSuccess ? (
          <div className="p-10 flex flex-col items-center justify-center text-center space-y-4 relative z-10">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/30 blur-[30px] rounded-full" />
              <div className="bg-gradient-to-br from-green-400 to-green-600 p-5 rounded-full relative z-10 shadow-2xl shadow-green-500/40 animate-bounce">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
            </div>
            <h4 className="text-2xl font-bold text-white mt-4">¡Reporte Enviado!</h4>
            <p className="text-white/60 text-sm max-w-[250px]">Tu ticket ha sido creado exitosamente. La administración será notificada en breve.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-5 overflow-y-auto custom-scrollbar relative z-10">
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/70 uppercase tracking-wider ml-1">Asunto del Problema <span className="text-orange-400">*</span></label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FileText className="h-5 w-5 text-white/30 group-focus-within:text-orange-400 transition-colors" />
                </div>
                <input
                  type="text" required maxLength={100}
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ej: Filtración en el pasillo..."
                  className="w-full pl-11 pr-4 py-3.5 bg-black/20 border border-white/10 hover:border-white/20 rounded-2xl focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 outline-none text-white placeholder:text-white/30 transition-all backdrop-blur-md"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/70 uppercase tracking-wider ml-1">Descripción Detallada <span className="text-orange-400">*</span></label>
              <textarea
                required rows={3} maxLength={500}
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Describe el problema que estás reportando..."
                className="w-full px-4 py-3.5 bg-black/20 border border-white/10 hover:border-white/20 rounded-2xl focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 outline-none text-white placeholder:text-white/30 transition-all resize-none backdrop-blur-md"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/70 uppercase tracking-wider ml-1">Ubicación</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <MapPin className="h-4 w-4 text-white/30 group-focus-within:text-orange-400 transition-colors" />
                  </div>
                  <input
                    type="text" maxLength={50}
                    value={formData.ubicacion}
                    onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                    placeholder="Ej: Piso 3"
                    className="w-full pl-10 pr-3 py-3 bg-black/20 border border-white/10 hover:border-white/20 rounded-2xl focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 outline-none text-white text-sm placeholder:text-white/30 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/70 uppercase tracking-wider ml-1">Prioridad</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <AlertTriangle className="h-4 w-4 text-white/30 group-focus-within:text-orange-400 transition-colors" />
                  </div>
                  <select
                    value={formData.prioridad}
                    onChange={(e) => setFormData({ ...formData, prioridad: e.target.value as any })}
                    className="w-full pl-10 pr-3 py-3 bg-black/20 border border-white/10 hover:border-white/20 rounded-2xl focus:ring-2 focus:ring-orange-500/50 outline-none text-white text-sm transition-all appearance-none cursor-pointer"
                  >
                    <option value="baja" className="text-black">🟢 Baja</option>
                    <option value="media" className="text-black">🟡 Media</option>
                    <option value="alta" className="text-black">🔴 Alta</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/70 uppercase tracking-wider ml-1">Evidencia Fotográfica</label>
              {file ? (
                <div className="relative w-full h-32 border border-white/10 rounded-2xl bg-black/30 flex items-center justify-center overflow-hidden group">
                  {filePreviewUrl === 'pdf' ? (
                     <div className="flex flex-col items-center">
                       <FileText className="w-10 h-10 text-orange-400 mb-2" />
                       <span className="text-white/70 font-semibold text-xs">Archivo Subido</span>
                     </div>
                  ) : (
                    <>
                      <img src={filePreviewUrl!} alt="Preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    </>
                  )}
                  <button type="button" onClick={removeFile} className="absolute top-2 right-2 bg-red-500/80 backdrop-blur-md text-white p-2 rounded-full z-10 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-28 border border-white/20 border-dashed rounded-2xl cursor-pointer bg-white/5 hover:bg-white/10 transition-all group">
                  <div className="bg-white/5 p-3 rounded-full mb-2 group-hover:scale-110 transition-transform">
                    <Camera className="w-6 h-6 text-orange-400" />
                  </div>
                  <p className="text-xs text-white/60 font-medium group-hover:text-white/80 transition-colors">Toca para adjuntar foto</p>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
              )}
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 disabled:from-white/10 disabled:to-white/10 disabled:text-white/30 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-orange-500/20 transform hover:-translate-y-0.5"
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
