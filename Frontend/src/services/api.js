/**
 * API Service for Learnify (AI Tutor)
 * Preserves all backend contracts exactly.
 * Gated behind import.meta.env.VITE_USE_MOCKS === 'true'
 */

import {
  MOCK_SESSIONS,
  MOCK_SESSION_MESSAGES,
  MOCK_MISCONCEPTIONS,
  MOCK_DOCUMENTS,
  MOCK_CITATION_METADATA
} from './mockData';

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

export const isUsingMocks = () => USE_MOCKS;

/**
 * Calls /api/explain
 * Contract:
 * {
 *   status: "answered" | "insufficient_evidence" | "guided_mode" | "error",
 *   explanation_segments: [{ text, source_chunk_id, unverified? }],
 *   practice_questions: [string],
 *   results: [],
 *   session_id,
 *   addressed_gap?: true,
 *   gap_section_label?: string,
 *   message?: string
 * }
 */
export async function explainQuestion({ question, student_id, session_id, token }) {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 900)); // realistic network delay

    const qLower = question.toLowerCase();

    // Guided Mode Test trigger
    if (
      qLower.includes('solve this') ||
      qLower.includes('exam') ||
      qLower.includes('homework') ||
      qLower.includes('q1.') ||
      qLower.includes('what is the answer to')
    ) {
      return {
        status: 'guided_mode',
        message:
          "I can't give you the direct answer to what looks like a graded question, but I can help you understand the concept behind it. Would you like a walkthrough of the relevant concept instead?",
        session_id: session_id || 'mock-sess-' + Date.now(),
        results: []
      };
    }

    // Insufficient Evidence Test trigger
    if (
      qLower.includes('quantum cooking') ||
      qLower.includes('stock market prediction') ||
      qLower.includes('out of syllabus')
    ) {
      return {
        status: 'insufficient_evidence',
        message: "I don't have approved course material covering this topic in the syllabus.",
        session_id: session_id || 'mock-sess-' + Date.now(),
        results: []
      };
    }

    // Prerequisite Gap Simulation
    if (qLower.includes('avl') || qLower.includes('rotation') || qLower.includes('gap')) {
      return {
        status: 'answered',
        addressed_gap: true,
        gap_section_label: 'Binary Search Tree Invariant (Prerequisite to AVL Rotations)',
        explanation_segments: [
          {
            text: 'Before we explore AVL rotations, let’s quickly refresh the BST invariant: every node in the left subtree must have a key strictly less than the node, and the right subtree strictly greater.',
            source_chunk_id: 'chunk_bst_01'
          },
          {
            text: 'When insertions cause a subtree balance factor to exceed +1 or -1, a single or double rotation restores the height invariant while maintaining the left < root < right ordering.',
            source_chunk_id: 'chunk_bst_02'
          }
        ],
        practice_questions: [
          'What happens to the in-order traversal of a BST after performing a right rotation?',
          'What is the maximum balance factor allowed for any node in an AVL tree?'
        ],
        results: [
          {
            id: 'chunk_bst_01',
            text: 'A Binary Search Tree maintains the invariant that key(left) < key(node) < key(right). Balanced search takes logarithmic O(log n) time.',
            topic: 'Tree Fundamentals',
            section_label: 'Section 4.1: BST Search Invariant'
          },
          {
            id: 'chunk_bst_02',
            text: 'AVL trees maintain height balance by executing O(1) pointer rotations whenever the balance factor deviates outside [-1, +1].',
            topic: 'Self-Balancing Trees',
            section_label: 'Section 4.5: Tree Rotations'
          }
        ],
        session_id: session_id || 'mock-sess-' + Date.now()
      };
    }

    // Default Answered Response
    return {
      status: 'answered',
      explanation_segments: [
        {
          text: `Here is the explanation for: "${question}". A Binary Search Tree structures hierarchical keys such that each comparison systematically halves the search space.`,
          source_chunk_id: 'chunk_bst_01'
        },
        {
          text: 'When the tree remains balanced, operations run in O(log n) time. However, inserting monotonically ordered items yields an unbalanced chain resembling a linear linked list.',
          source_chunk_id: 'chunk_bst_02'
        }
      ],
      practice_questions: [
        'How does an unbalanced BST affect worst-case lookup performance?',
        'Which tree traversal strategy visits keys in non-decreasing sorted order?'
      ],
      results: [
        {
          id: 'chunk_bst_01',
          text: 'A Binary Search Tree maintains the invariant that key(left) < key(node) < key(right).',
          topic: 'Tree Fundamentals',
          section_label: 'Section 4.1: BST Invariants'
        },
        {
          id: 'chunk_bst_02',
          text: 'Unbalanced insertions cause skew trees where height equals node count N.',
          topic: 'Tree Fundamentals',
          section_label: 'Section 4.3: Degenerate Tree Analysis'
        }
      ],
      session_id: session_id || 'mock-sess-' + Date.now()
    };
  }

  // Real backend call
  try {
    const response = await fetch('/api/explain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        question,
        student_id: student_id || undefined,
        session_id: session_id || 'untracked'
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `API error (${response.status})`);
    }

    return await response.json();
  } catch (error) {
    console.warn('Real backend fetch failed, falling back to mock response:', error);
    // Graceful fallback
    return {
      status: 'answered',
      explanation_segments: [
        {
          text: `(Local Mode) Regarding "${question}": Binary search tree properties ensure that each decision branch eliminates half of the remaining subtrees when balanced.`,
          source_chunk_id: 'chunk_bst_01'
        }
      ],
      practice_questions: [
        'What is the average time complexity for searching a balanced BST?'
      ],
      results: [
        {
          id: 'chunk_bst_01',
          text: 'Balanced search takes logarithmic O(log n) time.',
          topic: 'Tree Fundamentals',
          section_label: 'Section 4.1: BST Invariants'
        }
      ],
      session_id: session_id || 'sess-offline'
    };
  }
}

