import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Edit2, CreditCard, Phone } from 'lucide-react';

const BANCOS_VZLA = [
  { code: "0102", name: "Banco de Venezuela" },
  { code: "0104", name: "Venezolano de Crédito" },
  { code: "0105", name: "Mercantil" },
  { code: "0108", name: "Provincial" },
  { code: "0114", name: "Bancaribe" },
  { code: "0115", name: "Exterior" },
  { code: "0128", name: "Banco Caroní" },
  { code: "0134", name: "Banesco" },
  { code: "0138", name: "Banco Plaza" },
  { code: "0151", name: "BFC Banco Fondo Común" },
  { code: "0156", name: "100% Banco" },
  { code: "0163", name: "Banco del Tesoro" },
  { code: "0171", name: "Banco Activo" },
  { code: "0172", name: "Bancamiga" },
  { code: "0174", name: "Banplus" },
  { code: "0175", name: "Banco Bicentenario" },
  { code: "0191", name: "BNC Nacional de Crédito" }
];

const PREFIJOS_TELEFONO = ['0424', '0414', '0422', '0412', '0426'];

interface Props {
  codigoEdificio: string;
}

export default function CuentasBancarias({ codigoEdificio }: Props) {
  const [edificio, setEdificio] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Estados del formulario bancario
  const [bancoSeleccionado, setBancoSeleccionado] = useState('');
  const [restoCuenta, setRestoCuenta] = useState('');
  
  // Estados separados para el teléfono de Pago Móvil
  const [prefijoTelefono, setPrefijoTelefono] = useState('0424');
  const [cuerpoTelefono, setCuerpoTelefono] = useState('');

  const TABLA_BDD = 'edificios';

  useEffect(() => {
    if (codigoEdificio) {
      fetchEdificioData();
    }
  }, [codigoEdificio]);

  const fetchEdificioData = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLA_BDD)
        .select('*')
        .eq('codigo_edificio', codigoEdificio)
        .single();
        
      if (error) {
        console.error("Error al traer datos bancarios:", error.message);
        return;
      }
      if (data) {
        setEdificio(data);
      }
    } catch (err) {
      console.error("Excepción inesperada:", err);
    }
  };

  const handleCuentaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorLimpio = e.target.value.replace(/\D/g, '').slice(0, 16);
    setRestoCuenta(valorLimpio);
  };

  // Restringe el cuerpo del teléfono a 7 números
  const handleTelefonoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorLimpio = e.target.value.replace(/\D/g, '').slice(0, 7);
    setCuerpoTelefono(valorLimpio);
  };

  const handleOpenDialog = () => {
    // 1. Cargar datos de la cuenta
    const nro = edificio?.numero_cuenta || ""; 
    if (nro.length >= 4) {
      setBancoSeleccionado(nro.substring(0, 4));
      setRestoCuenta(nro.substring(4));
    } else {
      setBancoSeleccionado('');
      setRestoCuenta('');
    }
    
    // 2. Cargar datos del teléfono separando prefijo y cuerpo
    const telf = edificio?.nro_telefono || '';
    const telfLimpio = telf.replace(/-/g, ''); // Quitamos guiones si los hay
    const prefEncontrado = PREFIJOS_TELEFONO.find(p => telfLimpio.startsWith(p));
    
    if (prefEncontrado) {
      setPrefijoTelefono(prefEncontrado);
      setCuerpoTelefono(telfLimpio.slice(prefEncontrado.length));
    } else {
      setPrefijoTelefono('0424');
      setCuerpoTelefono(telfLimpio);
    }

    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    // Validación de la cuenta
    if (!bancoSeleccionado || restoCuenta.length !== 16) {
      alert("Por favor, completa los 20 dígitos de la cuenta bancaria.");
      return;
    }

    // Validación del teléfono
    if (cuerpoTelefono.length !== 7) {
      alert(`El número de teléfono debe tener exactamente 7 dígitos (actualmente tiene ${cuerpoTelefono.length}).`);
      return;
    }

    const nroCuentaCompleto = `${bancoSeleccionado}${restoCuenta}`;
    const nombreDelBanco = BANCOS_VZLA.find(b => b.code === bancoSeleccionado)?.name || "Desconocido";
    const telefonoCompleto = `${prefijoTelefono}-${cuerpoTelefono}`;

    // Armamos el payload con los campos exactos de tu tabla edificios
    const payload = {
      numero_cuenta: nroCuentaCompleto,
      banco_nombre: nombreDelBanco,
      nro_telefono: telefonoCompleto
    };

    try {
      const { error } = await supabase
        .from(TABLA_BDD)
        .update(payload)
        .eq('codigo_edificio', codigoEdificio);
        
      if (error) throw error;
      
      setIsDialogOpen(false);
      fetchEdificioData(); 
    } catch (error: any) {
      console.error("Error al actualizar cuenta:", error);
      alert("Hubo un error al actualizar los datos: " + error.message);
    }
  };

  return (
    <div className="mt-8 pt-6 border-t border-white/20 animate-fade-in">
      <div className="flex flex-row items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-white/70" />
          <h3 className="text-lg font-medium text-white">Configuración Bancaria y Contacto</h3>
        </div>
      </div>
      
      {!edificio ? (
        <p className="text-sm text-gray-300 italic px-2">Cargando información bancaria...</p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm transition-all hover:bg-white/10 gap-4">
            <div>
              <p className="font-semibold text-white text-base">Datos de Pago</p>
              <p className="text-sm text-white/80 font-mono mt-1">
                {edificio.banco_nombre || "Banco no asignado"} | Cuenta: {edificio.numero_cuenta || "Sin configurar"}
              </p>
              <p className="text-sm text-white/60 mt-1">
                Telf Admin (Pago Móvil): {edificio.nro_telefono || "N/A"}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleOpenDialog} className="text-white hover:bg-white/20 self-start sm:self-auto border border-white/10">
              <Edit2 className="w-4 h-4 mr-2" /> Configurar
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900 text-white border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Actualizar Datos de Pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            
            <div className="space-y-2">
              <Label className="text-white/80">Banco</Label>
              <Select value={bancoSeleccionado} onValueChange={setBancoSeleccionado}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Selecciona un banco" />
                </SelectTrigger>
                <SelectContent>
                  {BANCOS_VZLA.map((banco) => (
                    <SelectItem key={banco.code} value={banco.code}>
                      {banco.code} - {banco.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-white/80">Número de Cuenta (20 dígitos)</Label>
              <div className="flex gap-2">
                <Input 
                  value={bancoSeleccionado} 
                  disabled 
                  placeholder="0000" 
                  className="w-20 text-center bg-white/5 border-white/10 text-white/50" 
                />
                <Input 
                  value={restoCuenta} 
                  onChange={handleCuentaChange} 
                  placeholder="Resto de la cuenta (16 dígitos)" 
                  className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
            </div>

            {/* Nueva sección de Teléfono con Prefijo */}
            <div className="space-y-2">
              <Label className="text-white/80 flex items-center gap-2">
                <Phone className="w-4 h-4" /> Teléfono (Para Pago Móvil)
              </Label>
              <div className="flex gap-2">
                <Select value={prefijoTelefono} onValueChange={setPrefijoTelefono}>
                  <SelectTrigger className="w-[110px] bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Prefijo" />
                  </SelectTrigger>
                  <SelectContent>
                    {PREFIJOS_TELEFONO.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="flex items-center text-white/50 font-bold">-</div>
                
                <Input 
                  value={cuerpoTelefono} 
                  onChange={handleTelefonoChange} 
                  placeholder="1234567" 
                  className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  maxLength={7}
                  inputMode="numeric"
                />
              </div>
            </div>

            <Button onClick={handleSave} className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white">
              Guardar Cambios
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}