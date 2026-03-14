import React, { useState, useEffect } from 'react';
import { Vote, Plus, X, FileText, CheckCircle, BarChart3, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { EncuestaService } from '../../services/encuesta.service';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export default function AdminVotaciones() {
  const [encuestas, setEncuestas] = useState<any[]>([]);
  const [codigoEdificio, setCodigoEdificio] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);

  // Formulario
  const [pregunta, setPregunta] = useState('');
  const [opciones, setOpciones] = useState(['Sí', 'No', 'Abstención']); // Default
  const [fechaCierre, setFechaCierre] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;

    const { data: propietario } = await supabase
      .from('propietarios')
      .select('codigo_edificio')
      .eq('id_auth', authData.user.id)
      .limit(1);

    if (propietario && propietario.length > 0) {
      const codigo = propietario[0].codigo_edificio;
      setCodigoEdificio(codigo);
      cargarEncuestas(codigo);
    }
  };

  const cargarEncuestas = async (codigo: string) => {
    const data = await EncuestaService.getEncuestas(codigo);
    // Verificamos si alguna caducó por tiempo y la cerramos en la vista
    const actualizadas = data.map(enc => {
        if (enc.activa && new Date(enc.fecha_cierre) < new Date()) {
            enc.activa = false;
            EncuestaService.cerrarEncuesta(enc.id); // Cierre automático
        }
        return enc;
    });
    setEncuestas(actualizadas);
  };

  const handleCrear = async () => {
    if (!pregunta || !fechaCierre || !codigoEdificio) return alert('Completa los campos obligatorios.');
    if (new Date(fechaCierre) <= new Date()) return alert('La fecha de cierre debe ser en el futuro.');

    setLoading(true);
    const res = await EncuestaService.crearEncuesta(codigoEdificio, pregunta, opciones, fechaCierre, archivo);
    if (res.exito) {
      setIsCreating(false);
      setPregunta('');
      setArchivo(null);
      setFechaCierre('');
      cargarEncuestas(codigoEdificio);
      alert('Encuesta creada y notificación enviada a los usuarios.');
    } else {
      alert('Error: ' + res.mensaje);
    }
    setLoading(false);
  };

  const calcularPorcentaje = (votosOpcion: number, totalVotos: number) => {
    if (totalVotos === 0) return 0;
    return Math.round((votosOpcion / totalVotos) * 100);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Vote className="w-6 h-6" /> Asambleas y Votaciones
          </h2>
          <p className="text-white/60">Gestiona encuestas y toma de decisiones.</p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)} className="bg-blue-600 hover:bg-blue-700 text-white">
          {isCreating ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {isCreating ? 'Cancelar' : 'Nueva Encuesta'}
        </Button>
      </div>

      {isCreating && (
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-xl space-y-4">
          <div>
            <Label className="text-white/80">Pregunta o Tema a Votar</Label>
            <Input value={pregunta} onChange={e => setPregunta(e.target.value)} placeholder="Ej. ¿Aprobar el presupuesto de pintura?" className="bg-white/5 border-white/10 text-white mt-1" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-white/80">Opciones de Respuesta</Label>
              <div className="space-y-2 mt-1">
                {opciones.map((op, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input value={op} onChange={(e) => {
                      const nuevas = [...opciones];
                      nuevas[idx] = e.target.value;
                      setOpciones(nuevas);
                    }} className="bg-white/5 border-white/10 text-white" />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-white/80">Fecha límite de cierre</Label>
                <Input type="datetime-local" value={fechaCierre} onChange={e => setFechaCierre(e.target.value)} className="bg-white/5 border-white/10 text-white mt-1" />
              </div>
              <div>
                <Label className="text-white/80">Documento Soporte (Presupuesto/PDF/Img)</Label>
                <Input type="file" onChange={e => setArchivo(e.target.files?.[0] || null)} className="bg-white/5 border-white/10 text-white mt-1" />
              </div>
            </div>
          </div>
          
          <Button onClick={handleCrear} disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white mt-4">
            {loading ? 'Creando y notificando...' : 'Publicar Encuesta'}
          </Button>
        </div>
      )}

      {/* Lista de Encuestas Admin */}
      <div className="grid grid-cols-1 gap-6">
        {encuestas.map((enc) => {
          const totalVotos = enc.votos?.length || 0;
          return (
            <div key={enc.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-white">{enc.pregunta}</h3>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${enc.activa ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                      {enc.activa ? 'En Curso' : 'Cerrada'}
                    </span>
                  </div>
                  <p className="text-white/50 text-sm mt-1">Cierra: {new Date(enc.fecha_cierre).toLocaleString()}</p>
                </div>
                {enc.activa && (
                  <Button variant="destructive" size="sm" onClick={async () => {
                    if(confirm('¿Seguro que deseas cerrar la votación anticipadamente?')) {
                        await EncuestaService.cerrarEncuesta(enc.id);
                        if(codigoEdificio) cargarEncuestas(codigoEdificio);
                    }
                  }}>Terminar Ahora</Button>
                )}
              </div>

              {enc.documento_url && (
                <a href={enc.documento_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded-lg text-sm transition-colors mb-4">
                  <FileText className="w-4 h-4" /> Ver documento adjunto
                </a>
              )}

              {/* Gráficos de Resultados */}
              <div className="space-y-3 mt-4">
                <p className="text-white/70 text-sm mb-2 flex items-center gap-2"><BarChart3 className="w-4 h-4"/> Resultados (Total: {totalVotos} votos)</p>
                {enc.opciones.map((op: string) => {
                  const votosOpcion = enc.votos?.filter((v: any) => v.opcion_seleccionada === op).length || 0;
                  const porcentaje = calcularPorcentaje(votosOpcion, totalVotos);
                  
                  return (
                    <div key={op} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-white font-medium">{op}</span>
                        <span className="text-white/70">{porcentaje}% ({votosOpcion} votos)</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden border border-white/5">
                        <div className="bg-blue-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${porcentaje}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}