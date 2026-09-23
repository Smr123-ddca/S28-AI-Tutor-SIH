const { supabaseAdmin } = require('./src/lib/supabaseAdmin');
const fs = require('fs');

async function debugStudentClasses() {
    try {
        // 1. Get student ID
        const { data: userProfile, error: userErr } = await supabaseAdmin
            .from('profiles')
            .select('id, email')
            .ilike('email', 'gsmrutishriya12@gmail.com')
            .maybeSingle();

        const student_id = userProfile ? userProfile.id : null;

        // Query as the API does
        const { data: memberships, error: apiErr } = await supabaseAdmin
            .from('class_members')
            .select(`
                joined_at,
                student_id,
                class_id,
                classes (
                    id, name, section, status,
                    courses ( name ),
                    profiles!teacher_id ( display_name )
                )
            `)
            .order('joined_at', { ascending: false })
            .limit(10);

        let result = {
            api_memberships: memberships,
            api_error: apiErr
        };

        if (memberships) {
            const safeClasses = memberships.map(m => {
                const c = m.classes || {};
                const p = c.profiles || {};
                return {
                    class_id: m.class_id,
                    student_id: m.student_id,
                    id: c.id,
                    name: c.name,
                    section: c.section,
                    course_name: c.courses ? c.courses.name : null,
                    teacher_name: p.display_name || 'Instructor',
                    joined_at: m.joined_at,
                    status: c.status
                };
            });
            result.safeClasses = safeClasses;
        }

        fs.writeFileSync('debug_out.json', JSON.stringify(result, null, 2));
        console.log("Done");
    } catch (e) {
        fs.writeFileSync('debug_out.json', JSON.stringify({ error: e.message, stack: e.stack }, null, 2));
    }
}
debugStudentClasses();
