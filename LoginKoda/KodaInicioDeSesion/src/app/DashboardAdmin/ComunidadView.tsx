import { useState } from 'react';
import { MessageSquare, Vote, Wrench, Eye, Edit, Trash2, Send, X, CheckCircle } from 'lucide-react';

export function ComunidadView() {
  const [subTab, setSubTab] = useState<'comunicados' | 'votaciones' | 'tickets'>('comunicados');

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
    { id: 3, titulo: 'Puerta principal dañada', apartamento: 'Común', estado: 'pendiente', fecha: '2026-02-10', prioridad: 'alta' },
    { id: 4, titulo: 'Ascensor hace ruido extraño', apartamento: 'Común', estado: 'en_proceso', fecha: '2026-02-08', prioridad: 'media' },
    { id: 5, titulo: 'Jardín necesita mantenimiento', apartamento: 'Común', estado: 'cerrado', fecha: '2026-02-01', prioridad: 'baja' },
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

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'alta': return 'text-red-400';
      case 'media': return 'text-yellow-400';
      case 'baja': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-pestañas */}
      <div className="flex gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-2">
        <button
          onClick={() => setSubTab('comunicados')}
          className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
            subTab === 'comunicados' 
              ? 'bg-white text-blue-600' 
              : 'text-white hover:bg-white/10'
          }`}
        >
          <MessageSquare className="w-5 h-5 mx-auto mb-1" />
          Comunicados
        </button>
        <button
          onClick={() => setSubTab('votaciones')}
          className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
            subTab === 'votaciones' 
              ? 'bg-white text-blue-600' 
              : 'text-white hover:bg-white/10'
          }`}
        >
          <Vote className="w-5 h-5 mx-auto mb-1" />
          Votaciones
        </button>
        <button
          onClick={() => setSubTab('tickets')}
          className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
            subTab === 'tickets' 
              ? 'bg-white text-blue-600' 
              : 'text-white hover:bg-white/10'
          }`}
        >
          <Wrench className="w-5 h-5 mx-auto mb-1" />
          Tickets
        </button>
      </div>

      {/* Contenido de Comunicados */}
      {subTab === 'comunicados' && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Archivo de Comunicados
          </h2>
          <div className="space-y-3">
            {comunicados.map((comunicado) => (
              <div key={comunicado.id} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1">{comunicado.titulo}</h3>
                    <p className="text-sm text-blue-200">
                      Enviado el {new Date(comunicado.fecha).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm bg-white/10 px-3 py-1 rounded-full">
                    <Eye className="w-4 h-4" />
                    <span>{comunicado.vistos}/{comunicado.total}</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors">
                    <Edit className="w-4 h-4" />
                    Editar
                  </button>
                  <button className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors">
                    <Send className="w-4 h-4" />
                    Reenviar
                  </button>
                  <button className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Contenido de Votaciones */}
      {subTab === 'votaciones' && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Vote className="w-5 h-5" />
            Resultados de Votaciones
          </h2>
          <div className="space-y-4">
            {votaciones.map((votacion) => (
              <div key={votacion.id} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg flex-1">{votacion.pregunta}</h3>
                  {votacion.activa && (
                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      Activa
                    </span>
                  )}
                  {!votacion.activa && (
                    <span className="bg-gray-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      Cerrada
                    </span>
                  )}
                </div>

                {/* Barra de Progreso */}
                <div className="space-y-3 mb-4">
                  {/* Sí */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-green-400 font-semibold">Sí</span>
                      <span>{votacion.si} votos ({Math.round((votacion.si / votacion.total) * 100)}%)</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-green-400 h-full rounded-full" 
                        style={{ width: `${(votacion.si / votacion.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* No */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-red-400 font-semibold">No</span>
                      <span>{votacion.no} votos ({Math.round((votacion.no / votacion.total) * 100)}%)</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-red-400 h-full rounded-full" 
                        style={{ width: `${(votacion.no / votacion.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Abstenciones */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400 font-semibold">Abstenciones</span>
                      <span>{votacion.abstenciones} votos ({Math.round((votacion.abstenciones / votacion.total) * 100)}%)</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gray-400 h-full rounded-full" 
                        style={{ width: `${(votacion.abstenciones / votacion.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Botón de Cerrar Votación */}
                {votacion.activa && (
                  <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
                    <CheckCircle className="w-5 h-5" />
                    Cerrar Votación
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Contenido de Tickets */}
      {subTab === 'tickets' && (
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Gestión de Mantenimiento
          </h2>

          {/* Filtros por Estado */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-red-400">
                {tickets.filter(t => t.estado === 'pendiente').length}
              </p>
              <p className="text-sm text-red-300 mt-1">Pendientes</p>
            </div>
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-yellow-400">
                {tickets.filter(t => t.estado === 'en_proceso').length}
              </p>
              <p className="text-sm text-yellow-300 mt-1">En Proceso</p>
            </div>
            <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-green-400">
                {tickets.filter(t => t.estado === 'cerrado').length}
              </p>
              <p className="text-sm text-green-300 mt-1">Cerrados</p>
            </div>
          </div>

          {/* Lista de Tickets */}
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg">{ticket.titulo}</h3>
                      <span className={`text-xs font-bold ${getPrioridadColor(ticket.prioridad)}`}>
                        • {ticket.prioridad.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-blue-200">
                      {ticket.apartamento === 'Común' ? 'Área Común' : `Apto ${ticket.apartamento}`}
                    </p>
                    <p className="text-xs text-blue-300 mt-1">
                      Reportado el {new Date(ticket.fecha).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getEstadoColor(ticket.estado)}`}>
                    {getEstadoTexto(ticket.estado)}
                  </span>
                </div>

                <div className="flex gap-2">
                  {ticket.estado === 'pendiente' && (
                    <button className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg font-semibold transition-colors">
                      Iniciar Proceso
                    </button>
                  )}
                  {ticket.estado === 'en_proceso' && (
                    <button className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors">
                      <CheckCircle className="w-4 h-4" />
                      Marcar como Resuelto
                    </button>
                  )}
                  <button className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold transition-colors">
                    Ver Detalles
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
