// src/app/components/UsuariosView.tsx
import { useState, useEffect } from 'react';
import { Users, Search, ChevronRight, ChevronLeft, Phone, Mail, Home, DollarSign, Percent, Send } from 'lucide-react';
import { AuthService } from '../../services/auth.service'; // Asegúrate de que la ruta sea correcta
import { PagoService } from '../../services/pago.service';
import type { Propietario } from '../../types'; // Asegúrate de que la ruta sea correcta

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

// RECIBIMOS LA PROPIEDAD DEL ADMIN COMO PROP
export function UsuariosView({ propiedad }: { propiedad: Propietario }) {
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAlicuotaEditor, setShowAlicuotaEditor] = useState(false);

  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [transactionLimit, setTransactionLimit] = useState(5);

  const formatMonth = (date: Date) => {
    const monthName = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const now = new Date();
    const isCurrentMonth = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    return isCurrentMonth ? `${monthName} (Mes actual)` : monthName;
  };

  const changeMonth = (direction: number) => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    const now = new Date();

    // Evitar ir a meses futuros
    if (newDate.getFullYear() > now.getFullYear() || (newDate.getFullYear() === now.getFullYear() && newDate.getMonth() > now.getMonth())) {
      return;
    }

    setSelectedMonth(newDate);
    setTransactionLimit(5);
  };

  // ESTADOS PARA LA BASE DE DATOS
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);

  // EFECTO PARA BUSCAR TRANSACCIONES
  useEffect(() => {
    const fetchUserTransactions = async () => {
      if (selectedUser?.id) {
        setIsLoadingTransactions(true);
        const { exito, data } = await PagoService.getPagosUsuario(selectedUser.id);
        if (exito && data) {
          setTransactions(data);
        }
        setIsLoadingTransactions(false);
      } else {
        setTransactions([]);
      }
    };
    fetchUserTransactions();
  }, [selectedUser?.id]);

  // EFECTO PARA BUSCAR LOS VECINOS EN SUPABASE
  useEffect(() => {
    const cargarVecinos = async () => {
      setCargando(true);
      try {
        // Filtrar por el edificio del administrador
        const dataBD = await AuthService.getDirectorioVecinos(propiedad.codigo_edificio);

        // Mapear los datos de Supabase a la estructura de tu UI
        const vecinosMapeados: Usuario[] = dataBD.map((vecino: any) => {
          // Asegurarnos de que la deuda sea un número (por si viene null)
          const deudaActual = Number(vecino.deuda) || 0;

          return {
            id: vecino.id_propietario,
            apartamento: vecino.apartamento,
            nombre: vecino.nombre,
            telefono: vecino.celular || 'No registrado',
            email: vecino.correo,
            deuda: deudaActual,
            solvente: deudaActual <= 0, // ¡Magia! Si debe 0 o menos, es solvente automáticamente
            alicuota: vecino.alicuota || 0
          };
        });

        setUsuarios(vecinosMapeados);
      } catch (error) {
        console.error("Error cargando vecinos:", error);
      } finally {
        setCargando(false);
      }
    };

    if (propiedad?.codigo_edificio) {
      cargarVecinos();
    }
  }, [propiedad.codigo_edificio]);

  const filteredUsuarios = usuarios.filter(u =>
    u.apartamento.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTransactions = transactions.filter(t => {
    const tDate = new Date(t.fecha_pago);
    return tDate.getMonth() === selectedMonth.getMonth() && tDate.getFullYear() === selectedMonth.getFullYear();
  });

  const paginatedTransactions = filteredTransactions.slice(0, transactionLimit);
  const now = new Date();
  const isNextMonthDisabled = selectedMonth.getFullYear() === now.getFullYear() && selectedMonth.getMonth() === now.getMonth();

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
        <p className="text-blue-200">Cargando directorio de propietarios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!selectedUser ? (
        <>
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Directorio de Propietarios
            </h2>

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

            <div className="space-y-2">
              {filteredUsuarios.length === 0 ? (
                <p className="text-center text-blue-200 py-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl">
                  No se encontraron vecinos registrados para este edificio.
                </p>
              ) : (
                filteredUsuarios.map((usuario) => (
                  <button
                    key={usuario.id}
                    onClick={() => setSelectedUser(usuario)}
                    className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 hover:bg-white/15 transition-all text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${usuario.solvente ? 'bg-green-400' : 'bg-red-400'}`}></div>
                        <div>
                          <h3 className="font-bold">Apto {usuario.apartamento}</h3>
                          <p className="text-sm text-blue-200">{usuario.nombre}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {usuario.solvente ? (
                          usuario.deuda < 0 && (
                            <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-semibold">
                              A favor: ${Math.abs(usuario.deuda).toFixed(2)}
                            </span>
                          )
                        ) : (
                          <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-semibold">
                            Deuda: ${usuario.deuda.toFixed(2)}
                          </span>
                        )}
                        <ChevronRight className="w-5 h-5 text-blue-200" />
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>

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

            <div className={`p-4 rounded-xl ${selectedUser.solvente ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
              <div className="flex justify-between items-center">
                <span className="font-semibold">Estado de Cuenta:</span>
                {selectedUser.solvente ? (
                  <span className="text-green-400 font-bold text-xl">
                    {selectedUser.deuda < 0 ? `Solvente (A favor: $${Math.abs(selectedUser.deuda).toFixed(2)})` : 'Solvente'}
                  </span>
                ) : (
                  <span className="text-red-400 font-bold text-xl">Deuda: ${selectedUser.deuda.toFixed(2)}</span>
                )}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <button className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
              <Send className="w-5 h-5" />
              Reenviar Invitación
            </button>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl overflow-hidden mb-6">
            <div className="bg-white/5 p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Historial de Transacciones
              </h3>
            </div>

            {/* Control de Mes para el Usuario */}
            <div className="bg-white/5 px-4 py-3 flex items-center justify-between border-b border-white/10">
              <button onClick={() => changeMonth(-1)} className="p-1.5 rounded-lg hover:bg-white/10 transition-all">
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <h4 className="text-sm font-medium capitalize text-white">{formatMonth(selectedMonth)}</h4>
              <button
                onClick={() => changeMonth(1)}
                disabled={isNextMonthDisabled}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {isLoadingTransactions ? (
                <p className="text-center text-blue-200 text-sm py-4">Cargando transacciones...</p>
              ) : filteredTransactions.length === 0 ? (
                <p className="text-center text-blue-200 text-sm py-4">No hay pagos registrados este mes.</p>
              ) : (
                <>
                  {paginatedTransactions.map((transaccion) => (
                    <div key={transaccion.id_pago} className="flex justify-between items-center py-3 border-b border-white/10 last:border-0">
                      <div>
                        <p className="font-semibold">{transaccion.metodo}</p>
                        <p className="text-sm text-blue-200 flex flex-col">
                          <span>{new Date(transaccion.fecha_pago).toLocaleDateString('es-ES')}</span>
                          <span className="text-[10px] text-white/50">Ref: {transaccion.referencia}</span>
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`font-bold ${transaccion.estado === 'rechazado' ? 'text-red-400' : transaccion.estado === 'pendiente' ? 'text-yellow-400' : 'text-green-400'}`}>${Number(transaccion.monto).toFixed(2)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${transaccion.estado === 'aprobado' ? 'bg-green-500/20 text-green-400' : transaccion.estado === 'pendiente' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                          {transaccion.estado.charAt(0).toUpperCase() + transaccion.estado.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}

                  {filteredTransactions.length > transactionLimit && (
                    <div className="mt-4 flex justify-center pt-2">
                      <button
                        onClick={() => setTransactionLimit(prev => prev + 5)}
                        className="bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-xl text-xs font-semibold transition-all border border-white/20"
                      >
                        Ver más transacciones
                      </button>
                    </div>
                  )}

                  {transactionLimit > 5 && (
                    <div className="mt-2 flex justify-center">
                      <button
                        onClick={() => setTransactionLimit(5)}
                        className="text-white/50 hover:text-white px-5 py-2 text-xs font-semibold transition-all"
                      >
                        Mostrar menos
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Modal de Editor de Alícuotas */}
      {showAlicuotaEditor && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowAlicuotaEditor(false)}></div>
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-50 w-full max-w-3xl max-h-[80vh] overflow-hidden text-gray-900">
            <div className="bg-purple-600 text-white p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold">Configuración de Alícuotas</h3>
              <button onClick={() => setShowAlicuotaEditor(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
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
                    {usuarios.reduce((acc, u) => acc + (Number(u.alicuota) || 0), 0).toFixed(2)}%
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
