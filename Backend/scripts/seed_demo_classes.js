const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const TEACHER_EMAIL = 'Smriti Shreya@gmail.com';
const STUDENT_EMAIL = 'Smriti Shreya12@gmail.com';

const EXPECTED_COURSES = ['DSA', 'DBMS', 'Economics', 'IES'];

async function runSeeding() {
    console.log('Seeding Phase 3 Class Management...');

    // 1. Resolve Demo Teacher
    const { data: teachers, error: tErr } = await s
        .from('profiles')
        .select('*')
        .ilike('display_name', `%smriti%`)
        .eq('role', 'teacher')
        .limit(1);

    if (tErr || !teachers || teachers.length === 0) {
        console.error('Fatal: Could not resolve demo teacher:', TEACHER_EMAIL, tErr);
        return;
    }
    const demoTeacher = teachers[0];
    console.log('Resolved Demo Teacher:', demoTeacher.id, demoTeacher.email);

    // 2. Resolve Demo Student
    const { data: students, error: sErr } = await s
        .from('profiles')
        .select('*')
        .ilike('display_name', `%smriti%`)
        .eq('role', 'student')
        .limit(1);

    if (sErr || !students || students.length === 0) {
        console.error('Fatal: Could not resolve demo student:', STUDENT_EMAIL, sErr);
        return;
    }
    const demoStudent = students[0];
    console.log('Resolved Demo Student:', demoStudent.id, demoStudent.email);


    // 3. Resolve existing Courses
    const { data: courses, error: cErr } = await s
        .from('courses')
        .select('id, name')
        .in('name', EXPECTED_COURSES);

    if (cErr || !courses || courses.length === 0) {
        console.error('Fatal: Could not resolve target courses', cErr);
        return;
    }

    console.log(`Resolved ${courses.length} / 4 expected courses natively.`);

    // 4. Generate Classes Bound strictly natively
    // We will clear existing classes for this teacher first for idempotency
    await s.from('classes').delete().eq('teacher_id', demoTeacher.id);

    const generateJoinCode = (courseName) => {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 4; i++) code += charset[Math.floor(Math.random() * charset.length)];
        return `${courseName.substring(0, 3).toUpperCase()}-${code}`;
    };

    const targetClasses = [];
    for (const course of courses) {
        targetClasses.push({
            course_id: course.id,
            teacher_id: demoTeacher.id,
            name: `${course.name} - Section A`,
            section: 'A',
            join_code: generateJoinCode(course.name)
        });
    }

    const { data: insertedClasses, error: iErr } = await s
        .from('classes')
        .insert(targetClasses)
        .select();

    if (iErr) {
        console.error('Failed inserting classes', iErr);
        return;
    }

    console.log('\n--- SUCCESS: DYNAMIC CLASSES BOUND ---');
    console.table(insertedClasses.map(c => ({ Name: c.name, Code: c.join_code, Course: c.course_id })));

    console.log('\nSeed successfully applied dynamically bypassing mock requirements.');
}

runSeeding();
