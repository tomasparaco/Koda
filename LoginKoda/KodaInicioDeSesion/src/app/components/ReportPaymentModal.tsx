import { useState, useEffect } from 'react';
import { X, Upload, CheckCircle, Loader2, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase'; // Asegúrate de que esta ruta sea correcta
import { PagoService } from '../../services/pago.service';
import type { Propietario } from '../../types';

interface ReportPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userData: Propietario;
}

export default function ReportPaymentModal({ isOpen, onClose, userData }: ReportPaymentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [pendingRecibos, setPendingRecibos] = useState<any[]>([]);
  const [isLoadingRecibos, setIsLoadingRecibos] = useState(false);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  // Clean up object URL to avoid memory leaks
  useEffect(() => {
    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  // Cambiamos 'id_recibo' a un array de recibos seleccionados
  const [formData, setFormData] = useState({
    selectedRecibos: [] as number[],
    metodo: 'Transferencia',
    referencia: '',
    monto: '',
    // Obtener la fecha local correctamente sin corrimientos de franja horaria
    fecha: new Date().toLocaleDateString('en-CA'), // Formato YYYY-MM-DD local
  });

  useEffect(() => {
    if (isOpen && userData?.id_propietario) {
      const fetchRecibos = async () => {
        setIsLoadingRecibos(true);
        const { exito, data } = await PagoService.getPendingRecibos(userData.id_propietario);
        if (exito && data) {
          setPendingRecibos(data);
          if (data.length > 0) {
            setFormData(prev => ({ ...prev, selectedRecibos: [data[0].id_recibo] }));
          }
        }
        setIsLoadingRecibos(false);
      };
      fetchRecibos();
    }
  }, [isOpen, userData?.id_propietario]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (selectedFile.type.startsWith('image/')) {
        setFilePreviewUrl(URL.createObjectURL(selectedFile));
      } else {
        setFilePreviewUrl('pdf'); // Special marker for PDF
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
    setIsSubmitting(true);

    try {
      let comprobanteUrl = null;

      // 1. Validar y Subir la foto del comprobante
      if (!file) {
        throw new Error('Debes adjuntar el comprobante de pago para continuar.');
      }

      let amountToDistribute = parseFloat(formData.monto);
      if (isNaN(amountToDistribute) || amountToDistribute <= 0) {
        throw new Error("El monto ingresado es inválido.");
      }
      if (formData.selectedRecibos.length === 0) {
        throw new Error("Debe seleccionar al menos un recibo a pagar.");
      }

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userData?.apartamento || 'Apto'}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('facturas')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('facturas')
          .getPublicUrl(fileName);

        comprobanteUrl = data.publicUrl;
      }

      // 2. Preparar los datos y la distribución en los recibos seleccionados
      const pagosToInsert = [];
      for (const id_recibo of formData.selectedRecibos) {
        const recibo = pendingRecibos.find(r => r.id_recibo === id_recibo);
        if (!recibo) continue;

        const maxToPayHere = Math.min(amountToDistribute, recibo.monto_restante);
        if (maxToPayHere > 0) {
          pagosToInsert.push({
            id_recibo: id_recibo,
            metodo: formData.metodo,
            referencia: formData.referencia,
            monto: maxToPayHere,
            fecha_pago: formData.fecha,
            comprobante_url: comprobanteUrl,
            estado: 'pendiente'
          });
          amountToDistribute -= maxToPayHere;
        }
      }

      // Si sobra dinero (pago de más) y hay al menos un pago,
      // se lo sumamos al último recibo para que el trigger lo tome como saldo a favor (Fondo).
      if (amountToDistribute > 0 && pagosToInsert.length > 0) {
        pagosToInsert[pagosToInsert.length - 1].monto += amountToDistribute;
      }

      if (pagosToInsert.length === 0) {
        throw new Error("No hay un monto válido para distribuir en los recibos seleccionados.");
      }

      // 3. Guardar los datos en la tabla 'pagos'
      const { error: insertError } = await supabase
        .from('pagos')
        .insert(pagosToInsert);

      if (insertError) {
        console.error("Error detallado:", insertError);
        throw insertError;
      }

      // 3. Mostrar pantalla de éxito
      setIsSuccess(true);

      setTimeout(() => {
        setIsSuccess(false);
        setFormData({ selectedRecibos: [], metodo: 'Transferencia', referencia: '', monto: '', fecha: new Date().toLocaleDateString('en-CA') });
        setFile(null);
        if (filePreviewUrl && filePreviewUrl !== 'pdf') URL.revokeObjectURL(filePreviewUrl);
        setFilePreviewUrl(null);
        onClose();
      }, 2000);

    } catch (error: any) {
      console.error('Error al reportar el pago:', error);
      alert(`Hubo un error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-full">

        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between shrink-0">
          <h3 className="text-white text-lg font-semibold">Reportar Pago</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-4 overflow-y-auto">
            <div className="bg-green-100 p-4 rounded-full">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h4 className="text-xl font-bold text-gray-800">¡Pago Reportado!</h4>
            <p className="text-gray-500 text-sm">Tu pago está en revisión. Te notificaremos pronto.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">

            {/* NUEVO CAMPO: ID del Recibo */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Recibos a pagar (Puedes seleccionar varios)</label>
                {isLoadingRecibos ? (
                  <div className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl flex items-center">
                    <Loader2 className="w-5 h-5 mr-2 animate-spin text-blue-500" />
                    <span className="text-gray-500">Cargando recibos pendientes...</span>
                  </div>
                ) : pendingRecibos && pendingRecibos.length === 0 ? (
                  <div className="w-full px-4 py-2.5 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 text-sm">
                    No tienes recibos pendientes por pagar. ¡Estás al día!
                  </div>
                ) : (
                  <div className="w-full max-h-40 overflow-y-auto bg-gray-50 border border-gray-200 rounded-xl flex flex-col">
                    {pendingRecibos.map((recibo) => (
                      <label key={recibo.id_recibo} className="flex items-center p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors last:border-0">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          checked={formData.selectedRecibos.includes(recibo.id_recibo)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setFormData(prev => ({
                              ...prev,
                              selectedRecibos: checked
                                ? [...prev.selectedRecibos, recibo.id_recibo]
                                : prev.selectedRecibos.filter(id => id !== recibo.id_recibo)
                            }));
                          }}
                        />
                        <span className="ml-3 text-sm text-gray-700 font-medium leading-tight">
                          Recibo N° {recibo.id_recibo} - <span className="text-green-600 font-bold">${Number(recibo.monto_restante).toFixed(2)} restantes</span>
                          <span className="block text-gray-400 font-normal text-xs mt-0.5">
                            Periodo: {new Date(recibo.periodo).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                <select
                  required
                  value={formData.metodo}
                  onChange={(e) => setFormData({ ...formData, metodo: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="Transferencia">Transferencia (Bs)</option>
                  <option value="Pago Móvil">Pago Móvil (Bs)</option>
                  <option value="Zelle">Zelle ($)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.monto}
                    onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input
                  type="date"
                  required
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N° de Referencia</label>
              <input
                type="text"
                required
                value={formData.referencia}
                onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                placeholder="Ej: 12345678"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comprobante <span className="text-red-500">*</span></label>
              {file ? (
                <div className="relative w-full h-32 border-2 border-gray-200 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden">
                  {filePreviewUrl === 'pdf' ? (
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mb-2">
                        <span className="text-red-600 font-bold text-xs">PDF</span>
                      </div>
                      <p className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{file.name}</p>
                    </div>
                  ) : (
                    <img src={filePreviewUrl!} alt="Preview" className="w-full h-full object-contain" />
                  )}
                  <button
                    onClick={removeFile}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-lg transition-colors z-10"
                    title="Quitar archivo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-red-300 border-dashed rounded-xl cursor-pointer bg-red-50/50 hover:bg-red-50 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-6 h-6 text-red-400 mb-2" />
                    <p className="text-xs text-red-500 font-medium">
                      Haz clic para subir comprobante (Obligatorio)
                    </p>
                  </div>
                  <input type="file" required className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                </label>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !pendingRecibos || pendingRecibos.length === 0 || !file}
              className="w-full mt-2 bg-blue-600 text-white font-medium py-3 rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center disabled:opacity-70 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                'Enviar Pago'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}