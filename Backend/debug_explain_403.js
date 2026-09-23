const { supabaseAdmin } = require('./src/lib/supabaseAdmin');
const fs = require('fs');

async function debugExplain() {
    const student_id = "3d999019-498e-4d72-a4c2-dc194c25948a";
    const class_id = "dcb2c4de-ea57-434a-82d2-f5342ba5a08d";

    console.log("Checking class members...");
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

    console.log("Membership result:", JSON.stringify(membership, null, 2));
    if (membershipErr) console.error("Membership Error:", membershipErr);

    if (membershipErr || !membership) {
        console.log("--> Would return 403: Context forbidden: Student is not a member of the requested class.");
        return;
    }

    console.log("Checking course...");
    const { data: authCourse, error: authCourseErr } = await supabaseAdmin
        .from('courses')
        .select('id, name')
        .eq('id', membership.classes.course_id)
        .single();

    console.log("Auth Course result:", JSON.stringify(authCourse, null, 2));
    if (authCourseErr) console.error("Course Error:", authCourseErr);

    if (!authCourse) {
        console.log("--> Would return 403: Cannot query an unpublished or non-existent course.");
        return;
    }
    console.log("--> Success! Target course derived natively.");
}
debugExplain();
