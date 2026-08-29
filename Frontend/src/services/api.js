/**
 * API Service for BODH (AI Tutor)
 * Real backend connections mapped to integrate/rag-ingestion backend routes.
 */

export const isUsingMocks = () => false;

export async function explainQuestion({ question, student_id, session_id, token, course_name }) {
  const response = await fetch('/api/explain', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ question, student_id, session_id, course: course_name })
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `API error (${response.status})`);
  }
  return await response.json();
}

export async function fetchSessions(token) {
  const res = await fetch('/api/sessions', {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error('Failed to fetch sessions');
  return await res.json();
}

export async function fetchSessionMessages(sessionId, token) {
  const res = await fetch(`/api/sessions/${sessionId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error('Failed to fetch messages');
  return await res.json();
}

export async function createSession(title, course_name, token) {
  const res = await fetch('/api/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ title, course: course_name })
  });
  if (!res.ok) throw new Error('Failed to create session');
  return await res.json();
}

export async function recordPracticeEvent({ student_id, chunk_id, correct, token }) {
  const res = await fetch('/api/session-event', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ student_id, chunk_id, correct })
  });
  if (!res.ok) throw new Error('Failed to record practice event');
  return await res.json();
}

export async function fetchMisconceptions(token) {
  const res = await fetch('/api/misconceptions', {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error('Failed to fetch misconceptions');
  return await res.json();
}

export async function updateSessionTitle(sessionId, title, token) {
  const res = await fetch(`/api/sessions/${sessionId}/title`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ title })
  });
  if (!res.ok) throw new Error('Failed to update title');
  return await res.json();
}

export async function fetchLibraryDocuments(token) {
  const res = await fetch('/api/courses', {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error('Failed to fetch courses');
  const data = await res.json();
  const coursesList = Array.isArray(data.courses) ? data.courses : [];
  return {
    documents: coursesList.map(c => ({
      id: c.name,
      filename: c.pdf || `${c.name}.pdf`,
      subject: c.metadata?.domain || 'Computer Science',
      chapter: c.metadata?.topics?.[0] || 'Learning Module',
      fileType: 'pdf',
      fileSize: 'Uploaded',
      uploadDate: c.audit?.approvedAt ? new Date(c.audit.approvedAt).toLocaleDateString() : 'New',
      uploadedBy: c.audit?.approvedBy || 'Teacher',
      totalChunks: c.chunks ? c.chunks.length || 1 : 1,
      status: c.status
    }))
  };
}

export async function getCourseArtifacts(courseName, token) {
  const res = await fetch(`/api/courses/${courseName}/artifacts`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error('Failed to fetch artifacts');
  return await res.json();
}

export async function uploadCourseDoc(formData, token) {
  const res = await fetch('/api/ingest/upload', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData
  });
  if (!res.ok) throw new Error('Failed to upload course document');
  return await res.json();
}

export async function generatePrerequisites(courseName, token) {
  const res = await fetch('/api/ingest/generate-prerequisites', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ courseName })
  });
  if (!res.ok) throw new Error('Failed to generate prerequisites');
  return await res.json();
}

export async function approveCourse(courseName, token) {
  const res = await fetch(`/api/courses/${courseName}/approve`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error('Failed to approve course');
  return await res.json();
}

export async function publishCourse(courseName, token) {
  const res = await fetch(`/api/courses/${courseName}/publish`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error('Failed to publish course');
  return await res.json();
}

export function getCitationMeta(chunkId, fallbackChunk = {}) {
  return {
    source_chunk_id: chunkId,
    document_title: fallbackChunk.topic || 'Syllabus Course Reference Material',
    chapter: fallbackChunk.section_label ? fallbackChunk.section_label.split(':')[0] : 'Curriculum Unit',
    section_label: fallbackChunk.section_label || 'Approved Reference Chunk',
    page: 1
  };
}
