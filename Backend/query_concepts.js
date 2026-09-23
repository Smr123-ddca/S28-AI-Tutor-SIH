const { supabaseAdmin } = require('./src/lib/supabaseAdmin');
const fs = require('fs');

async function getConcepts() {
    const courseIds = [
        "1b7467a6-a44b-40ec-82ac-da02e02e18ac", // Economics
        "d2675f1a-9122-4ded-b2a3-3b431bc4d97d", // DBMS
        "b02c40fe-6563-40a9-acfc-f736a8bebdc2", // IES
        "91bd14ec-9f5f-4370-9591-f7343bdc8ed8"  // DSA
    ];

    // Using a manual promise-based approach because of nested joins
    let output = {};

    for (let cid of courseIds) {
        const { data: cpts } = await supabaseAdmin
            .from('concepts')
            .select('id, concept_alias, course_id')
            .eq('course_id', cid);

        const { data: courseData } = await supabaseAdmin
            .from('courses')
            .select('name')
            .eq('id', cid)
            .single();

        if (courseData && cpts) {
            output[courseData.name] = cpts.map(c => ({ id: c.id, alias: c.concept_alias }));
        }
    }

    fs.writeFileSync('demo_concepts_trace.json', JSON.stringify(output, null, 2));
    process.exit(0);
}
getConcepts();
