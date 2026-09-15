const path = require('path');
const { supabaseAdmin } = require('../lib/supabaseAdmin');

async function recordSessionEvent(req, res) {
    const { chunk_id, correct } = req.body;
    const student_id = req.user?.id;

    if (!student_id || !chunk_id || typeof correct !== 'boolean') {
        return res.status(400).json({ error: "Missing required fields: student_id, chunk_id, correct (boolean)" });
    }

    const { data: event, error } = await supabaseAdmin.from('session_events').insert({
        student_id,
        chunk_id, // we retain string chunk_id for backwards compat tables
        correct
    }).select().single();

    if (error || !event) {
        console.error("Failed to record session event:", error);
        return res.status(500).json({ error: "Database error" });
    }

    return res.json({ success: true, recorded: event });
}

async function getLikelyGaps(student_id, target_chunk_alias, courseName) {
    if (!courseName) return [];

    // Lookup course ID
    const { data: course } = await supabaseAdmin.from('courses').select('id').eq('name', courseName).single();
    if (!course) return [];

    // Find prerequisites where target concept matches target_chunk_alias
    const { data: prereqsData } = await supabaseAdmin
        .from('prerequisite_relationships')
        .select(`target:target_concept_id(concept_alias), prereq:prerequisite_concept_id(concept_alias)`)
        .eq('course_id', course.id);

    const prereqs = (prereqsData || [])
        .filter(p => p.target?.concept_alias === target_chunk_alias)
        .map(p => p.prereq?.concept_alias)
        .filter(Boolean);

    if (prereqs.length === 0) return [];

    // Fetch student history from Supabase
    const { data: studentHistory, error } = await supabaseAdmin
        .from('session_events')
        .select('chunk_id, correct, created_at')
        .eq('student_id', student_id)
        .in('chunk_id', prereqs)
        .order('created_at', { ascending: true }); // chronological order

    if (error) {
        console.error("Failed to fetch session events:", error);
        return [];
    }

    const likely_gaps = [];

    for (const prereq_id of prereqs) {
        const eventsForPrereq = studentHistory.filter(e => e.chunk_id === prereq_id);

        if (eventsForPrereq.length === 0) {
            likely_gaps.push({ chunk_id: prereq_id, reason: "no evidence of mastery" });
            continue;
        }

        const mostRecentEvent = eventsForPrereq[eventsForPrereq.length - 1];
        const hasCorrectEvent = eventsForPrereq.some(e => e.correct === true);

        if (!mostRecentEvent.correct) {
            likely_gaps.push({ chunk_id: prereq_id, reason: "recent incorrect answer" });
        } else if (!hasCorrectEvent) {
            likely_gaps.push({ chunk_id: prereq_id, reason: "no evidence of mastery" });
        }
    }

    if (likely_gaps.length === 0) return [];

    // Enqueue chunks matching gaps to provide section labels
    const gapAliases = likely_gaps.map(g => g.chunk_id);
    const { data: gapChunksData } = await supabaseAdmin
        .from('chunks')
        .select('chunk_alias, section')
        .eq('course_id', course.id)
        .in('chunk_alias', gapAliases);

    const enrichedGaps = likely_gaps.map(gap => {
        const chunkMatch = (gapChunksData || []).find(c => c.chunk_alias === gap.chunk_id);
        return {
            chunk_id: gap.chunk_id,
            section_label: chunkMatch ? (chunkMatch.section || "Unknown Concept") : "Unknown Concept",
            reason: gap.reason
        };
    });

    return enrichedGaps;
}

async function detectGap(req, res) {
    const { chunk_id, course } = req.body;
    const student_id = req.user?.id;

    if (!student_id || !chunk_id) {
        return res.status(400).json({ error: "Missing required fields: student_id, chunk_id" });
    }

    const likely_gaps = await getLikelyGaps(student_id, chunk_id, course);

    return res.json({
        target_chunk_id: chunk_id,
        likely_gaps
    });
}

async function debugGetEvents(req, res) {
    const student_id = req.user.id;
    const { data: events, error } = await supabaseAdmin
        .from('session_events')
        .select('*')
        .eq('student_id', student_id);

    res.json({ events: events || [] });
}

async function getAllSessionEvents() {
    const { data: events, error } = await supabaseAdmin
        .from('session_events')
        .select('*');
    return { data: events || [], error };
}

module.exports = {
    recordSessionEvent,
    detectGap,
    debugGetEvents,
    getLikelyGaps,
    getAllSessionEvents
};
