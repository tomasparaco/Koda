import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Hash, Camera, Edit2, Save, X, AlertCircle, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import CuentasBancarias from './CuentasBancarias';

export function SettingsView() {
  const [codigoEdificioActual, setCodigoEdificioActual] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [rif, setRif] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Estado para capturar el error y mostrarlo en pantalla si algo falla
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        setErrorCarga(null);

        // 1. Obtener la sesión actual
        const { data: authData, error: authError } = await supabase.auth.getUser();
        
        if (authError || !authData.user) {
          throw new Error('No hay un usuario autenticado activo');
        }

        // CLAVE 1: Usamos el ID de autenticación, no el correo.
        const userId = authData.user.id; 

        // CLAVE 2: Usamos limit(1) por si el admin tiene 2 apartamentos (evita el error de .single())
        const { data: datosPropietario, error: errorPropietario } = await supabase
          .from('propietarios')
          .select('codigo_edificio')
          .eq('id_auth', userId)
          .limit(1);

        if (errorPropietario) throw errorPropietario;
        
        if (!datosPropietario || datosPropietario.length === 0) {
          throw new Error('Tu usuario no está vinculado a ningún edificio en la base de datos.');
        }

        const idEdificioDinamico = datosPropietario[0].codigo_edificio;
        setCodigoEdificioActual(idEdificioDinamico);

        // 3. Traemos los datos del edificio
        const { data: datosEdificio, error: errorEdificio } = await supabase
          .from('edificios')
          .select('descripcion, direccion, rif')
          .eq('codigo_edificio', idEdificioDinamico)
          .single();

        if (errorEdificio) {
          // Si da error, no rompemos toda la página, solo mostramos consola
          console.error("Error al traer datos del edificio:", errorEdificio);
        }

        if (datosEdificio) {
          setNombre(datosEdificio.descripcion || '');
          setDireccion(datosEdificio.direccion || '');
          setRif(datosEdificio.rif || '');
        }

      } catch (e: any) {
        console.error('Error sincronizando perfil de la BDD:', e);
        setErrorCarga(e.message); // Guardamos el error para mostrarlo
      } finally {
        setLoading(false);
      }

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
        localStorage.setItem('logoEdificio', base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFieldSave = async (field: string) => {
    try {
      let payload = {};
      
      if (field === 'nombre') payload = { descripcion: nombre };
      if (field === 'direccion') payload = { direccion: direccion };
      if (field === 'rif') payload = { rif: rif };

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

      {/* Si hubo un error grave, lo mostramos aquí arriba en rojo */}
      {errorCarga && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-300 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{errorCarga}</p>
        </div>
      )}

      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-lg space-y-4">
        {/* Nombre */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-white/70" />
            <span className="text-white font-medium">Nombre del edificio</span>
          </div>
          {editingField === 'nombre' ? (
            <div className="flex items-center gap-2">
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="bg-white/5 text-white border border-white/10 rounded-lg py-1 px-3 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <button onClick={() => handleFieldSave('nombre')} className="p-2 bg-green-500/20 rounded-lg hover:bg-green-500/40 transition-colors"><Save className="w-4 h-4 text-green-300" /></button>
              <button onClick={() => setEditingField(null)} className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/40 transition-colors"><X className="w-4 h-4 text-red-300" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-white">{nombre || <em className="text-gray-400">Sin datos</em>}</span>
              <button onClick={() => setEditingField('nombre')} disabled={!codigoEdificioActual} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"><Edit2 className="w-4 h-4 text-white/50" /></button>
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
              <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} className="bg-white/5 text-white border border-white/10 rounded-lg py-1 px-3 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <button onClick={() => handleFieldSave('direccion')} className="p-2 bg-green-500/20 rounded-lg hover:bg-green-500/40 transition-colors"><Save className="w-4 h-4 text-green-300" /></button>
              <button onClick={() => setEditingField(null)} className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/40 transition-colors"><X className="w-4 h-4 text-red-300" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-white">{direccion || <em className="text-gray-400">Sin datos</em>}</span>
              <button onClick={() => setEditingField('direccion')} disabled={!codigoEdificioActual} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"><Edit2 className="w-4 h-4 text-white/50" /></button>
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
              <input type="text" value={rif} onChange={(e) => setRif(e.target.value)} className="bg-white/5 text-white border border-white/10 rounded-lg py-1 px-3 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <button onClick={() => handleFieldSave('rif')} className="p-2 bg-green-500/20 rounded-lg hover:bg-green-500/40 transition-colors"><Save className="w-4 h-4 text-green-300" /></button>
              <button onClick={() => setEditingField(null)} className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/40 transition-colors"><X className="w-4 h-4 text-red-300" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-white">{rif || <em className="text-gray-400">Sin datos</em>}</span>
              <button onClick={() => setEditingField('rif')} disabled={!codigoEdificioActual} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"><Edit2 className="w-4 h-4 text-white/50" /></button>
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
              <input type="file" accept="image/*" onChange={handleFileChange} className="text-white" />
              <button onClick={() => handleFieldSave('logo')} className="p-2 bg-green-500/20 rounded-lg hover:bg-green-500/40 transition-colors"><Save className="w-4 h-4 text-green-300" /></button>
              <button onClick={() => setEditingField(null)} className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/40 transition-colors"><X className="w-4 h-4 text-red-300" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="h-10 w-auto object-contain" />
              ) : (
                <span className="text-white"><em>Sin logo</em></span>
              )}
              <button onClick={() => setEditingField('logo')} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"><Edit2 className="w-4 h-4 text-white/50" /></button>
            </div>
          )}
        </div>
        
        {/* COMPONENTE INTEGRADO DE CUENTAS BANCARIAS */}
        {codigoEdificioActual ? (
          <CuentasBancarias codigoEdificio={codigoEdificioActual} />
        ) : (
          <div className="mt-8 pt-6 border-t border-white/20 flex flex-col items-center justify-center text-white/50 py-4 text-sm text-center">
            <CreditCard className="w-8 h-8 mb-2 opacity-50" />
            No pudimos cargar la sección de cuentas bancarias porque tu usuario no tiene un edificio asociado.
          </div>
        )}
        
      </div>
    </div>
  );
}