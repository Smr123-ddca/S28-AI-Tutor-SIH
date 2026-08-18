const { getSessionEvents, getLikelyGaps } = require('./gap.controller');
const { getChunks } = require('../data/store');

function getMisconceptions(req, res) {
    const events = getSessionEvents();
    const chunks = getChunks();
    const chunkStats = {};

    // Group events by chunk_id
    events.forEach(e => {
        if (!chunkStats[e.chunk_id]) {
            chunkStats[e.chunk_id] = {
                chunk_id: e.chunk_id,
                total_attempts: 0,
                incorrect_count: 0,
                failed_students: new Set()
            };
        }
        const stat = chunkStats[e.chunk_id];
        stat.total_attempts += 1;
        if (!e.correct) {
            stat.incorrect_count += 1;
            stat.failed_students.add(e.student_id);
        }
    });

    const results = [];

    // Process chunk stats and calculate rates/gaps
    for (const [chunk_id, stat] of Object.entries(chunkStats)) {
        const incorrect_rate = stat.incorrect_count / stat.total_attempts;

        let most_common_gap = null;

        // If high incorrect rate, detect gaps for failing students
        if (incorrect_rate > 0.4 && stat.failed_students.size > 0) {
            const gapCounts = {};
            for (const student_id of stat.failed_students) {
                const likelyGaps = getLikelyGaps(student_id, chunk_id);
                // Tally up the gaps
                likelyGaps.forEach(gap => {
                    if (!gapCounts[gap.chunk_id]) {
                        gapCounts[gap.chunk_id] = 0;
                    }
                    gapCounts[gap.chunk_id] += 1;
                });
            }

            // Find the gap with highest frequency
            let maxGapId = null;
            let maxCount = 0;
            for (const [gId, count] of Object.entries(gapCounts)) {
                if (count > maxCount) {
                    maxCount = count;
                    maxGapId = gId;
                }
            }

            if (maxGapId) {
                const gapChunkData = chunks.find(c => c.id === maxGapId);
                most_common_gap = {
                    chunk_id: maxGapId,
                    section_label: gapChunkData ? gapChunkData.section_label : "Unknown Concept",
                    frequency: maxCount
                };
            }
        }

        const chunkData = chunks.find(c => c.id === chunk_id);

        results.push({
            chunk_id,
            section_label: chunkData ? chunkData.section_label : "Unknown Concept",
            incorrect_rate,
            total_attempts: stat.total_attempts,
            most_common_gap
        });
    }

    // Sort by incorrect rate descending
    results.sort((a, b) => b.incorrect_rate - a.incorrect_rate);

    return res.json({
        misconceptions: results
    });
}

module.exports = {
    getMisconceptions
};
