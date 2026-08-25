const { supabaseAdmin } = require('../lib/supabaseAdmin');
const prerequisites = require('../data/prerequisites.json');
const { getChunks } = require('../data/store');

async function recordSessionEvent(req, res) {
    const { chunk_id, correct } = req.body;
    const student_id = req.user.id;

    if (!student_id || !chunk_id || typeof correct !== 'boolean') {
        return res.status(400).json({ error: "Missing required fields: student_id, chunk_id, correct (boolean)" });
    }

    const { data: event, error } = await supabaseAdmin.from('session_events').insert({
        student_id,
        chunk_id,
        correct
    }).select().single();

    if (error || !event) {
        console.error("Failed to record session event:", error);
        return res.status(500).json({ error: "Database error" });
    }

    return res.json({ success: true, recorded: event });
}

async function getLikelyGaps(student_id, chunk_id) {
    const prereqs = prerequisites[chunk_id] || [];
    if (prereqs.length === 0) return [];

    // Fetch from Supabase instead of sessionEvents array
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

    const chunks = getChunks();
    const enrichedGaps = likely_gaps.map(gap => {
        const chunkMatch = chunks.find(c => c.id === gap.chunk_id);
        return {
            chunk_id: gap.chunk_id,
            section_label: chunkMatch ? chunkMatch.section_label : "Unknown Concept",
            reason: gap.reason
        };
    });

    return enrichedGaps;
}

async function detectGap(req, res) {
    const { chunk_id } = req.body;
    const student_id = req.user.id;

    if (!student_id || !chunk_id) {
        return res.status(400).json({ error: "Missing required fields: student_id, chunk_id" });
    }

    const likely_gaps = await getLikelyGaps(student_id, chunk_id);

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

module.exports = {
    recordSessionEvent,
    detectGap,
    debugGetEvents,
    getLikelyGaps
};
