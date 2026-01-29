import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ichoefiufcbtiydpmgwy.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_xWJuXpXeqcqvz_naQndOHw_LafyV9TA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);