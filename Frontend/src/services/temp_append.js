const fs = require('fs');
const apiPath = 'c:/Users/HP/OneDrive/Documents/GitHub/S28-AI-Tutor-SIH/Frontend/src/services/api.js';

const code = `
// ==========================================
// CLASS MANAGEMENT (PHASE 3)
// ==========================================
export async function createClass(course_id, name, section, token) {
  const res = await fetch(\`/api/classes\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: \`Bearer \${token}\`
    },
    body: JSON.stringify({ course_id, name, section })
  });
  if (!res.ok) {
     const data = await res.json().catch(() => ({}));
     throw new Error(data.error || 'Failed to create class');
  }
  return await res.json();
}

export async function fetchTeacherClasses(token) {
  const res = await fetch(\`/api/classes\`, {
    headers: { Authorization: \`Bearer \${token}\` }
  });
  if (!res.ok) throw new Error('Failed to load classes');
  return await res.json();
}

export async function fetchClassDetails(classId, token) {
  const res = await fetch(\`/api/classes/\${classId}\`, {
    headers: { Authorization: \`Bearer \${token}\` }
  });
  if (!res.ok) throw new Error('Failed to load class details');
  return await res.json();
}

export async function fetchAvailableClasses(token) {
  const res = await fetch(\`/api/classes/available\`, {
    headers: { Authorization: \`Bearer \${token}\` }
  });
  if (!res.ok) throw new Error('Failed to load available classes');
  return await res.json();
}

export async function fetchStudentClasses(token) {
  const res = await fetch(\`/api/student/classes\`, {
    headers: { Authorization: \`Bearer \${token}\` }
  });
  if (!res.ok) throw new Error('Failed to load your classes');
  return await res.json();
}

export async function joinStudentClass(join_code, token) {
  const res = await fetch(\`/api/classes/join\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: \`Bearer \${token}\`
    },
    body: JSON.stringify({ join_code })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to join class');
  }
  return await res.json();
}
`;

fs.appendFileSync(apiPath, code);
console.log('Appended securely natively!');
