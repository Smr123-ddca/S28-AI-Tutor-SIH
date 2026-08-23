const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const rawUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const supabaseUrl = rawUrl.startsWith('http') ? rawUrl.replace(/\/rest\/v1\/?$/, '') : 'https://placeholder.supabase.co';
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim() || 'placeholder-key';

if (!rawUrl || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('Warning: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables in Backend.');
}

// Create a supabase client for interacting with the database as an admin
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

module.exports = { supabaseAdmin };
