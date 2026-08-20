const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL; // Using VITE_SUPABASE_URL just in case it's in env
const supabaseUrl = rawUrl ? rawUrl.replace(/\/rest\/v1\/?$/, '') : null;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Warning: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables in Backend.');
}

// Create a supabase client for interacting with the database as an admin
const supabaseAdmin = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseServiceKey || 'placeholder-key');

module.exports = { supabaseAdmin };
