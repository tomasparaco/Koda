import { Briefcase, ArrowRight } from 'lucide-react';
import type { Propietario } from '../../types';
import { ThemeToggle } from '../theme/ThemeContext';

interface Props {
  propiedades: Propietario[];
  onSelect: (p: Propietario) => void;
  onLogout: () => void;
  /** Cantidad de edificios que maneja como administradora (0 si no lo es) */
  edificiosAdministrados?: number;
  onAbrirPanelAdmin?: () => void;
}

export default function CondominioSelector({ propiedades, onSelect, onLogout, edificiosAdministrados = 0, onAbrirPanelAdmin }: Props) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-kbg font-sans py-8">
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-2xl mx-4">
        <div className="bg-kcard border border-slate-800/60 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight mb-2">Selecciona tu condominio</h2>
          <p className="text-sm font-medium text-slate-400 mb-8">Escoge a cuál de tus condominios quieres ingresar.</p>

          {edificiosAdministrados > 0 && onAbrirPanelAdmin && (
            <button
              onClick={onAbrirPanelAdmin}
              className="w-full mb-4 flex items-center justify-between p-5 border border-blue-500/30 rounded-2xl bg-blue-500/10 hover:bg-blue-500/15 transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                <div className="bg-blue-500/20 p-3 rounded-xl">
                  <Briefcase className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <div className="font-semibold text-slate-100">Panel de Administración</div>
                  <div className="text-sm text-slate-400 mt-0.5">
                    {edificiosAdministrados} edificio{edificiosAdministrados !== 1 ? 's' : ''} a tu cargo
                  </div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-blue-400" />
            </button>
          )}

          <div className="grid grid-cols-1 gap-4">
            {propiedades.map((p) => (
              <div key={p.id_propietario} className="flex items-center justify-between gap-3 p-5 border border-slate-700/50 rounded-2xl bg-kbg/30 hover:bg-kbg transition-colors">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-200 truncate">{p.edificios?.descripcion || p.nombre}</div>
                  <div className="text-sm font-medium text-slate-500 mt-1 truncate">
                    {p.rol === 'admin' ? 'Junta de condominio' : `Apto: ${p.apartamento}`} · <span className="text-slate-400">{p.correo}</span>
                  </div>
                </div>
                <button onClick={() => onSelect(p)} className="shrink-0 px-5 py-2 bg-slate-100 text-slate-900 font-semibold rounded-xl hover:bg-white active:scale-95 transition-all">
                  Entrar
                </button>
              </div>
            ))}
          </div>

          <div className="mt-8 text-right">
            <button onClick={onLogout} className="text-sm font-medium text-slate-500 hover:text-slate-300 transition-colors">Cerrar sesión</button>
          </div>
        </div>
      </div>
    </div>
  );
}
