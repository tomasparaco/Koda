export const bcvService = {
    getLatestRate: async (): Promise<{ rate: number; lastUpdate: string; isFallback: boolean }> => {
        try {
            // Intentamos cargar desde localStorage primero para no saturar APIs gratuitamente
            const cachedString = localStorage.getItem('koda_bcv_rate');

            if (cachedString) {
                const cached = JSON.parse(cachedString);
                const hoy = new Date().toISOString().split('T')[0];
                const cachedDate = cached.lastUpdate.split(',')[0];

                // Si ya obtuvimos la tasa HOY, la reutilizamos (API Limit protection)
                if (cachedDate === new Date().toLocaleDateString('es-ES')) {
                    return { rate: cached.rate, lastUpdate: cached.lastUpdate, isFallback: false };
                }
            }

            // API PÚBLICA (Ejemplo de uso de una API gratuita que scrapea BCV o la API de VeDolar/Monitor)
            // Como las APIs gratuitas de Venezuela a veces caen, usamos un Proxy de VeDolar u OpenExchange
            // Dado que no siempre se puede asegurar la API en un entorno web sin backend (CORS), usamos un fallback si falla
            const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
            if (!response.ok) throw new Error('API Error');

            const data = await response.json();
            const rate = data.promedio;
            const lastUpdateFull = new Date(data.fechaActualizacion).toLocaleString('es-ES');

            const result = {
                rate: Number(rate),
                lastUpdate: lastUpdateFull,
                isFallback: false
            };

            // Guardamos en caché
            localStorage.setItem('koda_bcv_rate', JSON.stringify(result));
            return result;

        } catch (error) {
            console.warn('Error fetching BCV API, using fallback or cached data', error);

            // Intentamos volver a usar la caché si existe, aunque esté vieja
            const cachedString = localStorage.getItem('koda_bcv_rate');
            if (cachedString) {
                const cached = JSON.parse(cachedString);
                return { rate: cached.rate, lastUpdate: cached.lastUpdate + " (Sin conexión)", isFallback: true };
            }

            // Valor estático de emergencia en caso de que todo falle
            return {
                rate: 45.50,
                lastUpdate: new Date().toLocaleString('es-ES') + " (Modo Offline)",
                isFallback: true
            };
        }
    }
};
