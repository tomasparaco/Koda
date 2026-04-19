import { useState } from 'react';
import { HelpCircle, ChevronRight, Mail } from 'lucide-react';
import type { Propietario } from '../../types';

interface AyudaViewProps {
  propiedad: Propietario;
}

export function AyudaView({ propiedad }: AyudaViewProps) {
  const [selectedFaq, setSelectedFaq] = useState<number | null>(null);
  const [supportMessage, setSupportMessage] = useState('');
  const [isSendingSupport, setIsSendingSupport] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;
    setIsSendingSupport(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const response = await fetch("https://formsubmit.co/ajax/paracoreyestomassta@gmail.com", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
        },
        body: JSON.stringify({
            _subject: `Soporte Técnico Koda - Administrador ${propiedad?.apartamento}`,
            _template: "table",
            Nombre: propiedad?.nombre || "Administrador no identificado",
            Apartamento: propiedad?.apartamento || "Desconocido",
            Edificio: propiedad?.codigo_edificio || "Desconocido",
            Mensaje: supportMessage
        })
      });
      if (response.ok) {
        setSuccessMsg("¡Mensaje enviado exitosamente! Nos contactaremos pronto.");
        setSupportMessage('');
      } else {
        setErrorMsg("Ocurrió un error al enviar tu mensaje. Intenta de nuevo.");
      }
    } catch (error) {
      console.error(error);
      setErrorMsg("No se pudo conectar con el servidor de correos.");
    } finally {
      setIsSendingSupport(false);
      setTimeout(() => setSuccessMsg(''), 5000);
    }
  };

  const faqs = [
    {
      q: "¿Cómo emitir los recibos del mes?",
      a: "En la pestaña de Inicio, busca la sección 'Acciones Rápidas' y selecciona 'Generar Cobro Mensual'. Sigue los pasos para emitir deudas consolidadas a todos los propietarios."
    },
    {
      q: "¿Cómo gestionar tickets o fallas de áreas comunes?",
      a: "En la sección Comunidad encontrarás todos los tickets reportados por vecinos. Puedes cambiar su estado (Abierto, En Proceso, Cerrado) para informar a los residentes."
    },
    {
      q: "¿Cómo aprobar o rechazar pagos pendientes?",
      a: "Desde Inicio verás una alerta roja si hay pagos pendientes. Puedes revisarlos, ver el comprobante adjunto y aprobarlos para que rebajen automáticamente la deuda mensual."
    },
    {
      q: "¿Cómo registrar nuevos gastos o facturas del mes?",
      a: "En la pestaña Finanzas o en Inicio, selecciona 'Registrar Gasto/Multa'. Puedes adjuntar comprobantes PDF o imagen que formarán parte de la próxima facturación mensual."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="bg-white/20 p-4 rounded-full mb-4 backdrop-blur-sm border border-white/30">
            <HelpCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Centro de Ayuda para Administradores</h2>
          <p className="text-blue-100 max-w-lg mx-auto text-sm">
            Encuentra respuestas rápidas a los procesos administrativos de la plataforma, o contacta a nuestro equipo de soporte técnico.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-white text-xl px-2 font-semibold">Preguntas Frecuentes de la Junta</h3>
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden shadow-lg">
          {faqs.map((faq, idx) => {
            const isSelected = selectedFaq === idx;
            return (
              <div key={idx} className="border-b border-white/10 last:border-0 border-opacity-50">
                <button 
                  onClick={() => setSelectedFaq(isSelected ? null : idx)} 
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors focus:outline-none"
                >
                  <span className="font-semibold text-white pr-4">{faq.q}</span>
                  <ChevronRight className={`w-5 h-5 text-blue-300 transition-transform duration-300 shrink-0 ${isSelected ? 'rotate-90' : ''}`} />
                </button>
                <div 
                  className={`overflow-hidden transition-all duration-300 ${isSelected ? 'max-h-48 bg-black/20' : 'max-h-0'}`}
                >
                  <p className="p-5 text-white/80 text-sm leading-relaxed border-t border-white/10">
                    {faq.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <h3 className="text-white text-xl px-2 font-semibold text-center">Soporte Técnico Especializado</h3>
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-lg flex flex-col items-center justify-center max-w-2xl mx-auto">
          <form onSubmit={handleSupportSubmit} className="flex flex-col items-center text-center space-y-4 w-full">
            <h4 className="text-white font-bold text-2xl mb-1">Contacto Koda</h4>
            <p className="text-white/70 text-sm mb-4 max-w-md">
              Si experimentas problemas técnicos con el panel administrativo, errores al generar cobros o fallos de conexión, nuestro equipo de ingenieros está para asistirte.
            </p>
            <div className="flex flex-col gap-4 w-full">
              <textarea 
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                required
                maxLength={500}
                placeholder="Describe tu problema con la plataforma administrativa de forma detallada..."
                className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/40 text-sm min-h-[120px] resize-none focus:outline-none focus:border-blue-500/50"
              />
              {successMsg && (
                <div className="w-full bg-green-500/20 border border-green-500/50 text-green-200 text-sm rounded-xl p-3 text-center animate-in fade-in zoom-in-95">
                  {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="w-full bg-red-500/20 border border-red-500/50 text-red-200 text-sm rounded-xl p-3 text-center animate-in fade-in zoom-in-95">
                  {errorMsg}
                </div>
              )}
              <button 
                type="submit"
                disabled={isSendingSupport}
                className="mx-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 justify-center"
              >
                {isSendingSupport ? 'Enviando...' : <><Mail className="w-5 h-5" /> Enviar Correo a Soporte</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
