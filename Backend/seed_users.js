require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function seed() {
    console.log('Creating teacher...');
    const { data: tData, error: tErr } = await supabase.auth.admin.createUser({
        email: 'teacher_e2e@example.com',
        password: 'password123',
        email_confirm: true
    });
    if (tErr) console.log('Teacher err (maybe exists):', tErr.message);

    console.log('Creating student...');
    const { data: sData, error: sErr } = await supabase.auth.admin.createUser({
        email: 'student_e2e@example.com',
        password: 'password123',
        email_confirm: true
    });
    if (sErr) console.log('Student err (maybe exists):', sErr.message);

    console.log('Inserting profiles...');
    if (tData?.user) await supabase.from('profiles').upsert({ id: tData.user.id, role: 'teacher' });
    if (sData?.user) await supabase.from('profiles').upsert({ id: sData.user.id, role: 'student' });

    console.log('Done!');
}
seed();
