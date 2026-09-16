require('dotenv').config();
const { supabaseAdmin } = require('../src/lib/supabaseAdmin');

async function migrateDrafts() {
    console.log('--- Starting Migration: draft -> pending_review ---');
    try {
        const { data: courses, error: fetchErr } = await supabaseAdmin
            .from('courses')
            .select('id, name')
            .eq('status', 'draft');

        if (fetchErr) throw fetchErr;

        if (!courses || courses.length === 0) {
            console.log('No courses in draft state found. Exiting.');
            return;
        }

        console.log(`Found ${courses.length} courses in draft state:`, courses.map(c => c.name));

        const ids = courses.map(c => c.id);
        const { error: updateErr } = await supabaseAdmin
            .from('courses')
            .update({ status: 'pending_review' })
            .in('id', ids);

        if (updateErr) throw updateErr;

        console.log('✅ Successfully migrated all draft courses directly to pending_review.');
    } catch (e) {
        console.error('Migration failed:', e.message);
    }
}

migrateDrafts();
