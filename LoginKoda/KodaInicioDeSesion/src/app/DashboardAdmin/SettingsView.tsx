import { useState, useEffect } from 'react';
import { Building2, MapPin, Hash, Camera, Edit2, Save, X } from 'lucide-react';

export function SettingsView() {
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [rif, setRif] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);

  // helper to persist current state
  const saveConfig = () => {
    const config = { nombre, direccion, rif, logo: logoPreview };
    localStorage.setItem('configEdificio', JSON.stringify(config));
  };

  // Cargar datos iniciales
  useEffect(() => {
    const saved = localStorage.getItem('configEdificio');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setNombre(parsed.nombre || '');
        setDireccion(parsed.direccion || '');
        setRif(parsed.rif || '');
        if (parsed.logo) setLogoPreview(parsed.logo);
      } catch (e) {
        console.error('Error parsing saved configuration', e);
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFieldSave = (field: string) => {
    setEditingField(null);
    saveConfig();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Building2 className="w-6 h-6" />
        Perfil del Condominio
      </h2>

      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-lg space-y-4">
        {/* Nombre */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-white/70" />
            <span className="text-white font-medium">Nombre del edificio</span>
          </div>
          {editingField === 'nombre' ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="bg-white/5 text-white border border-white/10 rounded-lg py-1 px-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={() => handleFieldSave('nombre')}
                className="p-2 bg-green-500/20 rounded-lg hover:bg-green-500/40 transition-colors"
              >
                <Save className="w-4 h-4 text-green-300" />
              </button>
              <button
                onClick={() => setEditingField(null)}
                className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/40 transition-colors"
              >
                <X className="w-4 h-4 text-red-300" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-white">{nombre || <em className="text-gray-400">Sin datos</em>}</span>
              <button
                onClick={() => setEditingField('nombre')}
                className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
              >
                <Edit2 className="w-4 h-4 text-white/50" />
              </button>
            </div>
          )}
        </div>

        {/* Dirección */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-white/70" />
            <span className="text-white font-medium">Dirección fiscal</span>
          </div>
          {editingField === 'direccion' ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                className="bg-white/5 text-white border border-white/10 rounded-lg py-1 px-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button onClick={() => handleFieldSave('direccion')} className="p-2 bg-green-500/20 rounded-lg hover:bg-green-500/40 transition-colors">
                <Save className="w-4 h-4 text-green-300" />
              </button>
              <button onClick={() => setEditingField(null)} className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/40 transition-colors">
                <X className="w-4 h-4 text-red-300" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-white">{direccion || <em className="text-gray-400">Sin datos</em>}</span>
              <button onClick={() => setEditingField('direccion')} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                <Edit2 className="w-4 h-4 text-white/50" />
              </button>
            </div>
          )}
        </div>

        {/* RIF */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-white/70" />
            <span className="text-white font-medium">Identificador legal (RIF)</span>
          </div>
          {editingField === 'rif' ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={rif}
                onChange={(e) => setRif(e.target.value)}
                className="bg-white/5 text-white border border-white/10 rounded-lg py-1 px-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button onClick={() => handleFieldSave('rif')} className="p-2 bg-green-500/20 rounded-lg hover:bg-green-500/40 transition-colors">
                <Save className="w-4 h-4 text-green-300" />
              </button>
              <button onClick={() => setEditingField(null)} className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/40 transition-colors">
                <X className="w-4 h-4 text-red-300" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-white">{rif || <em className="text-gray-400">Sin datos</em>}</span>
              <button onClick={() => setEditingField('rif')} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                <Edit2 className="w-4 h-4 text-white/50" />
              </button>
            </div>
          )}
        </div>

        {/* Logo */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-white/70" />
            <span className="text-white font-medium">Logo del condominio</span>
          </div>
          {editingField === 'logo' ? (
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="text-white"
              />
              <button onClick={() => handleFieldSave('logo')} className="p-2 bg-green-500/20 rounded-lg hover:bg-green-500/40 transition-colors">
                <Save className="w-4 h-4 text-green-300" />
              </button>
              <button onClick={() => setEditingField(null)} className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/40 transition-colors">
                <X className="w-4 h-4 text-red-300" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="h-10 w-auto object-contain" />
              ) : (
                <span className="text-white"><em>Sin logo</em></span>
              )}
              <button onClick={() => setEditingField('logo')} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                <Edit2 className="w-4 h-4 text-white/50" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
