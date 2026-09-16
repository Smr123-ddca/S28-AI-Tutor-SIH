require('dotenv').config({ path: __dirname + '/../.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase env vars.");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function seedMockUser(email, role, name) {
    console.log(`Seeding mock user: ${email} (${role})...`);

    // 1. Check if user already exists
    const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) {
        console.error("Failed to list users:", listErr);
        return null;
    }

    let user = users.find(u => u.email === email);

    // 2. Create if not exists
    if (!user) {
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: 'MockUserPassword123!',
            email_confirm: true,
            user_metadata: { name, role }
        });

        if (error) {
            console.error(`Failed to create ${email}:`, error);
            return null;
        }
        user = data.user;
        console.log(`Created new auth.users record: ${user.id}`);
    } else {
        console.log(`User already exists in auth.users: ${user.id}`);
    }

    // 3. Ensure profiles table has it (Supabase often uses triggers, but we explicitly UPSERT just in case)
    const { error: profileErr } = await supabaseAdmin.from('profiles').upsert({
        id: user.id,
        role: role,
        display_name: name,
        email: email
    });

    if (profileErr) {
        console.error(`Failed to upsert profile for ${user.id}:`, profileErr);
    } else {
        console.log(`Ensured public.profiles record for: ${user.id}`);
    }

    return user.id;
}

async function run() {
    const teacherId = await seedMockUser('mock-teacher@learnify.local', 'teacher', 'Mock Teacher (Dev)');
    const studentId = await seedMockUser('mock-student@learnify.local', 'student', 'Mock Student (Dev)');

    console.log('\n--- SEED RESULTS FOR auth.middleware.js ---');
    console.log(`'mock-teacher-jwt-token-xyz': '${teacherId}',`);
    console.log(`'mock-student-jwt-token-xyz': '${studentId}'\n`);
    process.exit(0);
}

run();
