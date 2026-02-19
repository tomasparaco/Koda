import React from 'react';
import type { Propietario } from '../../types';

interface Props {
  propiedades: Propietario[];
  onSelect: (p: Propietario) => void;
  onLogout: () => void;
}

export default function CondominioSelector({ propiedades, onSelect, onLogout }: Props) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#2B4A7C] font-sans">
      <div className="w-full max-w-2xl mx-4">
        <div className="bg-white rounded-3xl p-8 shadow-xl">
          <h2 className="text-2xl font-semibold mb-4">Selecciona tu condominio</h2>
          <p className="text-sm text-gray-600 mb-6">Escoge a cuál de tus condominios quieres ingresar.</p>

          <div className="grid grid-cols-1 gap-4">
            {propiedades.map((p) => (
              <div key={p.id_propietario} className="flex items-center justify-between p-4 border rounded-xl">
                <div>
                  <div className="font-semibold">{p.edificios?.descripcion || p.nombre}</div>
                  <div className="text-sm text-gray-500">Apto: {p.apartamento} · {p.correo}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => onSelect(p)} className="px-4 py-2 bg-[#4A7FDB] text-white rounded-lg">Entrar</button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-right">
            <button onClick={onLogout} className="text-sm text-gray-600 hover:underline">Cerrar sesión</button>
          </div>
        </div>
      </div>
    </div>
  );
}
