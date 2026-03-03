import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Hash, Camera, Edit2, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import CuentasBancarias from './CuentasBancarias';

export function SettingsView() {
  // ⚠️ REEMPLAZAR POR EL ID DEL EDIFICIO AUTENTICADO
  const [codigoEdificioActual, setCodigoEdificioActual] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [rif, setRif] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar datos iniciales desde Supabase y localStorage (logo)
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);

        // 1. Obtener la sesión actual desde Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.getUser();
        
        if (authError || !authData.user) {
          console.error('No hay un usuario autenticado activo');
          setLoading(false);
          return;
        }

        const userEmail = authData.user.email; // o authData.user.id si los relacionaste por UUID

        // 2. Buscar al propietario/usuario en su tabla usando el dato de Auth
        // SUSTITUYE 'propietarios' y 'correo' por los nombres exactos de tus atributos
        const { data: datosPropietario, error: errorPropietario } = await supabase
          .from('propietarios')
          .select('codigo_edificio')
          .eq('correo', userEmail)
          .single();

        if (errorPropietario || !datosPropietario) {
          console.error('No se encontró el propietario asociado a este correo');
          setLoading(false);
          return;
        }

        // ¡Aquí capturamos el ID dinámico!
        const idEdificioDinamico = datosPropietario.codigo_edificio;
        setCodigoEdificioActual(idEdificioDinamico);

        // 3. Ahora sí, traemos los datos del edificio correcto
        const { data: datosEdificio, error: errorEdificio } = await supabase
          .from('edificios')
          .select('descripcion, direccion, rif')
          .eq('codigo_edificio', idEdificioDinamico)
          .single();

        if (errorEdificio) throw errorEdificio;

        if (datosEdificio) {
          setNombre(datosEdificio.descripcion || '');
          setDireccion(datosEdificio.direccion || '');
          setRif(datosEdificio.rif || '');
        }

      } catch (e) {
        console.error('Error sincronizando perfil de la BDD:', e);
      } finally {
        setLoading(false);
      }

      // Lógica de caché para el logo (se mantiene igual)
      const savedLogo = localStorage.getItem('logoEdificio');
      if (savedLogo) {
        setLogoPreview(savedLogo);
      }
    };

    fetchConfig();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        setLogoPreview(base64String);
        localStorage.setItem('logoEdificio', base64String); // Guardar imagen en caché
      };
      reader.readAsDataURL(file);
    }
  };

  // Función para guardar campos individuales en la base de datos
  const handleFieldSave = async (field: string) => {
    try {
      let payload = {};
      
      // Armamos el objeto dependiendo de qué campo se está editando
      if (field === 'nombre') payload = { descripcion: nombre };
      if (field === 'direccion') payload = { direccion: direccion };
      if (field === 'rif') payload = { rif: rif };

      // Si es el logo, ya se guardó en el handleFileChange, solo cerramos la edición
      if (field !== 'logo') {
        const { error } = await supabase
          .from('edificios')
          .update(payload)
          .eq('codigo_edificio', codigoEdificioActual);

        if (error) throw error;
      }

      setEditingField(null);
    } catch (error: any) {
      console.error('Error al actualizar BDD:', error);
      alert('Error al guardar: ' + error.message);
    }
  };

  if (loading) {
    return <div className="text-white/70 text-center py-10 animate-pulse">Sincronizando con la base de datos...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
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
        
        {/* Componente Integrado de Cuentas y Contacto */}
        <CuentasBancarias />
        
      </div>
    </div>
  );
}