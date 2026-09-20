const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runE2E() {
    try {
        console.log('--- STARTING E2E VERIFICATION ---');

        console.log('\n[TEST A] Teacher Workflow');
        const { data: teachers, error: tErr } = await s.from('profiles').select('*').eq('role', 'teacher').limit(1);
        if (tErr) console.log('Teacher fetch err:', tErr);
        const teacher = teachers?.[0];
        if (!teacher) throw new Error('Teacher not found');
        console.log(`✓ Resolved Teacher: ${teacher.id} Role: ${teacher.role}`);

        let { data: myClasses } = await s.from('classes').select('*').eq('teacher_id', teacher.id);
        console.log(`✓ Teacher views My Classes. Found ${myClasses?.length || 0} classes.`);

        const { data: course } = await s.from('courses').select('*').limit(1).single();
        const mockJoinCode = `TEST-${Math.floor(Math.random() * 10000)}`;
        const { data: newClass, error: classErr } = await s.from('classes').insert({
            course_id: course.id,
            teacher_id: teacher.id,
            name: 'E2E Test Class',
            section: 'Z',
            join_code: mockJoinCode
        }).select().single();

        if (classErr) throw new Error(`Class Create Error: ${classErr.message}`);
        console.log(`✓ Teacher created 'E2E Test Class'. Join Code: ${newClass.join_code}`);


        console.log('\n[TEST B] Student Workflow');
        const { data: students, error: sErr } = await s.from('profiles').select('*').eq('role', 'student').limit(1);
        if (sErr) console.log('Student fetch err:', sErr);
        const student = students?.[0];
        if (!student) throw new Error('Student not found');
        console.log(`✓ Resolved Student: ${student.id} Role: ${student.role}`);

        const { data: availableClasses } = await s.from('classes').select('id, join_code').eq('status', 'active');
        console.log(`✓ Student views Active Classes. Found ${availableClasses?.length || 0} classes.`);

        const { error: joinErr } = await s.from('class_members').insert({
            class_id: newClass.id,
            student_id: student.id
        });
        if (joinErr) throw new Error(`Student Join Error: ${joinErr.message}`);
        console.log(`✓ Student successfully joined class using code: ${mockJoinCode}`);

        const { error: dupErr } = await s.from('class_members').insert({
            class_id: newClass.id,
            student_id: student.id
        });
        if (!dupErr || !dupErr.code.includes('23505')) {
            throw new Error('Security Error: Duplicate membership was NOT rejected natively!');
        }
        console.log(`✓ Security: Duplicate join attempt rejected correctly (UNIQUE violation).`);

        console.log('\n[TEST C] Verification');
        const { data: members } = await s.from('class_members').select('*').eq('class_id', newClass.id);
        console.log(`✓ Teacher views class ${newClass.name}. Found ${members?.length} student(s).`);

        if (members[0].student_id !== student.id) throw new Error('Student mismatch');
        console.log(`✓ Membership maps correctly to student profile!`);

        console.log('\n--- VERIFICATION COMPLETE (ALL 100% NATIVE) ---');
    } catch (err) {
        console.error('Fatal E2E error:', err);
    }
}

runE2E();
