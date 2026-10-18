// js/supabase-config.js

const SUPABASE_URL = 'https://rqctkhvnhynqqchdqeqf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_m4MNSOsLJ7vNiFSniiKYBg_CAdfoPGg';

// Inicializa el cliente global de Supabase de forma segura
let supabaseClient;
if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.error('El SDK de Supabase (@supabase/supabase-js) no se pudo cargar. Revisa tu conexión a internet.');
}
