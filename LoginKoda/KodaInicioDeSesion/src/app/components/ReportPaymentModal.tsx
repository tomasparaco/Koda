import { useState } from 'react';
import { X, Upload, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase'; // Asegúrate de que esta ruta sea correcta
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
  
  // Agregamos 'id_recibo' al estado inicial
  const [formData, setFormData] = useState({
    id_recibo: '', 
    metodo: 'Transferencia',
    referencia: '',
    monto: '',
    fecha: new Date().toISOString().split('T')[0],
  });

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let comprobanteUrl = null;

      // 1. Subir la foto del comprobante
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userData.apartamento}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('comprobantes')
          .upload(fileName, file);

        if (uploadError) throw uploadError;
        
        const { data } = supabase.storage
          .from('comprobantes')
          .getPublicUrl(fileName);
          
        comprobanteUrl = data.publicUrl;
      }

      // 2. Guardar los datos en la tabla 'pagos'
      const { error: insertError } = await supabase
        .from('pagos')
        .insert([
          {
            id_recibo: parseInt(formData.id_recibo), // Nos aseguramos que sea un número
            metodo: formData.metodo,
            referencia: formData.referencia,
            monto: parseFloat(formData.monto),
            fecha_pago: formData.fecha,
            comprobante_url: comprobanteUrl,
            estado: 'pendiente'
            // NOTA: No enviamos id_propietario aquí porque el trigger lo buscará solo
          }
        ]);

      if (insertError) {
        console.error("Error detallado:", insertError);
        throw insertError;
      }
      
      // 3. Mostrar pantalla de éxito
      setIsSuccess(true);
      
      setTimeout(() => {
        setIsSuccess(false);
        setFormData({ id_recibo: '', metodo: 'Transferencia', referencia: '', monto: '', fecha: new Date().toISOString().split('T')[0] });
        setFile(null);
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in">
        
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <h3 className="text-white text-lg font-semibold">Reportar Pago</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="bg-green-100 p-4 rounded-full">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h4 className="text-xl font-bold text-gray-800">¡Pago Reportado!</h4>
            <p className="text-gray-500 text-sm">Tu pago está en revisión. Te notificaremos pronto.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            {/* NUEVO CAMPO: ID del Recibo */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">N° de Recibo a pagar</label>
                <input 
                  type="number" 
                  required
                  value={formData.id_recibo}
                  onChange={(e) => setFormData({...formData, id_recibo: e.target.value})}
                  placeholder="Ej: 15"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                <select 
                  required
                  value={formData.metodo}
                  onChange={(e) => setFormData({...formData, metodo: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="Transferencia">Transferencia (Bs)</option>
                  <option value="Pago Móvil">Pago Móvil (Bs)</option>
                  <option value="Zelle">Zelle ($)</option>
                  <option value="Efectivo">Efectivo ($)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={formData.monto}
                    onChange={(e) => setFormData({...formData, monto: e.target.value})}
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
                  onChange={(e) => setFormData({...formData, fecha: e.target.value})}
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
                onChange={(e) => setFormData({...formData, referencia: e.target.value})}
                placeholder="Ej: 12345678"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comprobante (Opcional)</label>
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-6 h-6 text-gray-400 mb-2" />
                  <p className="text-xs text-gray-500">
                    {file ? <span className="text-blue-600 font-medium">{file.name}</span> : "Haz clic para subir imagen"}
                  </p>
                </div>
                <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
              </label>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full mt-2 bg-blue-600 text-white font-medium py-3 rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center disabled:opacity-70"
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