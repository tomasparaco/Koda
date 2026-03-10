import { X, FileText, Shield } from 'lucide-react';

interface LegalTermsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function LegalTermsModal({ isOpen, onClose }: LegalTermsModalProps) {
    if (!isOpen) return null;

    return (
        <>
            <div
                className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl shadow-2xl z-[70] w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-fade-in text-gray-900">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-700 to-blue-900 px-6 py-5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white leading-tight">Políticas y Términos Legales</h2>
                            <p className="text-blue-100 text-xs">Válido para la plataforma administrativa Koda</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-8 bg-gray-50/50">

                    <div className="text-sm text-gray-500 italic bg-gray-100 p-3 rounded-lg border border-gray-200">
                        Última actualización: <strong>15 de Febrero, 2026</strong> | Versión del Documento: <strong>v1.2.0</strong>
                    </div>

                    <section>
                        <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Términos del Servicio
                        </h3>
                        <div className="space-y-4 text-gray-600 text-sm leading-relaxed">
                            <p>
                                <strong>1. Aceptación de los Términos:</strong> Al acceder y utilizar la plataforma de administración de condominios Koda (en adelante "El Servicio"), los administradores y copropietarios (en adelante "Los Usuarios") aceptan estar sujetos a estos Términos del Servicio y a todas las leyes y regulaciones aplicables.
                            </p>
                            <p>
                                <strong>2. Uso de la Plataforma:</strong> El Servicio está destinado exclusivamente a la gestión administrativa, comunicación y manejo financiero interno de condominios residenciales o comerciales. Está estrictamente prohibido utilizar la plataforma para actividades ilícitas, fraudulentas o que vulneren la convivencia del edificio.
                            </p>
                            <p>
                                <strong>3. Responsabilidad Financiera:</strong> Koda proporciona herramientas de registro y cálculo (incluyendo conectividad con tasas del Banco Central). Sin embargo, la plataforma actúa únicamente como un intermediario contable de la información ingresada por las juntas administradoras. Koda no es una entidad financiera, no retiene fondos y no se hace responsable por errores humanos en la emisión de recibos, aprobaciones de pago incorrectas o disputas de deudas entre el condominio y los propietarios.
                            </p>
                            <p>
                                <strong>4. Disponibilidad del Sistema:</strong> Nos esforzamos por mantener la plataforma operativa las 24 horas del día. No obstante, Koda se reserva el derecho de interrumpir el servicio temporalmente para mantenimientos programados o actualizaciones de seguridad sin previo aviso, aunque intentaremos notificar mediante "Alertas Urgentes".
                            </p>
                        </div>
                    </section>

                    <hr className="border-gray-200" />

                    <section>
                        <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            Política de Privacidad
                        </h3>
                        <div className="space-y-4 text-gray-600 text-sm leading-relaxed">
                            <p>
                                <strong>1. Recopilación de Datos:</strong> Para el funcionamiento estricto del Servicio, recopilamos información personal básica como nombres, correos electrónicos, números de teléfono, números de apartamentos e identificadores de transacciones bancarias o comprobantes de pago.
                            </p>
                            <p>
                                <strong>2. Uso de la Información:</strong> Los datos proporcionados son utilizados exclusivamente para la creación del Directorio de Propietarios, el Libro de Transacciones, el cálculo de deudas y el envío de notificaciones y comunicados del edificio.
                            </p>
                            <p>
                                <strong>3. Compartición de Datos Estricta:</strong> Koda asegura que la información de los usuarios se encuentra asilada criptográficamente en nuestros servidores provistos por Supabase. <strong>En ningún caso</strong> venderemos o alquilaremos sus datos personales a terceros, anunciantes o agencias de marketing. Su administrador solo tiene acceso a la información financiera pertinente a su residencia en específico.
                            </p>
                            <p>
                                <strong>4. Retención y Eliminación:</strong> Los datos financieros y el historial de pagos (recibos) se mantendrán almacenados durante el tiempo de vida del condominio en la plataforma por motivos de control administrativo y auditoría. Si un residente vende su propiedad, su información de contacto puede ser anonimizada a petición de la administración del edificio correspondiente.
                            </p>
                        </div>
                    </section>

                </div>

                {/* Footer */}
                <div className="bg-white border-t border-gray-100 p-4 shrink-0 flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </>
    );
}
