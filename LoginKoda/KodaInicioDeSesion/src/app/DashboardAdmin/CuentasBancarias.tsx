import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Edit2, CreditCard, Phone, Plus, Trash2, DollarSign } from 'lucide-react';
import { CuentaBancariaService, CuentaBancaria } from '../../services/cuenta_bancaria.service';

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
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal de formulario
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Estados del formulario bancario
  const [moneda, setMoneda] = useState<'Bolívares' | '$'>('Bolívares');
  const [bancoSeleccionado, setBancoSeleccionado] = useState('');
  const [restoCuenta, setRestoCuenta] = useState('');
  const [correoZelle, setCorreoZelle] = useState('');
  
  // RIF
  const [rifPrefijo, setRifPrefijo] = useState('V');
  const [rifNumero, setRifNumero] = useState('');

  // Estados separados para el teléfono de Pago Móvil
  const [prefijoTelefono, setPrefijoTelefono] = useState('0424');
  const [cuerpoTelefono, setCuerpoTelefono] = useState('');

  // Toast / Confirmación
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; show: boolean }>({ id: 0, show: false });
  const [showSuccessToast, setShowSuccessToast] = useState<{ show: boolean, message: string }>({ show: false, message: '' });

  // Función para mostrar el toast temporal
  const triggerSuccess = (message: string) => {
    setShowSuccessToast({ show: true, message });
    setTimeout(() => {
      setShowSuccessToast({ show: false, message: '' });
    }, 3000);
  };

  useEffect(() => {
    if (codigoEdificio) {
      fetchCuentas();
    }
  }, [codigoEdificio]);

  const fetchCuentas = async () => {
    setIsLoading(true);
    const res = await CuentaBancariaService.getCuentas(codigoEdificio);
    if (res.exito && res.data) {
      setCuentas(res.data);
    }
    setIsLoading(false);
  };

  const handleCuentaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorLimpio = e.target.value.replace(/\D/g, '').slice(0, 16);
    setRestoCuenta(valorLimpio);
  };

  const handleTelefonoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorLimpio = e.target.value.replace(/\D/g, '').slice(0, 7);
    setCuerpoTelefono(valorLimpio);
  };

  const handleRifChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorLimpio = e.target.value.replace(/\D/g, '').slice(0, 9);
    setRifNumero(valorLimpio);
  };

  const resetForm = () => {
    setMoneda('Bolívares');
    setBancoSeleccionado('');
    setRestoCuenta('');
    setCorreoZelle('');
    setRifPrefijo('V');
    setRifNumero('');
    setPrefijoTelefono('0424');
    setCuerpoTelefono('');
    setEditingId(null);
  };

  const handleOpenDialog = (cuenta?: CuentaBancaria) => {
    resetForm();
    if (cuenta) {
      setEditingId(cuenta.id!);
      setMoneda(cuenta.moneda as 'Bolívares' | '$');

      if (cuenta.moneda === 'Bolívares') {
        if (cuenta.numero_cuenta.length >= 4) {
          setBancoSeleccionado(cuenta.numero_cuenta.substring(0, 4));
          setRestoCuenta(cuenta.numero_cuenta.substring(4));
        }
        if (cuenta.telefono) {
          const telfLimpio = cuenta.telefono.replace(/-/g, '');
          const prefEncontrado = PREFIJOS_TELEFONO.find(p => telfLimpio.startsWith(p));
          if (prefEncontrado) {
            setPrefijoTelefono(prefEncontrado);
            setCuerpoTelefono(telfLimpio.slice(prefEncontrado.length));
          } else {
             setCuerpoTelefono(telfLimpio);
          }
        }
        if (cuenta.rif) {
          const pref = cuenta.rif.charAt(0);
          const num = cuenta.rif.substring(1).replace(/-/g, '');
          if (['V', 'J', 'E', 'G'].includes(pref)) {
            setRifPrefijo(pref);
          }
          setRifNumero(num);
        }
      } else {
        // Es Zelle
        setBancoSeleccionado(cuenta.banco_nombre); // Ej: Zelle / Facebank
        setCorreoZelle(cuenta.numero_cuenta); // Usamos numero de cuenta para guardar el correo
      }
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const isZelle = moneda === '$';

    if (isZelle) {
      if (!correoZelle.includes('@')) {
        alert("Por favor, ingresa un correo válido para Zelle.");
        return;
      }
    } else {
      if (!bancoSeleccionado || restoCuenta.length !== 16) {
        alert("Por favor, selecciona un banco y completa los 20 dígitos de la cuenta bancaria.");
        return;
      }
      if (cuerpoTelefono.length > 0 && cuerpoTelefono.length !== 7) {
        alert("El número de teléfono debe tener exactamente 7 dígitos.");
        return;
      }
      if (rifNumero.length === 0) {
         alert("Por favor, ingresa un número de RIF/Cédula.");
         return;
      }
    }

    const nroCuentaCompleto = isZelle ? correoZelle : `${bancoSeleccionado}${restoCuenta}`;
    const nombreDelBanco = isZelle ? "Zelle" : (BANCOS_VZLA.find(b => b.code === bancoSeleccionado)?.name || "Banco Desconocido");
    const telefonoCompleto = (!isZelle && cuerpoTelefono) ? `${prefijoTelefono}-${cuerpoTelefono}` : "";
    const rifCompleto = !isZelle ? `${rifPrefijo}-${rifNumero}` : "";

    const payload: Omit<CuentaBancaria, 'id' | 'created_at'> = {
      codigo_edificio: codigoEdificio,
      moneda: moneda,
      numero_cuenta: nroCuentaCompleto,
      banco_nombre: nombreDelBanco,
      rif: rifCompleto,
      telefono: telefonoCompleto
    };

    try {
      if (editingId) {
        await CuentaBancariaService.updateCuenta(editingId, payload);
      } else {
        await CuentaBancariaService.addCuenta(payload);
      }
      setIsDialogOpen(false);
      triggerSuccess(editingId ? "¡Cuenta actualizada con éxito!" : "¡Cuenta registrada correctamente!");
      fetchCuentas();
    } catch (error: any) {
      console.error("Error al guardar cuenta:", error);
      alert("Hubo un error al guardar los datos.");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await CuentaBancariaService.deleteCuenta(id);
      setConfirmDelete({ id: 0, show: false });
      triggerSuccess("¡Cuenta eliminada exitosamente!");
      fetchCuentas();
    } catch (error) {
      alert("Hubo un error al eliminar la cuenta.");
    }
  };

  return (
    <div className="mt-8 pt-6 border-t border-white/20 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-white/70" />
          <h3 className="text-lg font-medium text-white">Cuentas Bancarias</h3>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
          <Plus className="w-4 h-4 mr-2" /> Nueva Cuenta
        </Button>
      </div>
      
      {isLoading ? (
        <p className="text-sm text-gray-300 italic px-2">Cargando cuentas bancarias...</p>
      ) : cuentas.length === 0 ? (
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl text-center backdrop-blur-sm">
          <p className="text-white/60 mb-2">No hay cuentas bancarias registradas.</p>
          <p className="text-sm text-white/40">Haz clic en "Nueva Cuenta" para añadir una.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cuentas.map(cuenta => (
            <div key={cuenta.id} className="flex flex-col p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm transition-all hover:bg-white/10 gap-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${cuenta.moneda === '$' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {cuenta.moneda === '$' ? <DollarSign className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                  </div>
                  <h4 className="font-semibold text-white text-base">{cuenta.banco_nombre}</h4>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/80 font-medium">
                  {cuenta.moneda}
                </span>
              </div>
              
              <div className="space-y-1.5 flex-1 pl-2">
                <p className="text-sm text-white/80 font-mono flex gap-2">
                  <span className="text-white/50">{cuenta.moneda === '$' ? 'Correo Zelle:' : 'Nro Cuenta:'}</span> 
                  <span className="truncate" title={cuenta.numero_cuenta}>{cuenta.numero_cuenta}</span>
                </p>
                {cuenta.telefono && cuenta.moneda !== '$' && (
                  <p className="text-sm text-white/80 font-mono flex gap-2">
                    <span className="text-white/50">Pago Móvil:</span> {cuenta.telefono}
                  </p>
                )}
                {cuenta.rif && cuenta.moneda !== '$' && (
                  <p className="text-sm text-white/80 font-mono flex gap-2">
                    <span className="text-white/50">RIF:</span> {cuenta.rif}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-white/10">
                <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(cuenta)} className="flex-1 text-blue-200 hover:bg-blue-500/20 hover:text-white border border-transparent transition-colors">
                  <Edit2 className="w-4 h-4 mr-2" /> Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete({ id: cuenta.id!, show: true })} className="flex-1 text-red-300 hover:bg-red-500/20 hover:text-white border border-transparent transition-colors">
                  <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {confirmDelete.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDelete({ id: 0, show: false })} />
          <div className="relative bg-slate-900 border border-white/20 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Eliminar Cuenta</h3>
            <p className="text-white/70 text-sm mb-6">¿Estás seguro de que deseas eliminar esta cuenta bancaria? Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <Button onClick={() => setConfirmDelete({ id: 0, show: false })} className="flex-1 bg-white/10 hover:bg-white/20 text-white">Cancelar</Button>
              <Button onClick={() => handleDelete(confirmDelete.id)} className="flex-1 bg-red-600 hover:bg-red-700 text-white">Confirmar</Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRINCIPAL FORMULARIO */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900 text-white border-white/10 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-400" />
              {editingId ? 'Editar Cuenta Bancaria' : 'Nueva Cuenta Bancaria'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            
            <div className="space-y-2">
              <Label className="text-white/80">Moneda de la Cuenta</Label>
              <Select value={moneda} onValueChange={(val: any) => setMoneda(val)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white h-11">
                  <SelectValue placeholder="Selecciona la moneda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bolívares">Bolívares (Transferencia / Pago Móvil)</SelectItem>
                  <SelectItem value="$">Dólares (Zelle)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {moneda === 'Bolívares' ? (
              <>
                <div className="space-y-2">
                  <Label className="text-white/80">Banco</Label>
                  <Select value={bancoSeleccionado} onValueChange={setBancoSeleccionado}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-11">
                      <SelectValue placeholder="Selecciona un banco" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[250px]">
                      {BANCOS_VZLA.map((banco) => (
                        <SelectItem key={banco.code} value={banco.code}>
                          {banco.code} - {banco.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/80 flex items-center gap-2 text-sm justify-between">
                    <span>Número de Cuenta (20 dígitos) <span className="text-red-400">*</span></span>
                    <span className="text-white/40 text-xs text-right">Faltan {16 - restoCuenta.length}</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input 
                      value={bancoSeleccionado} 
                      disabled 
                      placeholder="0000" 
                      className="w-20 text-center bg-white/5 border-white/10 text-white/50 h-11 disabled:opacity-100" 
                    />
                    <Input 
                      value={restoCuenta} 
                      onChange={handleCuentaChange} 
                      placeholder="Resto de la cuenta (16 dígitos)" 
                      className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2 relative">
                  <Label className="text-white/80 text-sm flex gap-1">RIF / Cédula <span className="text-red-400">*</span></Label>
                  <div className="flex gap-2">
                    <Select value={rifPrefijo} onValueChange={setRifPrefijo}>
                      <SelectTrigger className="w-[80px] bg-white/5 border-white/10 text-white h-11">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="V">V</SelectItem>
                        <SelectItem value="J">J</SelectItem>
                        <SelectItem value="E">E</SelectItem>
                        <SelectItem value="G">G</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <div className="flex items-center text-white/50 font-bold">-</div>
                    
                    <Input 
                      value={rifNumero} 
                      onChange={handleRifChange} 
                      placeholder="12345678" 
                      className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/80 flex items-center gap-2 mt-4 pt-4 border-t border-white/5 text-sm">
                    <Phone className="w-4 h-4 text-purple-400" /> Teléfono para Pago Móvil (Opcional)
                  </Label>
                  <div className="flex gap-2 relative">
                    <Select value={prefijoTelefono} onValueChange={setPrefijoTelefono}>
                      <SelectTrigger className="w-[100px] bg-white/5 border-white/10 text-white h-11">
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
                      className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11"
                      maxLength={7}
                      inputMode="numeric"
                    />
                  </div>
                  {(cuerpoTelefono.length > 0 && cuerpoTelefono.length < 7) && (
                    <p className="text-xs text-yellow-400 mt-1 pl-[116px]">Faltan {7 - cuerpoTelefono.length} dígitos</p>
                  )}
                </div>
              </>
            ) : (
              <>
                 <div className="space-y-2">
                  <Label className="text-white/80">Correo Electrónico (Zelle)</Label>
                  <Input 
                    type="email"
                    value={correoZelle} 
                    onChange={e => setCorreoZelle(e.target.value)} 
                    placeholder="ejemplo@correo.com" 
                    className="w-full bg-white/5 border-white/10 text-white placeholder:text-white/30 h-11"
                  />
                </div>
              </>
            )}

            <Button onClick={handleSave} className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl text-md font-semibold shadow-lg shadow-blue-900/20">
              {editingId ? 'Guardar Cambios' : 'Registrar Cuenta'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* TOAST DE ÉXITO */}
      {showSuccessToast.show && (
        <div className="fixed bottom-4 right-4 z-[120] bg-green-600/90 text-white px-6 py-3 rounded-xl shadow-2xl shadow-green-900/50 backdrop-blur-md flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium text-sm">{showSuccessToast.message}</span>
        </div>
      )}
    </div>
  );
}