const DEMO_NAMES = [
    "Aarav Sharma", "Aditi Mishra", "Aditya Das", "Ananya Patel", "Anika Nair",
    "Arjun Mehta", "Avni Singh", "Ayush Kumar", "Diya Das", "Ishaan Gupta",
    "Isha Nair", "Kavya Reddy", "Karan Singh", "Khushi Sharma", "Krishna Patel",
    "Manav Jain", "Meera Das", "Mihir Kumar", "Nandini Mishra", "Neha Patel",
    "Nikhil Das", "Pooja Sharma", "Pranav Singh", "Priya Nair", "Rahul Kumar",
    "Riya Das", "Rohan Gupta", "Sakshi Mishra", "Samarth Jain", "Sana Khan",
    "Shivam Patel", "Shreya Das", "Sneha Nair", "Tanmay Sharma", "Tanya Gupta",
    "Varun Singh", "Vedika Patel", "Vivek Kumar", "Yash Sharma", "Yashi Das",
    "Aanya Gupta", "Dev Patel", "Harsh Jain", "Ishita Sharma", "Kritika Das",
    "Manya Singh", "Naman Gupta", "Radhika Nair", "Siddharth Kumar", "Simran Patel"
];

/**
 * Returns a stable, deterministic Indian demo name for any given string ID.
 * It uses a simple string hashing algorithm to reliably pick the same name every time.
 */
function getDeterministicDemoName(idStr) {
    if (!idStr) return DEMO_NAMES[0];

    // Simple string hash
    let hash = 0;
    for (let i = 0; i < idStr.length; i++) {
        hash = (hash << 5) - hash + idStr.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }

    const index = Math.abs(hash) % DEMO_NAMES.length;
    return DEMO_NAMES[index];
}

/**
 * Safely resolves the display name for UI rendering.
 * If the user has a real, non-generic display name, it's used.
 * Otherwise (e.g. for demo objects or null names), it hashes the ID and returns a demo name.
 */
function resolveDisplayName(id, currentDisplayName) {
    const isMockOrGeneric = !currentDisplayName ||
        currentDisplayName === 'Student' ||
        currentDisplayName.startsWith('Student ') ||
        currentDisplayName.includes('student_');

    if (isMockOrGeneric) {
        return getDeterministicDemoName(String(id));
    }

    return currentDisplayName;
}

module.exports = {
    DEMO_NAMES,
    getDeterministicDemoName,
    resolveDisplayName
};
