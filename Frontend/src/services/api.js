/**
 * API Service for BODH (AI Tutor)
 * Real backend connections mapped to integrate/rag-ingestion backend routes.
 */

export const isUsingMocks = () => false;

export async function explainQuestion({ question, student_id, session_id, token, subject, clarification_context }) {
  const response = await fetch('/api/explain', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ question, student_id, session_id, subject, clarification_context })
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

export async function deleteSession(sessionId, token) {
  const res = await fetch(`/api/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error('Failed to delete session');
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
      subject: c.metadata?.domain || c.name,
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

export async function reviseCourse(courseName, reason, token) {
  const res = await fetch(`/api/courses/${courseName}/revision`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ reason })
  });
  if (!res.ok) throw new Error('Failed to mark course for revision');
  return await res.json();
}

export async function deleteCourse(courseName, token) {
  const res = await fetch(`/api/courses/${courseName}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error('Failed to delete course');
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

export async function getPracticeQuestions(sessionId, token) {
  const url = sessionId ? `/api/practice-questions?session_id=${sessionId}` : '/api/practice-questions';
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error('Failed to fetch practice questions');
  return await res.json();
}

export async function submitPracticeAttempt(practice_question_id, answer, token) {
  const res = await fetch(`/api/practice-attempts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ practice_question_id, answer })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to submit attempt');
  }
  return await res.json();
}

export async function submitSocraticAttempt(id, message, token) {
  const res = await fetch(`/api/practice-questions/${id}/socratic`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ message })
  });
  if (!res.ok) throw new Error('Failed to submit attempt');
  return await res.json();
}

export async function requestPracticeHint(id, token) {
  const res = await fetch(`/api/practice-questions/${id}/hint`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error('Failed to request hint');
  return await res.json();
}

export async function fetchClassAnalytics(subject, token) {
  const url = subject
    ? `/api/analytics/class?subject=${encodeURIComponent(subject)}`
    : '/api/analytics/class';
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error('Failed to fetch class analytics');
  return await res.json();
}

export async function fetchAssignments({ course_name, token } = {}) {
  const url = course_name ? `/api/assignments?course_name=${encodeURIComponent(course_name)}` : '/api/assignments';
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error('Failed to fetch assignments');
  return await res.json();
}

export async function createAssignment(assignmentData, token) {
  const res = await fetch('/api/assignments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(assignmentData)
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to create assignment');
  }
  return await res.json();
}

export async function fetchSubmissions({ course_name, assignment_id, status, token } = {}) {
  const params = new URLSearchParams();
  if (course_name) params.append('course_name', course_name);
  if (assignment_id) params.append('assignment_id', assignment_id);
  if (status) params.append('status', status);

  const queryStr = params.toString();
  const url = queryStr ? `/api/submissions?${queryStr}` : '/api/submissions';

  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error('Failed to fetch submissions');
  return await res.json();
}

export async function fetchSubmissionDetails(submissionId, token) {
  const res = await fetch(`/api/submissions/${submissionId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error('Failed to fetch submission details');
  return await res.json();
}

export async function submitGrade({ submissionId, grade, feedback, token }) {
  const res = await fetch(`/api/submissions/${submissionId}/grade`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ grade, feedback })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to submit grade');
  }
  return await res.json();
}

export async function requestAiGradingSuggestion(submissionId, token) {
  const res = await fetch(`/api/submissions/${submissionId}/ai-suggest`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || errData.details || 'Failed to generate AI grade suggestion');
  }
  return await res.json();
}

export async function fetchGradingStats({ course_name, token } = {}) {
  const url = course_name ? `/api/grading/stats?course_name=${encodeURIComponent(course_name)}` : '/api/grading/stats';
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error('Failed to fetch grading stats');
  return await res.json();
}

export async function submitStudentAssignment({ assignment_id, submission_text, token }) {
  const res = await fetch('/api/submissions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ assignment_id, submission_text })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to submit assignment');
  }
  return await res.json();
}

export async function askTeacherCopilot(message, token) {
  const res = await fetch('/api/teacher-copilot', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ message })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || errData.reply || `API Error (${res.status})`);
  }
  return await res.json();
}