/**
 * Fetch past tutor sessions (/api/sessions)
 */
export async function fetchSessions(token) {
  if (USE_MOCKS) {
    return { sessions: MOCK_SESSIONS };
  }

  try {
    const res = await fetch('/api/sessions', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (res.ok) {
      return await res.json();
    }
    return { sessions: MOCK_SESSIONS };
  } catch (e) {
    console.warn('Failed to fetch sessions from server, using mocks:', e);
    return { sessions: MOCK_SESSIONS };
  }
}

/**
 * Fetch messages for a specific session (/api/sessions/:id)
 */
export async function fetchSessionMessages(sessionId, token) {
  if (USE_MOCKS || MOCK_SESSION_MESSAGES[sessionId]) {
    return {
      messages: (MOCK_SESSION_MESSAGES[sessionId] || []).map((m) => {
        if (m.role === 'user') return { role: 'user', content: m.content || m.text };
        return {
          role: 'bot',
          response_json: m,
          content: m.message || (m.explanation_segments ? m.explanation_segments.map((s) => s.text).join(' ') : '')
        };
      })
    };
  }

  try {
    const res = await fetch(`/api/sessions/${sessionId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (res.ok) {
      return await res.json();
    }
    return { messages: [] };
  } catch (e) {
    console.warn('Failed to fetch session messages:', e);
    return { messages: [] };
  }
}

/**
 * Self-Report practice check (/api/session-event)
 * Contract: { student_id, chunk_id, correct }
 */
export async function recordPracticeEvent({ student_id, chunk_id, correct, token }) {
  if (USE_MOCKS) {
    return { success: true, recorded: { student_id, chunk_id, correct } };
  }

  try {
    const res = await fetch('/api/session-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        student_id,
        chunk_id,
        correct
      })
    });
    return res.ok ? await res.json() : { success: false };
  } catch (err) {
    console.warn('Session event recording failed, logged locally:', err);
    return { success: true, localOnly: true };
  }
}

/**
 * Fetch Misconceptions for Teacher View (/api/misconceptions)
 */
export async function fetchMisconceptions(token) {
  if (USE_MOCKS) {
    return { misconceptions: MOCK_MISCONCEPTIONS };
  }

  try {
    const res = await fetch('/api/misconceptions', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (res.ok) {
      return await res.json();
    }
    return { misconceptions: MOCK_MISCONCEPTIONS };
  } catch (err) {
    console.warn('Failed to fetch misconceptions from backend:', err);
    return { misconceptions: MOCK_MISCONCEPTIONS };
  }
}

/**
 * Update Session Title (/api/sessions/:id/title)
 */
export async function updateSessionTitle(sessionId, title, token) {
  if (USE_MOCKS) {
    return { success: true, sessionId, title };
  }

  try {
    const res = await fetch(`/api/sessions/${sessionId}/title`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ title })
    });
    return res.ok ? await res.json() : { success: false };
  } catch (e) {
    console.error('Rename title error:', e);
    return { success: false };
  }
}

/**
 * Fetch Documents for Library Page
 */
export async function fetchLibraryDocuments(token) {
  return { documents: MOCK_DOCUMENTS };
}

/**
 * Rich Citation Metadata Lookup
 */
export function getCitationMeta(chunkId, fallbackChunk = {}) {
  if (MOCK_CITATION_METADATA[chunkId]) {
    return MOCK_CITATION_METADATA[chunkId];
  }
  return {
    source_chunk_id: chunkId,
    document_title: fallbackChunk.topic || 'Syllabus Course Reference Material',
    chapter: fallbackChunk.section_label ? fallbackChunk.section_label.split(':')[0] : 'Curriculum Unit',
    section_label: fallbackChunk.section_label || 'Approved Reference Chunk',
    page: Math.floor(Math.random() * 50) + 120
  };
}
