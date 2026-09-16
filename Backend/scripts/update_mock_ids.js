require('dotenv').config({ path: __dirname + '/../.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function run() {
    const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: profiles } = await s.from('profiles').select('id, email, role');

    const teacherProfile = profiles.find(p => p.email === 'mock-teacher@learnify.local');
    const studentProfile = profiles.find(p => p.email === 'mock-student@learnify.local');

    if (!teacherProfile || !studentProfile) {
        console.error("Missing mock profiles in Supabase.");
        process.exit(1);
    }

    const authMiddlewarePath = path.join(__dirname, '../src/middleware/auth.middleware.js');
    let content = fs.readFileSync(authMiddlewarePath, 'utf8');

    // Replace hardcoded UUID strings with the real Supabase Auth generated UUIDs!
    content = content.replace(/id:\s*['"]mock-teacher-uuid-[^'"]+['"]/g, `id: '${teacherProfile.id}'`);
    content = content.replace(/id:\s*['"]mock-student-uuid-[^'"]+['"]/g, `id: '${studentProfile.id}'`);

    fs.writeFileSync(authMiddlewarePath, content);
    console.log(`Successfully patched auth.middleware.js!`);
    console.log(`Teacher ID mapped to: ${teacherProfile.id}`);
    console.log(`Student ID mapped to: ${studentProfile.id}`);
}
run();
