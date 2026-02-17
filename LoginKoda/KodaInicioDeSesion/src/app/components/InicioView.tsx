import { AlertCircle, Wrench, DollarSign, TrendingUp, Bell, Users, Vote, FileEdit, UserPlus } from 'lucide-react';

export function InicioView() {
  return (
    <>
      {/* 1. Sección de Alertas "Por Hacer" */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Alertas Urgentes
        </h2>
        <div className="space-y-3">
          {/* Pagos por Conciliar */}
          <button className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-red-500 p-3 rounded-full">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Pagos por Conciliar</h3>
                  <p className="text-sm text-blue-200">Requiere aprobación</p>
                </div>
              </div>
              <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                3 Pendientes
              </div>
            </div>
          </button>

          {/* Tickets Abiertos */}
          <button className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-orange-500 p-3 rounded-full">
                  <Wrench className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Tickets Abiertos</h3>
                  <p className="text-sm text-blue-200">Reportes de fallas</p>
                </div>
              </div>
              <div className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                5
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* 2. Sección de Pulso Financiero */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Pulso Financiero
        </h2>
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5">
          {/* Progreso de Recaudación */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">Recaudación de Febrero</span>
              <span className="text-2xl font-bold">65%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
              <div className="bg-green-400 h-full rounded-full" style={{ width: '65%' }}></div>
            </div>
            <p className="text-sm text-blue-200 mt-2">$6,500.00 de $10,000.00 recaudados</p>
          </div>

          {/* Tasa de Cambio BCV */}
          <div className="border-t border-white/20 pt-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-blue-200">Tasa BCV Actual</p>
                <p className="text-2xl font-bold">Bs. 45,50</p>
                <p className="text-xs text-green-400 mt-1">Actualizado hoy</p>
              </div>
              <button className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                Actualizar
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Sección de Acciones Rápidas */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {/* Generar Cobro Mensual */}
          <button className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-all">
            <div className="bg-blue-500 p-3 rounded-full w-fit mx-auto mb-3">
              <DollarSign className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-sm text-center">Generar Cobro Mensual</h3>
          </button>

          {/* Nuevo Comunicado */}
          <button className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-all">
            <div className="bg-purple-500 p-3 rounded-full w-fit mx-auto mb-3">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-sm text-center">Nuevo Comunicado</h3>
          </button>

          {/* Crear Encuesta/Asamblea */}
          <button className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-all">
            <div className="bg-green-500 p-3 rounded-full w-fit mx-auto mb-3">
              <Vote className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-sm text-center">Crear Encuesta / Asamblea</h3>
          </button>

          {/* Registrar Gasto/Multa */}
          <button className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-all">
            <div className="bg-red-500 p-3 rounded-full w-fit mx-auto mb-3">
              <FileEdit className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-sm text-center">Registrar Gasto/Multa</h3>
          </button>
        </div>
      </section>

      {/* 4. Sección de Gestión de Usuarios */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Gestión de Usuarios
        </h2>
        
        {/* Invitar Vecino */}
        <button className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-all mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 p-3 rounded-full">
              <UserPlus className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold">Invitar Vecino</h3>
              <p className="text-sm text-blue-200">Registrar nuevo copropietario</p>
            </div>
          </div>
        </button>

        {/* Morosos Top */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            Morosos Top
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-sm">Apto 404</span>
              <span className="text-red-400 font-bold">$850.00</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-sm">Apto 201</span>
              <span className="text-red-400 font-bold">$720.00</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm">Apto 305</span>
              <span className="text-red-400 font-bold">$650.00</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
