import React, { useState, useEffect } from 'react';
import { Vote, FileText, CheckCircle, Lock, BarChart3, AlertCircle } from 'lucide-react';
import type { Propietario } from '../../types';
import { EncuestaService } from '../../services/encuesta.service';
import { Button } from './ui/button';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userData: Propietario;
}

export default function UserVotacionesModal({ isOpen, onClose, userData }: Props) {
  const [encuestas, setEncuestas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [opcionesSeleccionadas, setOpcionesSeleccionadas] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  
  // PANTALLA DE ÉXITO (Req 2)
  const [votoExitoso, setVotoExitoso] = useState(false);

  useEffect(() => {
    if (isOpen && userData.codigo_edificio) {
        setVotoExitoso(false);
        cargarDatos();
    }
  }, [isOpen, userData]);

  const cargarDatos = async () => {
    setLoading(true);
    const data = await EncuestaService.getEncuestas(userData.codigo_edificio);
    
    const actualizadas = data.map(enc => {
        if (enc.activa && new Date(enc.fecha_cierre) < new Date()) enc.activa = false;
        return enc;
    });
    
    setEncuestas(actualizadas);
    setLoading(false);
  };

  const handleVotar = async (encuesta_id: string) => {
    const opcion = opcionesSeleccionadas[encuesta_id];
    if (!opcion) return alert("Por favor selecciona una opción.");

    setEnviando(true);
    const res = await EncuestaService.votar(encuesta_id, userData.apartamento, opcion);
    
    if (res.exito) {
      setVotoExitoso(true); // Mostramos pantalla de éxito
    } else {
      alert(res.mensaje);
    }
    setEnviando(false);
  };

  const calcularPorcentaje = (votosOpcion: number, totalVotos: number) => {
    if (totalVotos === 0) return 0;
    return Math.round((votosOpcion / totalVotos) * 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-slate-900 border-white/20 max-h-[90vh] overflow-y-auto p-0">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 sticky top-0 z-10 shadow-md">
          <DialogTitle className="text-white flex items-center gap-2 text-xl">
            <Vote className="w-6 h-6" /> Asambleas y Votaciones
          </DialogTitle>
          <p className="text-white/80 text-sm mt-1">Participa en las decisiones (Apto. {userData.apartamento})</p>
        </div>

        <div className="p-6">
          {loading ? (
             <div className="text-center text-white/50 py-10 animate-pulse">Cargando asambleas...</div>
          ) : votoExitoso ? (
             <div className="text-center py-16 space-y-4 animate-fade-in">
                 <CheckCircle className="w-24 h-24 text-green-500 mx-auto" />
                 <h2 className="text-3xl font-bold text-white">¡Voto Registrado!</h2>
                 <p className="text-white/70 max-w-md mx-auto text-lg">Tu voto ha sido encriptado y guardado exitosamente de forma anónima. Gracias por participar.</p>
                 <Button 
                    onClick={() => { setVotoExitoso(false); cargarDatos(); }} 
                    className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-6 rounded-xl text-lg shadow-lg"
                 >
                    Ver Resultados
                 </Button>
             </div>
          ) : encuestas.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-white/50">
              No hay votaciones registradas para este edificio.
            </div>
          ) : (
            <div className="grid gap-6">
              {encuestas.map((enc) => {
                const yaVoto = enc.votos?.some((v: any) => v.apartamento === userData.apartamento);
                const totalVotos = enc.votos?.length || 0;

                return (
                  <div key={enc.id} className="bg-white/10 border border-white/20 backdrop-blur-lg rounded-2xl p-6 shadow-xl relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-1.5 h-full ${enc.activa ? 'bg-green-500' : 'bg-red-500'}`} />

                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-bold text-white">{enc.pregunta}</h3>
                          <span className={`px-2 py-1 text-xs font-bold rounded-md ${enc.activa ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                            {enc.activa ? 'Activa' : 'Cerrada'}
                          </span>
                        </div>
                        <p className="text-white/50 text-sm mt-1">Cierre: {new Date(enc.fecha_cierre).toLocaleString()}</p>
                      </div>

                      {yaVoto && (
                        <div className="flex items-center gap-1 text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full text-sm font-medium border border-green-400/20">
                          <CheckCircle className="w-4 h-4" /> Voto registrado
                        </div>
                      )}
                    </div>

                    {enc.documento_url && (
                      <a href={enc.documento_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded-lg text-sm transition-colors mb-6 border border-blue-500/20">
                        <FileText className="w-4 h-4" /> Ver documento de soporte
                      </a>
                    )}

                    {enc.activa && !yaVoto ? (
                      <div className="bg-black/30 p-5 rounded-xl border border-white/5 mt-2">
                        <p className="text-white/80 mb-4 font-medium flex items-center gap-2"><Lock className="w-4 h-4"/> Selecciona tu voto (Anónimo e irreversible)</p>
                        <RadioGroup 
                          value={opcionesSeleccionadas[enc.id] || ''} 
                          onValueChange={(val) => setOpcionesSeleccionadas({...opcionesSeleccionadas, [enc.id]: val})}
                          className="space-y-3"
                        >
                          {enc.opciones.map((op: string) => (
                            <div key={op} className="flex items-center space-x-3 bg-white/5 p-3 rounded-lg border border-white/10 hover:bg-white/10 transition-colors cursor-pointer">
                              <RadioGroupItem value={op} id={`${enc.id}-${op}`} className="border-white/50 text-purple-400" />
                              <Label htmlFor={`${enc.id}-${op}`} className="text-white cursor-pointer w-full text-base font-medium">{op}</Label>
                            </div>
                          ))}
                        </RadioGroup>
                        <Button 
                          onClick={() => handleVotar(enc.id)} 
                          disabled={enviando || !opcionesSeleccionadas[enc.id]} 
                          className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white shadow-lg py-6 text-lg"
                        >
                          {enviando ? 'Encriptando y registrando...' : 'Confirmar Voto'}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4 mt-2">
                        <p className="text-white/70 text-sm mb-2 flex items-center gap-2 font-medium">
                          <BarChart3 className="w-4 h-4"/> Resultados {enc.activa && "(En vivo)"} - {totalVotos} votos
                        </p>
                        <div className="space-y-4">
                          {enc.opciones.map((op: string) => {
                            const votosOpcion = enc.votos?.filter((v: any) => v.opcion_seleccionada === op).length || 0;
                            const porcentaje = calcularPorcentaje(votosOpcion, totalVotos);
                            
                            return (
                              <div key={op} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-white font-medium">{op}</span>
                                  <span className="text-white/80 font-mono">{porcentaje}% <span className="text-white/50">({votosOpcion})</span></span>
                                </div>
                                <div className="w-full bg-black/40 rounded-full h-3 overflow-hidden border border-white/5">
                                  <div className="bg-gradient-to-r from-purple-600 to-purple-400 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${porcentaje}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}