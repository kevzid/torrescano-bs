// js/supabase-config.js

const SUPABASE_URL = 'https://rqctkhvnhynqqchdqeqf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_m4MNSOsLJ7vNiFSniiKYBg_CAdfoPGg';

// Inicializa el cliente global de Supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
