import React from 'react';
import { User, Mail, Phone, Home } from 'lucide-react';
import type { Propietario } from '../../types';

interface UserProfileProps {
  userData: Propietario;
  onBack: () => void;
}

export default function UserProfile({ userData, onBack }: UserProfileProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 shadow-2xl border border-white/10">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center">
            <User className="w-10 h-10 text-white/90" />
          </div>
          <div className="flex-1">
            <h2 className="text-white text-2xl font-semibold">{userData?.nombre || 'Usuario'}</h2>
            <p className="text-white/70 text-sm mt-1">{userData?.apartamento || ''} • {userData?.rol || ''}</p>
          </div>
          <div>
            <button onClick={onBack} className="bg-white/5 text-white/90 px-4 py-2 rounded-xl hover:bg-white/10 transition">Volver</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="p-4 bg-white/5 rounded-xl">
            <h4 className="text-white/80 text-sm mb-2 flex items-center gap-2"><Mail className="w-4 h-4" /> Correo</h4>
            <p className="text-white">{userData?.correo || '—'}</p>
          </div>

          <div className="p-4 bg-white/5 rounded-xl">
            <h4 className="text-white/80 text-sm mb-2 flex items-center gap-2"><Phone className="w-4 h-4" /> Teléfono</h4>
            <p className="text-white">{userData?.celular || '—'}</p>
          </div>

          <div className="p-4 bg-white/5 rounded-xl md:col-span-2">
            <h4 className="text-white/80 text-sm mb-2 flex items-center gap-2"><Home className="w-4 h-4" /> Datos del Apartamento</h4>
            <p className="text-white">{userData?.apartamento || '—'}</p>
            <p className="text-white/60 text-sm mt-2">Alícuota: {userData?.alicuota ?? '—'}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
