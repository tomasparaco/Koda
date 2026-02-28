import { supabase } from '../lib/supabase';

export const ReciboService = {
    /**
     * Emite los recibos del mes para todos los propietarios de un edificio.
     * Calcula el gasto total del mes, lo divide según la alícuota de cada propietario,
     * y actualiza la deuda del propietario reflejándola en la BDD.
     */
    emitirRecibosDelMes: async (codigo_edificio: string): Promise<{ exito: boolean; mensaje: string; recibosEmitidos?: number }> => {
        try {
            // 1. Determinar el inicio y fin del mes actual
            const now = new Date();
            // Asegurarse de que la zona horaria local se maneje correctamente, YYYY-MM-01
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const firstDay = `${year}-${month}-01`;

            const nextMonth = new Date(year, now.getMonth() + 1, 1);
            const nextMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

            // 2. Traer todos los propietarios del edificio
            const { data: propietarios, error: propError } = await supabase
                .from('propietarios')
                .select('id_propietario, alicuota, deuda')
                .eq('codigo_edificio', codigo_edificio);

            if (propError) throw new Error('Error al obtener propietarios: ' + propError.message);
            if (!propietarios || propietarios.length === 0) return { exito: false, mensaje: 'No hay propietarios en el edificio.' };

            // 3. Verificar si ya se emitieron recibos este mes para estos propietarios
            const idsPropietarios = propietarios.map(p => p.id_propietario);
            const { data: recibosExistentes, error: checkError } = await supabase
                .from('recibos')
                .select('id_propietario')
                .eq('periodo', firstDay)
                .in('id_propietario', idsPropietarios);

            if (checkError) throw new Error('Error al verificar recibos existentes: ' + checkError.message);
            if (recibosExistentes && recibosExistentes.length > 0) {
                return { exito: false, mensaje: 'Los recibos para este periodo ya fueron emitidos.' };
            }

            // 4. Obtener todos los gastos del mes actual para el edificio
            const { data: gastos, error: gastosError } = await supabase
                .from('gastos')
                .select('monto')
                .eq('codigo_edificio', codigo_edificio)
                .gte('fecha_gasto', firstDay)
                .lt('fecha_gasto', nextMonthStr);

            if (gastosError) throw new Error('Error al obtener gastos: ' + gastosError.message);

            const gastoTotalMes = gastos?.reduce((acc, gasto) => acc + Number(gasto.monto), 0) || 0;

            if (gastoTotalMes === 0) {
                return { exito: false, mensaje: 'No hay gastos registrados en el mes actual para generar recibos.' };
            }

            // 5. Crear recibos y preparar actualización de deuda por cada propietario
            const recibosInsert = [];
            const deudasActualizar = [];

            for (const prop of propietarios) {
                const alicuotaPercentage = (prop.alicuota || 0) / 100;
                const monto_alicuota = gastoTotalMes * alicuotaPercentage;

                // Podemos definir un fondo de reserva por defecto, por ahora 0. 
                const fondo_reserva = 0;
                const monto_total = monto_alicuota + fondo_reserva;

                recibosInsert.push({
                    id_propietario: prop.id_propietario,
                    periodo: firstDay,
                    monto_alicuota,
                    fondo_reserva,
                    monto_total,
                    fecha_emision: new Date().toISOString().split('T')[0],
                    estado: 'pendiente'
                });

                // Actualizar deuda
                const nuevaDeuda = (prop.deuda || 0) + monto_total;
                deudasActualizar.push(
                    supabase
                        .from('propietarios')
                        .update({ deuda: nuevaDeuda })
                        .eq('id_propietario', prop.id_propietario)
                );
            }

            // 6. Insertar recibos en lote
            const { data: recibosData, error: insertError } = await supabase
                .from('recibos')
                .insert(recibosInsert)
                .select();

            if (insertError) throw new Error('Error al insertar recibos: ' + insertError.message);

            // 7. Ejecutar actualizaciones de deuda
            const updateResults = await Promise.all(deudasActualizar);
            const updateErrors = updateResults.filter(r => r.error);
            if (updateErrors.length > 0) {
                console.error('Algunos errores al actualizar deudas:', updateErrors);
                return { exito: false, mensaje: 'Recibos emitidos, pero hubo errores al actualizar la deuda de algunos propietarios.' };
            }

            return { exito: true, mensaje: `Se emitieron ${recibosInsert.length} recibos correctamente.`, recibosEmitidos: recibosInsert.length };

        } catch (e: any) {
            console.error('Catch emitiendo recibos:', e);
            return { exito: false, mensaje: e.message || 'Error inesperado al emitir los recibos.' };
        }
    },

    /**
     * Obtiene el total de gastos acumulados del mes actual
     */
    getGastosDelMesEstimados: async (codigo_edificio: string): Promise<number> => {
        try {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const firstDay = `${year}-${month}-01`;

            const nextMonth = new Date(year, now.getMonth() + 1, 1);
            const nextMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

            const { data: gastos, error } = await supabase
                .from('gastos')
                .select('monto')
                .eq('codigo_edificio', codigo_edificio)
                .gte('fecha_gasto', firstDay)
                .lt('fecha_gasto', nextMonthStr);

            if (error) return 0;

            return gastos?.reduce((acc, gasto) => acc + Number(gasto.monto), 0) || 0;
        } catch {
            return 0;
        }
    }
};
