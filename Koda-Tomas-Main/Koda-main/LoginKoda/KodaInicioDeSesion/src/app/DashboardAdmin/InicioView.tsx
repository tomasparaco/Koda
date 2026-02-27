import { useState } from 'react';
import { AlertCircle, Wrench, DollarSign, TrendingUp, Bell, Users, Vote, FileEdit, UserPlus, Upload } from 'lucide-react';
import type { Propietario } from '../../types';
import { GastoService } from '../../services/gasto.service';
import { supabase } from '../../lib/supabase';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';

interface InicioViewProps {
  propiedad: Propietario;
}

export function InicioView({ propiedad }: InicioViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);

  // Form state
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [fecha_gasto, setFechaGasto] = useState('');
  const [categoria, setCategoria] = useState('');
  const [factura, setFactura] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFactura(e.target.files[0]);
    }
  };

  const resetForm = () => {
    setTitulo('');
    setDescripcion('');
    setMonto('');
    setFechaGasto('');
    setCategoria('');
    setFactura(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoria) {
        alert('Por favor, selecciona una categoría.');
        return;
    }
    setIsLoading(true);
    let factura_url: string | undefined = undefined;

    if (factura) {
      const fileName = `${propiedad.codigo_edificio}/${Date.now()}_${factura.name}`;
      const { error: uploadError } = await supabase.storage
        .from('facturas')
        .upload(fileName, factura);

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        // Temporarily display the detailed error for debugging
        alert(`Error detallado al subir: ${uploadError.message}`); 
        setIsLoading(false);
        return;
      }
	  
      const { data: publicUrlData } = supabase.storage.from('facturas').getPublicUrl(fileName);
      factura_url = publicUrlData.publicUrl;
    }

    const result = await GastoService.addGasto({
      titulo,
      descripcion,
      monto: parseFloat(monto),
      fecha_gasto,
      categoria,
      factura_url,
      codigo_edificio: propiedad.codigo_edificio,
      pagado_al_proveedor: false, // Default value
    });

    if (result.exito) {
      alert(result.mensaje);
      setShowAddExpenseModal(false);
      resetForm();
      // Optionally, you could pass a function from the layout to refresh other views
    } else {
      alert(result.mensaje);
    }
    setIsLoading(false);
  };

  return (
    <>
      {/* 1. Sección de Alertas "Por Hacer" */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Alertas Urgentes
        </h2>
        <div className="space-y-3">
          {/* Pagos por Conciliar */}
          <button className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-red-500 p-3 rounded-full">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Pagos por Conciliar</h3>
                  <p className="text-sm text-blue-200">Requiere aprobación</p>
                </div>
              </div>
              <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                3 Pendientes
              </div>
            </div>
          </button>

          {/* Tickets Abiertos */}
          <button className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-orange-500 p-3 rounded-full">
                  <Wrench className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">Tickets Abiertos</h3>
                  <p className="text-sm text-blue-200">Reportes de fallas</p>
                </div>
              </div>
              <div className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                5
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* 2. Sección de Pulso Financiero */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Pulso Financiero
        </h2>
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5">
          {/* Progreso de Recaudación */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">Recaudación de Febrero</span>
              <span className="text-2xl font-bold">65%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
              <div className="bg-green-400 h-full rounded-full" style={{ width: '65%' }}></div>
            </div>
            <p className="text-sm text-blue-200 mt-2">$6,500.00 de $10,000.00 recaudados</p>
          </div>

          {/* Tasa de Cambio BCV */}
          <div className="border-t border-white/20 pt-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-blue-200">Tasa BCV Actual</p>
                <p className="text-2xl font-bold">Bs. 45,50</p>
                <p className="text-xs text-green-400 mt-1">Actualizado hoy</p>
              </div>
              <button className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                Actualizar
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Sección de Acciones Rápidas */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {/* Generar Cobro Mensual */}
          <button className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-all">
            <div className="bg-blue-500 p-3 rounded-full w-fit mx-auto mb-3">
              <DollarSign className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-sm text-center">Generar Cobro Mensual</h3>
          </button>

          {/* Nuevo Comunicado */}
          <button className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-all">
            <div className="bg-purple-500 p-3 rounded-full w-fit mx-auto mb-3">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-sm text-center">Nuevo Comunicado</h3>
          </button>

          {/* Crear Encuesta/Asamblea */}
          <button className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-all">
            <div className="bg-green-500 p-3 rounded-full w-fit mx-auto mb-3">
              <Vote className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-sm text-center">Crear Encuesta / Asamblea</h3>
          </button>

          {/* Registrar Gasto/Multa */}
            <Dialog open={showAddExpenseModal} onOpenChange={setShowAddExpenseModal}>
                <DialogTrigger asChild>
                    <button className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-all">
                        <div className="bg-red-500 p-3 rounded-full w-fit mx-auto mb-3">
                        <FileEdit className="w-6 h-6" />
                        </div>
                        <h3 className="font-semibold text-sm text-center">Registrar Gasto/Multa</h3>
                    </button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 text-white border-gray-700 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">Registrar un Gasto</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label htmlFor="titulo" className="text-blue-200">Título del Gasto</Label>
                                <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} required className="bg-white/5 border-white/20 rounded-lg mt-1"/>
                            </div>
                            <div className="col-span-2">
                                <Label htmlFor="descripcion" className="text-blue-200">Descripción Detallada</Label>
                                <Textarea id="descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required className="bg-white/5 border-white/20 rounded-lg mt-1 min-h-[80px]"/>
                            </div>
                            <div>
                                <Label htmlFor="monto" className="text-blue-200">Monto ($)</Label>
                                <Input id="monto" type="number" value={monto} onChange={(e) => setMonto(e.target.value)} required className="bg-white/5 border-white/20 rounded-lg mt-1"/>
                            </div>
                            <div>
                                <Label htmlFor="fecha_gasto" className="text-blue-200">Fecha</Label>
                                <Input id="fecha_gasto" type="date" value={fecha_gasto} onChange={(e) => setFechaGasto(e.target.value)} required className="bg-white/5 border-white/20 rounded-lg mt-1"/>
                            </div>
                            <div className="col-span-2">
                                <Label htmlFor="categoria" className="text-blue-200">Categoría</Label>
                                <Select onValueChange={setCategoria} value={categoria}>
                                    <SelectTrigger className="bg-white/5 border-white/20 rounded-lg mt-1">
                                        <SelectValue placeholder="Seleccione una categoría" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-800 text-white border-gray-700">
                                        <SelectItem value="Servicios">Servicios</SelectItem>
                                        <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                                        <SelectItem value="Extraordinario">Extraordinario</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-2">
                                <Label htmlFor="factura" className="text-blue-200">Adjuntar Factura (Opcional)</Label>
                                <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-white/20 border-dashed rounded-lg">
                                <div className="space-y-1 text-center">
                                    <Upload className="mx-auto h-10 w-10 text-white/50" />
                                    <div className="flex text-sm text-blue-200 justify-center">
                                    <Label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-blue-400 hover:text-blue-300">
                                        <span>Subir un archivo</span>
                                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} />
                                    </Label>
                                    </div>
                                    <p className="text-xs text-white/50">{factura ? factura.name : 'PNG, JPG, hasta 10MB'}</p>
                                </div>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-base">
                                {isLoading ? 'Guardando...' : 'Guardar Gasto'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
      </section>

      {/* 4. Sección de Gestión de Usuarios */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Gestión de Usuarios
        </h2>
        
        {/* Invitar Vecino */}
        <button className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-all mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 p-3 rounded-full">
              <UserPlus className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold">Invitar Vecino</h3>
              <p className="text-sm text-blue-200">Registrar nuevo copropietario</p>
            </div>
          </div>
        </button>

        {/* Morosos Top */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            Morosos Top
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-sm">Apto 404</span>
              <span className="text-red-400 font-bold">$850.00</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-sm">Apto 201</span>
              <span className="text-red-400 font-bold">$720.00</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm">Apto 305</span>
              <span className="text-red-400 font-bold">$650.00</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
