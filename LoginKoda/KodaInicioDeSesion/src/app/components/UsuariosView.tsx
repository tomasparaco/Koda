import { useState } from 'react';
import { Users, Search, ChevronRight, Phone, Mail, Home, DollarSign, Edit, Key, Send, Percent } from 'lucide-react';

type Usuario = {
  id: number;
  apartamento: string;
  nombre: string;
  telefono: string;
  email: string;
  deuda: number;
  solvente: boolean;
  alicuota: number;
};

export function UsuariosView() {
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAlicuotaEditor, setShowAlicuotaEditor] = useState(false);

  const usuarios: Usuario[] = [
    { id: 1, apartamento: '102', nombre: 'Ana Silva', telefono: '+58 414-1234567', email: 'ana@email.com', deuda: 0, solvente: true, alicuota: 3.33 },
    { id: 2, apartamento: '201', nombre: 'María González', telefono: '+58 424-2345678', email: 'maria@email.com', deuda: 720.00, solvente: false, alicuota: 3.33 },
    { id: 3, apartamento: '303', nombre: 'Pedro Martínez', telefono: '+58 412-3456789', email: 'pedro@email.com', deuda: 0, solvente: true, alicuota: 3.33 },
    { id: 4, apartamento: '304', nombre: 'Carlos Pérez', telefono: '+58 414-4567890', email: 'carlos@email.com', deuda: 0, solvente: true, alicuota: 3.33 },
    { id: 5, apartamento: '305', nombre: 'Luis Rodríguez', telefono: '+58 424-5678901', email: 'luis@email.com', deuda: 650.00, solvente: false, alicuota: 3.33 },
    { id: 6, apartamento: '404', nombre: 'José Hernández', telefono: '+58 412-6789012', email: 'jose@email.com', deuda: 850.00, solvente: false, alicuota: 3.33 },
    { id: 7, apartamento: '505', nombre: 'Laura Díaz', telefono: '+58 414-7890123', email: 'laura@email.com', deuda: 0, solvente: true, alicuota: 3.33 },
    { id: 8, apartamento: '506', nombre: 'Ricardo Torres', telefono: '+58 424-8901234', email: 'ricardo@email.com', deuda: 0, solvente: true, alicuota: 3.33 },
  ];

  const filteredUsuarios = usuarios.filter(u => 
    u.apartamento.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const transaccionesUsuario = [
    { id: 1, fecha: '2026-01-15', concepto: 'Pago Enero 2026', monto: 150.00, tipo: 'pago' },
    { id: 2, fecha: '2025-12-10', concepto: 'Pago Diciembre 2025', monto: 150.00, tipo: 'pago' },
    { id: 3, fecha: '2025-11-05', concepto: 'Pago Noviembre 2025', monto: 150.00, tipo: 'pago' },
  ];

  return (
    <div className="space-y-6">
      {!selectedUser ? (
        <>
          {/* Directorio Maestro */}
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Directorio de Propietarios
            </h2>

            {/* Buscador */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-200" />
                <input
                  type="text"
                  placeholder="Buscar por apartamento o nombre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            {/* Lista de Usuarios */}
            <div className="space-y-2">
              {filteredUsuarios.map((usuario) => (
                <button
                  key={usuario.id}
                  onClick={() => setSelectedUser(usuario)}
                  className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 hover:bg-white/15 transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Indicador de Estado */}
                      <div className={`w-3 h-3 rounded-full ${usuario.solvente ? 'bg-green-400' : 'bg-red-400'}`}></div>
                      
                      <div>
                        <h3 className="font-bold">Apto {usuario.apartamento}</h3>
                        <p className="text-sm text-blue-200">{usuario.nombre}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {!usuario.solvente && (
                        <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-semibold">
                          Deuda: ${usuario.deuda.toFixed(2)}
                        </span>
                      )}
                      <ChevronRight className="w-5 h-5 text-blue-200" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Botón de Configuración de Alícuotas */}
          <section>
            <button 
              onClick={() => setShowAlicuotaEditor(true)}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-2xl p-5 font-semibold flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-3">
                <Percent className="w-6 h-6" />
                <div className="text-left">
                  <h3 className="font-bold">Configurar Alícuotas</h3>
                  <p className="text-sm text-purple-100">Ajustar porcentaje de cada apartamento</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6" />
            </button>
          </section>
        </>
      ) : (
        /* Ficha del Propietario */
        <section>
          <div className="flex items-center gap-3 mb-6">
            <button 
              onClick={() => setSelectedUser(null)}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-2 hover:bg-white/15 transition-colors"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <h2 className="text-xl font-semibold">Ficha del Propietario</h2>
          </div>

          {/* Información del Usuario */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-white/20 p-4 rounded-full">
                <Home className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Apto {selectedUser.apartamento}</h3>
                <p className="text-lg text-blue-200">{selectedUser.nombre}</p>
              </div>
            </div>

            {/* Datos de Contacto */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-blue-200">
                <Phone className="w-5 h-5" />
                <span>{selectedUser.telefono}</span>
              </div>
              <div className="flex items-center gap-3 text-blue-200">
                <Mail className="w-5 h-5" />
                <span>{selectedUser.email}</span>
              </div>
              <div className="flex items-center gap-3 text-blue-200">
                <Percent className="w-5 h-5" />
                <span>Alícuota: {selectedUser.alicuota}%</span>
              </div>
            </div>

            {/* Estado de Cuenta */}
            <div className={`p-4 rounded-xl ${selectedUser.solvente ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
              <div className="flex justify-between items-center">
                <span className="font-semibold">Estado de Cuenta:</span>
                {selectedUser.solvente ? (
                  <span className="text-green-400 font-bold text-xl">Solvente</span>
                ) : (
                  <span className="text-red-400 font-bold text-xl">Deuda: ${selectedUser.deuda.toFixed(2)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Acciones Rápidas */}
          <div className="mb-6">
            <button className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
              <Send className="w-5 h-5" />
              Reenviar Invitación
            </button>
          </div>

          {/* Historial de Transacciones del Usuario */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden">
            <div className="bg-white/5 p-4 border-b border-white/10">
              <h3 className="font-semibold flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Historial de Transacciones
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {transaccionesUsuario.map((transaccion) => (
                <div key={transaccion.id} className="flex justify-between items-center py-3 border-b border-white/10 last:border-0">
                  <div>
                    <p className="font-semibold">{transaccion.concepto}</p>
                    <p className="text-sm text-blue-200">{new Date(transaccion.fecha).toLocaleDateString('es-ES')}</p>
                  </div>
                  <span className="text-green-400 font-bold">${transaccion.monto.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Modal de Editor de Alícuotas */}
      {showAlicuotaEditor && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowAlicuotaEditor(false)}
          ></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 w-full max-w-3xl max-h-[80vh] overflow-hidden">
            <div className="bg-purple-600 text-white p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold">Configuración de Alícuotas</h3>
              <button 
                onClick={() => setShowAlicuotaEditor(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 rotate-90" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
              <p className="text-gray-600 mb-4">Ajusta el porcentaje de condominio que paga cada apartamento. El total debe sumar 100%.</p>
              
              <div className="space-y-2">
                {usuarios.map((usuario) => (
                  <div key={usuario.id} className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg">
                    <span className="font-semibold text-gray-900 w-20">Apto {usuario.apartamento}</span>
                    <span className="text-gray-600 flex-1">{usuario.nombre}</span>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        step="0.01"
                        defaultValue={usuario.alicuota}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                      <span className="text-gray-600">%</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-gray-900">Total:</span>
                  <span className="text-2xl font-bold text-purple-600">
                    {usuarios.reduce((acc, u) => acc + u.alicuota, 0).toFixed(2)}%
                  </span>
                </div>
                <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition-colors">
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}