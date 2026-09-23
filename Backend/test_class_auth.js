const { supabaseAdmin } = require('./src/lib/supabaseAdmin');
const fs = require('fs');

async function audit() {
    const class_id = "dcb2c4de-ea57-434a-82d2-f5342ba5a08d"; // Economics - Section A
    const student_id = "3d999019-498e-4d72-a4c2-dc194c25948a"; // The student who joined

    const result = {};

    try {
        result.inputs = { class_id, student_id };

        const { data: membership, error: membershipErr } = await supabaseAdmin
            .from('class_members')
            .select(`
                class_id,
                student_id,
                classes!inner (
                   course_id,
                   status
                )
            `)
            .eq('class_id', class_id)
            .eq('student_id', student_id)
            .maybeSingle();

        result.membership = membership;
        result.membershipErr = membershipErr;

        if (membership) {
            const { data: authCourse, error: authCourseErr } = await supabaseAdmin
                .from('courses')
                .select('id, name')
                .eq('id', membership.classes.course_id)
                .single();

            result.authCourse = authCourse;
            result.authCourseErr = authCourseErr;
        }

        fs.writeFileSync('audit_out.json', JSON.stringify(result, null, 2));
    } catch (e) {
        fs.writeFileSync('audit_out.json', JSON.stringify({ error: e.message }));
    }
    process.exit(0);
}
audit();
