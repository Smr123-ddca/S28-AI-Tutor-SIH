const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { supabaseAdmin } = require('../src/lib/supabaseAdmin');
const fs = require('fs');

const generateJoinCode = (courseName) => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        code += charset[randomIndex];
    }
    const prefix = courseName ? courseName.substring(0, 3).toUpperCase() : 'CLS';
    return `${prefix}-${code}`;
};

async function seedClassroom() {
    console.log("--- DEBUGGING SEED ---");

    try {
        const { data: { users }, error: authErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (authErr) throw authErr;

        const teacherEmail = 'gsmrutishriya@gmail.com';
        const studentEmail = 'gsmrutishriya12@gmail.com';

        const authTeacher = users.find(u => u.email === teacherEmail || u.email.includes(teacherEmail));
        const authStudent = users.find(u => u.email === studentEmail || u.email.includes(studentEmail));

        const { data: tProfile } = await supabaseAdmin.from('profiles').select('*').eq('id', authTeacher.id).single();
        const { data: sProfile } = await supabaseAdmin.from('profiles').select('*').eq('id', authStudent.id).single();

        const { data: allCourses } = await supabaseAdmin.from('courses').select('id, name');
        let courseMap = {};
        for (const c of allCourses) {
            courseMap[c.name] = c;
        }

        const classDefs = [
            { name: 'DSA — Section A', courseKey: 'DSA_Code_Reference_Annotated', section: 'A' },
            { name: 'DBMS — Section B', courseKey: 'DBMS_Code_Reference_Annotated', section: 'B' },
            { name: 'Economics — Section A', courseKey: 'Economics_Chunking_Reference', section: 'A' },
            { name: 'IES — Section A', courseKey: 'IES_Demo_Course_Structured', section: 'A' }
        ];

        let createdClasses = [];

        for (const def of classDefs) {
            let course = courseMap[def.courseKey];

            const { data: existing } = await supabaseAdmin
                .from('classes')
                .select('*')
                .eq('teacher_id', tProfile.id)
                .eq('course_id', course.id)
                .eq('section', def.section)
                .single();

            let targetClass;

            if (existing) {
                targetClass = existing;
            } else {
                const join_code = generateJoinCode(course.name);
                const { data: newClass, error: insErr } = await supabaseAdmin
                    .from('classes')
                    .insert({
                        teacher_id: tProfile.id,
                        course_id: course.id,
                        name: def.name,
                        section: def.section,
                        join_code: join_code,
                        status: 'active'
                    })
                    .select()
                    .single();

                if (insErr) {
                    console.error("INSERT ERROR: ", insErr);
                    process.exit(1);
                }
                targetClass = newClass;
            }

            createdClasses.push(targetClass);

            // Fetch a pool of 12 auth users to act as students, excluding the teacher
            const demoUsers = users.filter(u => u.id !== tProfile.id).slice(0, 12);

            for (const dp of demoUsers) {
                // Upsert checking to prevent duplicate enrollment
                const { data: extMem } = await supabaseAdmin
                    .from('class_members')
                    .select('id')
                    .eq('class_id', targetClass.id)
                    .eq('student_id', dp.id)
                    .single();

                if (!extMem) {
                    await supabaseAdmin.from('class_members').insert({
                        class_id: targetClass.id,
                        student_id: dp.id
                    });
                }
            }
        }

        fs.writeFileSync('seed_demo_classroom_output.json', JSON.stringify({
            teacher: { id: tProfile.id, email: authTeacher.email },
            student: { id: sProfile.id, email: authStudent.email },
            classes: createdClasses.map(c => ({
                id: c.id,
                name: c.name,
                join_code: c.join_code
            }))
        }, null, 2));

        console.log("\nFINISHED DEMO CLASSROOM SEEDING SUCCESSFULLY");
        setTimeout(() => process.exit(0), 100);

    } catch (e) {
        console.error("FATAL SCRIPT ERROR:", e);
        setTimeout(() => process.exit(1), 100);
    }
}

seedClassroom();
