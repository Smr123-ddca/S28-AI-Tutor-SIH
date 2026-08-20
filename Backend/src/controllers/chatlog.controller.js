const chatLogs = [];

function recordChatLog(entry) {
    try {
        const logEntry = {
            student_id: entry.student_id,
            session_id: entry.session_id,
            timestamp: new Date().toISOString(),
            question: entry.question,
            response: entry.response
        };
        chatLogs.push(logEntry);
    } catch (error) {
        console.error("Failed to record chat log externally:", error);
    }
}

function getChatLogs(req, res) {
    let results = chatLogs;

    if (req.query.student_id) {
        results = results.filter(log => log.student_id === req.query.student_id);
    }

    if (req.query.session_id) {
        results = results.filter(log => log.session_id === req.query.session_id);
    }

    return res.json({ logs: results });
}

module.exports = {
    recordChatLog,
    getChatLogs
};
