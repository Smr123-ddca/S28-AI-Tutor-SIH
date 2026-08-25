require('dotenv').config();
const { supabaseAdmin } = require('../src/lib/supabaseAdmin');

async function diagnoseEvents() {
    console.log("--- PHASE 2: DIAGNOSE EVENTS ---");
    const { data: events, error } = await supabaseAdmin.from('session_events').select('*');
    if (error) {
        console.error(error);
    } else {
        console.log(`Total session events: ${events.length}`);
        events.forEach((e, i) => {
            console.log(`Event ${i + 1}: chunk_id=${e.chunk_id}, correct=${e.correct}, timestamp=${e.timestamp}, student_id=${e.student_id}`);
        });
    }
}
diagnoseEvents();
