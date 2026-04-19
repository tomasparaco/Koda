import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const url = process.env.VITE_SUPABASE_URL || '';
const key = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(url, key);

async function inspect() {
    const { data: pagos } = await supabase.from('pagos').select('*').limit(1);
    console.log('pagos fields:', pagos && pagos[0] ? Object.keys(pagos[0]) : 'no records');

    const { data: recibos } = await supabase.from('recibos').select('*').limit(1);
    console.log('recibos fields:', recibos && recibos[0] ? Object.keys(recibos[0]) : 'no records');

    const { data: gastos } = await supabase.from('gastos').select('*').limit(1);
    console.log('gastos fields:', gastos && gastos[0] ? Object.keys(gastos[0]) : 'no records');

    const { data: propietarios } = await supabase.from('propietarios').select('*').limit(1);
    console.log('propietarios fields:', propietarios && propietarios[0] ? Object.keys(propietarios[0]) : 'no records');
}

inspect().catch(console.error);
