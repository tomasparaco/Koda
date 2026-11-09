import { useState, useEffect } from 'react';
import { X, Upload, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase'; 
import { PagoService } from '../../services/pago.service';
import { NotificacionService } from '../../services/notificacion.service';
import type { Propietario } from '../../types';
import { useMoneda } from '../moneda/MonedaContext';

interface ReportPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userData: Propietario;
}

export default function ReportPaymentModal({ isOpen, onClose, userData }: ReportPaymentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [pendingRecibos, setPendingRecibos] = useState<any[]>([]);
  const [isLoadingRecibos, setIsLoadingRecibos] = useState(false);
  
  // Conversión entre la moneda del edificio ($ o €) y Bs con la tasa BCV del día
  const { tasa: tasaBcv, simbolo, moneda, fmt } = useMoneda();
  const [montoBs, setMontoBs] = useState('');

  const [formData, setFormData] = useState({
    selectedRecibos: [] as number[],
    metodo: 'Transferencia',
    referencia: '',
    monto: '',
    fecha: new Date().toLocaleDateString('en-CA'),
  });

  // Limpieza de memoria de la imagen
  useEffect(() => {
    return () => {
      if (filePreviewUrl && filePreviewUrl !== 'pdf') URL.revokeObjectURL(filePreviewUrl);
    };
  }, [filePreviewUrl]);

  // Cargar tasa del BCV y recibos pendientes
  useEffect(() => {
    if (isOpen && userData?.id_propietario) {
      const fetchData = async () => {
        setIsLoadingRecibos(true);
        // Traer Recibos
        const { exito, data } = await PagoService.getPendingRecibos(userData.id_propietario);
        if (exito && data) {
          setPendingRecibos(data);
          if (data.length > 0) {
            setFormData(prev => ({ ...prev, selectedRecibos: [data[0].id_recibo] }));
          }
        }
        setIsLoadingRecibos(false);
      };
      fetchData();
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
        setFilePreviewUrl('pdf');
      }
    }
  };

  const removeFile = (e: React.MouseEvent) => {
    e.preventDefault();
    setFile(null);
    if (filePreviewUrl && filePreviewUrl !== 'pdf') URL.revokeObjectURL(filePreviewUrl);
    setFilePreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      alert('⚠️ ATENCIÓN: Es obligatorio subir la imagen o PDF del comprobante de pago antes de continuar.');
      return;
    }

    setIsSubmitting(true);

    try {
      let comprobanteUrl = null;

      let amountToDistribute = parseFloat(formData.monto);
      if (isNaN(amountToDistribute) || amountToDistribute <= 0) throw new Error("El monto ingresado es inválido.");
      if (formData.selectedRecibos.length === 0) throw new Error("Debe seleccionar al menos un recibo a pagar.");

      // Subir archivo a Supabase
      const fileExt = file.name.split('.').pop();
      const fileName = `${userData?.apartamento || 'Apto'}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('facturas').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('facturas').getPublicUrl(fileName);
      comprobanteUrl = data.publicUrl;

      // Distribución en recibos
      const pagosToInsert = [];
      for (const id_recibo of formData.selectedRecibos) {
        const recibo = pendingRecibos.find(r => r.id_recibo === id_recibo);
        if (!recibo) continue;

        const maxToPayHere = Math.min(amountToDistribute, recibo.monto_restante);
        if (maxToPayHere > 0) {
          pagosToInsert.push({
            id_recibo: id_recibo,
            metodo: formData.metodo,
            referencia: formData.metodo === 'Efectivo' ? 'N/A' : formData.referencia, // Validar si es efectivo
            monto: maxToPayHere,
            fecha_pago: formData.fecha,
            comprobante_url: comprobanteUrl,
            estado: 'pendiente'
          });
          amountToDistribute -= maxToPayHere;
        }
      }

      if (amountToDistribute > 0 && pagosToInsert.length > 0) {
        pagosToInsert[pagosToInsert.length - 1].monto += amountToDistribute;
      }

      if (pagosToInsert.length === 0) throw new Error("No hay un monto válido para distribuir.");

      const { error: insertError } = await supabase.from('pagos').insert(pagosToInsert);
      if (insertError) throw insertError;

      const montoTexto = fmt(parseFloat(formData.monto));
      const refTexto = formData.metodo === 'Efectivo' ? '' : ` Ref: ${formData.referencia}.`;

      // Avisar a la administración del nuevo pago por conciliar
      await NotificacionService.crear({
        codigo_edificio: userData.codigo_edificio,
        tipo: 'pago',
        titulo: 'Nuevo Pago Reportado',
        mensaje: `Apto ${userData.apartamento} reportó un pago de ${montoTexto} (${formData.metodo}).${refTexto}`,
        destinatario: 'admin',
      });

      // Confirmación al propietario (le llega también por correo)
      await NotificacionService.crear({
        codigo_edificio: userData.codigo_edificio,
        tipo: 'pago',
        titulo: 'Recibimos tu reporte de pago',
        mensaje: `Reportaste un pago de ${montoTexto} (${formData.metodo}) el ${formData.fecha}.${refTexto} Te avisaremos cuando la administración lo apruebe.`,
        destinatario: userData.apartamento,
      });

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setFormData({ selectedRecibos: [], metodo: 'Transferencia', referencia: '', monto: '', fecha: new Date().toLocaleDateString('en-CA') });
        setMontoBs('');
        setFile(null);
        if (filePreviewUrl && filePreviewUrl !== 'pdf') URL.revokeObjectURL(filePreviewUrl);
        setFilePreviewUrl(null);
        onClose();
      }, 2000);

    } catch (error: any) {
      alert(`Hubo un error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-kcard rounded-3xl w-full max-w-md shadow-lg overflow-hidden animate-fade-in flex flex-col max-h-full">
        <div className="bg-kbg border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
          <h3 className="text-white text-lg font-semibold">Reportar Pago</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5 text-slate-400 hover:text-white" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="bg-emerald-900/50 border border-emerald-500/30 p-4 rounded-full"><CheckCircle className="w-12 h-12 text-emerald-400" /></div>
            <h4 className="text-xl font-bold text-slate-200">¡Pago Reportado!</h4>
            <p className="text-slate-400 text-sm">Tu pago está en revisión.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
            
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-200 mb-1">Recibos a pagar</label>
              {isLoadingRecibos ? (
                <div className="w-full px-4 py-2.5 bg-kbg border border-slate-700 rounded-xl flex items-center">
                  <Loader2 className="w-5 h-5 mr-2 animate-spin text-slate-200" /> Cargando...
                </div>
              ) : (
                <div className="w-full max-h-40 overflow-y-auto bg-kbg border border-slate-700 rounded-xl flex flex-col">
                  {pendingRecibos.map((recibo) => (
                    <label key={recibo.id_recibo} className="flex items-center p-3 border-b border-slate-800 cursor-pointer hover:bg-slate-800/50">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-slate-900 rounded border-slate-700 bg-kbg focus:ring-slate-600"
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
                      <span className="ml-3 text-sm text-slate-200 font-medium">
                        {recibo.tipo === 'extra' && recibo.concepto ? recibo.concepto : `Recibo N° ${recibo.id_recibo}`} - <span className="text-emerald-400 font-bold">{fmt(Number(recibo.monto_restante))}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* CAMBIO: MÉTODOS DE PAGO CON OPCIÓN EFECTIVO */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Método de Pago</label>
              <select
                required
                value={formData.metodo}
                onChange={(e) => setFormData({ ...formData, metodo: e.target.value })}
                className="w-full px-4 py-2.5 bg-kbg border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-slate-600 outline-none"
              >
                <option value="Transferencia">Transferencia (Bs)</option>
                <option value="Pago Móvil">Pago Móvil (Bs)</option>
                <option value="Zelle">Zelle ($)</option>
                <option value="Efectivo">Efectivo ({simbolo}/Bs)</option>
              </select>
            </div>

            {/* CAMBIO: CONVERSIÓN AUTOMÁTICA USD Y BS */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Monto en {moneda === 'EUR' ? '€' : '$'}</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">{simbolo}</span>
                  <input
                    type="number" step="0.01" required
                    value={formData.monto}
                    onChange={(e) => {
                      const val = e.target.value.replace(/^0+(?=\d)/, '');
                      const valorUsd = parseFloat(val);
                      setFormData({ ...formData, monto: val });
                      if (!isNaN(valorUsd) && tasaBcv > 0) setMontoBs((valorUsd * tasaBcv).toFixed(2));
                      else setMontoBs('');
                    }}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2.5 bg-kbg border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-slate-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Monto en Bs</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">Bs</span>
                  <input
                    type="number" step="0.01"
                    value={montoBs}
                    onChange={(e) => {
                      const val = e.target.value.replace(/^0+(?=\d)/, '');
                      const valorBs = parseFloat(val);
                      setMontoBs(val);
                      if (!isNaN(valorBs) && tasaBcv > 0) setFormData({ ...formData, monto: (valorBs / tasaBcv).toFixed(2) });
                      else setFormData({ ...formData, monto: '' });
                    }}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2.5 bg-kbg border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-slate-600 outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Fecha</label>
              <input
                type="date" required
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                className="w-full px-4 py-2.5 bg-kbg border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-slate-600 outline-none"
              />
            </div>

            {/* CAMBIO: OCULTAR REFERENCIA SI ES EFECTIVO */}
            {formData.metodo !== 'Efectivo' && (
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">N° de Referencia</label>
                <input
                  type="text" required
                  value={formData.referencia}
                  onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                  placeholder="Ej: 12345678"
                  className="w-full px-4 py-2.5 bg-kbg border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-slate-600 outline-none"
                />
              </div>
            )}

            {/* Adjuntar Comprobante */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Comprobante <span className="text-slate-400">*</span></label>
              {file ? (
                <div className="relative w-full h-32 border border-slate-700 rounded-xl bg-kbg flex items-center justify-center overflow-hidden">
                  {filePreviewUrl === 'pdf' ? (
                     <span className="text-slate-400 font-bold text-xs">Archivo PDF Subido</span>
                  ) : (
                    <img src={filePreviewUrl!} alt="Preview" className="w-full h-full object-contain" />
                  )}
                  <button onClick={removeFile} className="absolute top-2 right-2 bg-red-500/80 backdrop-blur-md text-white p-1.5 rounded-full z-10">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-24 border border-slate-700 border-dashed rounded-xl cursor-pointer bg-kbg/50 hover:bg-kbg transition-colors">
                  <Upload className="w-6 h-6 text-slate-400 mb-2" />
                  <p className="text-xs text-slate-500 font-medium">Haz clic para subir comprobante</p>
                  <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                </label>
              )}
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full bg-slate-100 text-slate-900 hover:bg-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reportar Pago'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
