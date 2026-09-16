const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { supabaseAdmin } = require('../src/lib/supabaseAdmin');

async function testQuery() {
    let query = supabaseAdmin.from('courses').select('*');
    // Simulate teacher role natively without filtering
    try {
        const { data: courses, error } = await query;
        if (error) {
            console.log("DB ERROR:", error);
            return;
        }
        if (!courses) {
            console.log("NO ERROR, BUT NO COURSES! (null)");
            return;
        }

        console.log("COURSES FETCHED:", courses.length);

        const legacyCourses = courses.map(c => ({
            name: c.name,
            status: c.status,
            pdf: `${c.name}.pdf`,
            audit: {
                approvedBy: c.approved_by,
                approvedAt: c.approved_at
            }
        }));

        console.log("MAPPED:", legacyCourses);
    } catch (e) {
        console.log("JS THROW caught:", e.message);
        console.log(e.stack);
    }
}
testQuery();
