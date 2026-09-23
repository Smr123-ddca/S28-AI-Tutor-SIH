const { supabaseAdmin } = require('../lib/supabaseAdmin');

/**
 * Normalizes a join code for consistent lookup
 */
const normalizeJoinCode = (code) => {
    return code ? code.trim().toUpperCase() : null;
};

/**
 * Generate a random 8-character join code (e.g., DSA-A7K2)
 */
const generateJoinCode = (courseName) => {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        code += charset[randomIndex];
    }
    // Simple prefix based on course name
    const prefix = courseName ? courseName.substring(0, 3).toUpperCase() : 'CLS';
    return `${prefix}-${code}`;
};

/**
 * TEACHER: Create a class
 */
async function createClass(req, res) {
    try {
        const { course_id, name, section } = req.body;
        const teacher_id = req.user.id;

        if (!course_id || !name) {
            return res.status(400).json({ error: 'course_id and name are required' });
        }

        // 1. Verify course exists and get its name
        const { data: course, error: courseErr } = await supabaseAdmin
            .from('courses')
            .select('name')
            .eq('id', course_id)
            .single();

        if (courseErr || !course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        // 2. Generate join code
        const join_code = generateJoinCode(course.name);

        // 3. Insert class
        const { data: newClass, error: insertErr } = await supabaseAdmin
            .from('classes')
            .insert({
                course_id,
                teacher_id,
                name,
                section,
                join_code
            })
            .select()
            .single();

        if (insertErr) {
            console.error('Error creating class:', insertErr);
            return res.status(500).json({ error: 'Failed to create class natively' });
        }

        res.status(201).json(newClass);
    } catch (error) {
        console.error('createClass error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

/**
 * TEACHER: Get all classes owned by teacher
 */
async function getTeacherClasses(req, res) {
    try {
        const teacher_id = req.user.id;

        const { data: classes, error } = await supabaseAdmin
            .from('classes')
            .select(`
                *,
                courses ( name )
            `)
            .eq('teacher_id', teacher_id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Fetch student counts manually using aggregated count
        const enhancedClasses = await Promise.all(classes.map(async (c) => {
            const { count } = await supabaseAdmin
                .from('class_members')
                .select('*', { count: 'exact', head: true })
                .eq('class_id', c.id);
            return {
                ...c,
                course_name: c.courses ? c.courses.name : null,
                student_count: count || 0
            };
        }));

        res.status(200).json(enhancedClasses);
    } catch (error) {
        console.error('getTeacherClasses error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

/**
 * TEACHER: Get class details and members
 */
async function getClassDetails(req, res) {
    try {
        const { classId } = req.params;
        const teacher_id = req.user.id;

        // Ensure teacher owns this class
        const { data: classData, error: classErr } = await supabaseAdmin
            .from('classes')
            .select(`
                *,
                courses ( name )
            `)
            .eq('id', classId)
            .eq('teacher_id', teacher_id)
            .single();

        if (classErr || !classData) {
            return res.status(404).json({ error: 'Class not found or unauthorized' });
        }

        // Get members
        const { data: members, error: membersErr } = await supabaseAdmin
            .from('class_members')
            .select(`
                id,
                joined_at,
                profiles ( id, display_name )
            `)
            .eq('class_id', classId)
            .order('joined_at', { ascending: false });

        if (membersErr) throw membersErr;

        res.status(200).json({
            ...classData,
            course_name: classData.courses ? classData.courses.name : null,
            members: members.map(m => ({
                id: m.profiles.id,
                joined_at: m.joined_at,
                name: m.profiles.display_name || 'Student',
                email: 'hidden'
            }))
        });
    } catch (error) {
        console.error('getClassDetails error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

/**
 * STUDENT: Get available classes
 * Fetches all active classes for discovery. 
 * Masks teacher's pure identity relying on profiles.
 */
async function getAvailableClasses(req, res) {
    try {
        const { data: classes, error } = await supabaseAdmin
            .from('classes')
            .select(`
                id, name, section,
                courses ( name ),
                profiles!teacher_id ( display_name )
            `)
            .eq('status', 'active');

        if (error) throw error;

        const safeClasses = classes.map(c => {
            const p = c.profiles || {};
            return {
                id: c.id,
                name: c.name,
                section: c.section,
                course_name: c.courses ? c.courses.name : null,
                teacher_name: p.display_name || 'Instructor'
            };
        });

        res.status(200).json(safeClasses);
    } catch (error) {
        console.error('getAvailableClasses error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

/**
 * STUDENT: Join a class by join code
 */
async function joinClass(req, res) {
    try {
        const { join_code } = req.body;
        const student_id = req.user.id;

        if (!join_code) {
            return res.status(400).json({ error: 'Join code is required' });
        }

        const normalizedCode = normalizeJoinCode(join_code);

        // 1. Find active class by code
        const { data: targetClass, error: findErr } = await supabaseAdmin
            .from('classes')
            .select('id, name, status')
            .eq('join_code', normalizedCode)
            .single();

        if (findErr || !targetClass || targetClass.status !== 'active') {
            return res.status(404).json({ error: 'Class not found' });
        }

        // 2. Check if already joined
        const { data: existingMember } = await supabaseAdmin
            .from('class_members')
            .select('id')
            .eq('class_id', targetClass.id)
            .eq('student_id', student_id)
            .single();

        if (existingMember) {
            return res.status(400).json({ error: "You're already enrolled in this class." });
        }

        // 3. Create membership
        const { error: insertErr } = await supabaseAdmin
            .from('class_members')
            .insert({
                class_id: targetClass.id,
                student_id: student_id
            });

        if (insertErr) {
            console.error('Failed to join:', insertErr);
            return res.status(500).json({ error: 'Failed to join class' });
        }

        res.status(200).json({ message: 'Joined successfully', class_id: targetClass.id, name: targetClass.name });
    } catch (error) {
        console.error('joinClass error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

/**
 * STUDENT: Get all joined classes
 */
async function getStudentClasses(req, res) {
    try {
        const student_id = req.user.id;

        const { data: memberships, error } = await supabaseAdmin
            .from('class_members')
            .select(`
                joined_at,
                classes (
                    id, name, section, status,
                    courses ( name ),
                    profiles!teacher_id ( display_name )
                )
            `)
            .eq('student_id', student_id)
            .order('joined_at', { ascending: false });

        if (error) throw error;

        const safeClasses = memberships.map(m => {
            const c = m.classes || {};
            const p = c.profiles || {};
            return {
                id: c.id,
                name: c.name,
                section: c.section,
                course_name: c.courses ? c.courses.name : null,
                teacher_name: p.display_name || 'Instructor',
                joined_at: m.joined_at,
                status: c.status
            };
        });

        res.status(200).json(safeClasses);
    } catch (error) {
        console.error('getStudentClasses error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

module.exports = {
    createClass,
    getTeacherClasses,
    getClassDetails,
    getAvailableClasses,
    joinClass,
    getStudentClasses
};
