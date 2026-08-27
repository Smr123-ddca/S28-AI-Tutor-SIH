const { supabaseAdmin } = require('./src/lib/supabaseAdmin.js');

async function checkDatabase() {
    console.log("Checking practice_questions...");
    const req1 = await supabaseAdmin.from('practice_questions').select('id').limit(1);
    console.log("practice_questions result:", req1.error || "TABLE EXISTS");

    console.log("Checking profiles...");
    const req2 = await supabaseAdmin.from('profiles').select('id').limit(1);
    console.log("profiles result:", req2.error || "TABLE EXISTS");
}

checkDatabase();
