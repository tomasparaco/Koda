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

export default function CuentasBancarias() {
  const [edificios, setEdificios] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Estados del formulario
  const [bancoSeleccionado, setBancoSeleccionado] = useState('');
  const [restoCuenta, setRestoCuenta] = useState('');
  const [rif, setRif] = useState('');
  const [nroTelefono, setNroTelefono] = useState(''); // Estado para el teléfono del administrador

  // Tabla y atributos actualizados
  const TABLA_BDD = 'edificios';

  useEffect(() => {
    fetchEdificios();
  }, []);

  const fetchEdificios = async () => {
    try {
      const { data, error } = await supabase.from(TABLA_BDD).select('*');
      if (error) {
        console.error("Error al traer datos:", error.message);
        return;
      }
      if (data) {
        setEdificios(data);
      }
    } catch (err) {
      console.error("Excepción inesperada:", err);
    }
  };

  const handleCuentaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorLimpio = e.target.value.replace(/\D/g, '').slice(0, 16);
    setRestoCuenta(valorLimpio);
  };

  const handleOpenDialog = (edificio: any) => {
    // Usamos codigo_edificio como identificador principal
    setEditingId(edificio.codigo_edificio);
    
    const nro = edificio?.numero_cuenta || ""; 
    // Si ya hay cuenta, separamos los 4 primeros dígitos del resto
    if (nro.length >= 4) {
      setBancoSeleccionado(nro.substring(0, 4));
      setRestoCuenta(nro.substring(4));
    } else {
      setBancoSeleccionado('');
      setRestoCuenta('');
    }
    
    setRif(edificio?.rif || '');
    // Cargamos el teléfono actual del administrador
    setNroTelefono(edificio?.nro_telefono || '');
    
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!bancoSeleccionado || restoCuenta.length !== 16 || !rif || !nroTelefono) {
      alert("Por favor, completa todos los campos correctamente. La cuenta debe tener 20 dígitos en total.");
      return;
    }

    const nroCuentaCompleto = `${bancoSeleccionado}${restoCuenta}`;
    const nombreDelBanco = BANCOS_VZLA.find(b => b.code === bancoSeleccionado)?.name || "Desconocido";

    // Payload con los nombres exactos de tus atributos
    const payload = {
      numero_cuenta: nroCuentaCompleto,
      banco_nombre: nombreDelBanco,
      rif: rif,
      nro_telefono: nroTelefono // Aquí se envía el nuevo teléfono a la base de datos
    };

    try {
      if (editingId) {
        // Ejecutamos el update en Supabase filtrando por codigo_edificio
        const { error } = await supabase.from(TABLA_BDD).update(payload).eq('codigo_edificio', editingId);
        if (error) throw error;
      }
      
      setIsDialogOpen(false);
      fetchEdificios(); // Refrescamos la lista para ver los cambios
    } catch (error: any) {
      console.error("Error al actualizar:", error);
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
      
      {edificios.length === 0 ? (
        <p className="text-sm text-gray-300 italic px-2">No hay información de edificios cargada.</p>
      ) : (
        <div className="space-y-3">
          {edificios.map((edificio) => {
            const nroCuenta = edificio?.numero_cuenta || "Sin configurar";
            const bancoNombre = edificio?.banco_nombre || "Banco no asignado";

            return (
              <div key={edificio.codigo_edificio || Math.random()} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm transition-all hover:bg-white/10 gap-4">
                <div>
                  <p className="font-semibold text-white text-base">{edificio?.descripcion || "Edificio"}</p>
                  <p className="text-sm text-white/80 font-mono mt-1">{bancoNombre} | Cuenta: {nroCuenta}</p>
                  <p className="text-sm text-white/60 mt-1">RIF: {edificio?.rif || "N/A"} | Telf Admin: {edificio?.nro_telefono || "N/A"}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(edificio)} className="text-white hover:bg-white/20 self-start sm:self-auto border border-white/10">
                  <Edit2 className="w-4 h-4 mr-2" /> Configurar
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900 text-white border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Actualizar Datos del Edificio</DialogTitle>
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

            <div className="space-y-2">
              <Label className="text-white/80">RIF</Label>
              <Input 
                value={rif} 
                onChange={(e) => setRif(e.target.value)} 
                placeholder="Ej: J-12345678-9" 
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white/80 flex items-center gap-2">
                <Phone className="w-4 h-4" /> Teléfono del Administrador
              </Label>
              <Input 
                value={nroTelefono} 
                onChange={(e) => setNroTelefono(e.target.value)} 
                placeholder="Ej: 0414-1234567" 
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
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