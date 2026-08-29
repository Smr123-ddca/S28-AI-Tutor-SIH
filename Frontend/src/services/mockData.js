/**
 * Mock Data Store for BODH / Study-app
 * All mock data is gated behind import.meta.env.VITE_USE_MOCKS === 'true'
 */

export const MOCK_STUDENT = {
  id: 'mock-student-uuid-101',
  email: 'alex.rivers@study.edu',
  name: 'Alex Rivers',
  handle: '@alex_learns',
  role: 'student',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  stats: {
    topicsCompleted: 18,
    totalTopics: 24,
    studyHoursThisWeek: 14.5,
    learningStreakDays: 6,
    masteryScore: 84
  }
};

export const MOCK_TEACHER = {
  id: 'mock-teacher-uuid-202',
  email: 'prof.sharma@study.edu',
  name: 'Prof. Ananya Sharma',
  handle: '@prof_sharma',
  role: 'teacher',
  avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  department: 'Computer Science & AI',
  totalStudents: 48,
  activeInterventions: 3
};

export const MOCK_ANNOUNCEMENTS = [
  {
    id: 'ann-1',
    title: 'Midterm Syllabus Review Updated',
    content: 'Prof. Sharma uploaded new practice sets for Binary Search Trees and Graph Traversals in the Library.',
    category: 'Computer Science',
    categoryColor: 'purple',
    date: 'Today, 9:30 AM',
    urgent: true
  },
  {
    id: 'ann-2',
    title: 'AI Tutor Gap Detection Active',
    content: 'The tutor now automatically surfaces prerequisite refreshers when you encounter complex concepts.',
    category: 'System Update',
    categoryColor: 'orange',
    date: 'Yesterday'
  },
  {
    id: 'ann-3',
    title: 'Weekly Knowledge Checkpoint Open',
    content: 'Complete your 5-minute self-assessment before Friday 6 PM to keep your study streak alive.',
    category: 'Assessments',
    categoryColor: 'yellow',
    date: '2 days ago'
  }
];

export const MOCK_TASKS = [
  {
    id: 'task-1',
    title: 'Complete Binary Search Tree Quiz',
    course: 'Data Structures & Algorithms',
    dueDate: 'Tomorrow, 11:59 PM',
    status: 'in_progress', // 'not_started' | 'in_progress' | 'done'
    category: 'Computer Science',
    categoryColor: 'purple'
  },
  {
    id: 'task-2',
    title: 'Read Chapter 4: Calculus Prerequisite Review',
    course: 'Advanced Mathematics II',
    dueDate: 'Aug 26, 2026',
    status: 'not_started',
    category: 'Mathematics',
    categoryColor: 'yellow'
  },
  {
    id: 'task-3',
    title: 'Submit Operating Systems Memory Paging Report',
    course: 'Systems Architecture',
    dueDate: 'Aug 28, 2026',
    status: 'done',
    category: 'Computer Science',
    categoryColor: 'purple'
  }
];

export const MOCK_COURSES = [
  {
    id: 'course-1',
    category: 'Computer Science',
    categoryColor: 'purple',
    title: 'Data Structures & Algorithmic Analysis',
    progressCurrent: 14,
    progressTotal: 20,
    unit: 'lessons',
    participantAvatars: [
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'
    ],
    participantExtraCount: 142,
    lastTopic: 'Binary Search Trees & Rebalancing'
  },
  {
    id: 'course-2',
    category: 'Mathematics',
    categoryColor: 'yellow',
    title: 'Linear Algebra & Matrix Transformations',
    progressCurrent: 8,
    progressTotal: 15,
    unit: 'lessons',
    participantAvatars: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80'
    ],
    participantExtraCount: 98,
    lastTopic: 'Eigenvalues and Eigenvectors'
  },
  {
    id: 'course-3',
    category: 'Physics',
    categoryColor: 'sky',
    title: 'Electromagnetism & Wave Mechanics',
    progressCurrent: 12,
    progressTotal: 18,
    unit: 'lessons',
    participantAvatars: [
      'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80'
    ],
    participantExtraCount: 64,
    lastTopic: 'Maxwell Equations & Boundary Conditions'
  }
];

export const MOCK_NEXT_LESSONS = [
  {
    id: 'nl-1',
    lessonNumber: '08',
    title: 'Binary Search Trees: Rotations & AVL Balancing',
    courseName: 'Data Structures & Algorithmic Analysis',
    teacher: 'Prof. Ananya Sharma',
    teacherAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
    duration: '45 mins'
  },
  {
    id: 'nl-2',
    lessonNumber: '05',
    title: 'Diagonalization of Symmetric Matrices',
    courseName: 'Linear Algebra & Matrix Transformations',
    teacher: 'Dr. Marcus Vance',
    teacherAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    duration: '35 mins'
  },
  {
    id: 'nl-3',
    lessonNumber: '11',
    title: 'Poynting Vectors and Energy Transport',
    courseName: 'Electromagnetism & Wave Mechanics',
    teacher: 'Dr. Clara Thorne',
    teacherAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80',
    duration: '50 mins'
  }
];

export const MOCK_SESSIONS = [
  {
    id: 'sess-101',
    title: 'Binary Search Tree Insertion vs Search Complexity',
    created_at: '2026-08-22T14:30:00Z',
    messages_count: 6,
    topic: 'Trees & Graphs'
  },
  {
    id: 'sess-102',
    title: 'Prerequisite Gap: Recursion Stack Unwinding',
    created_at: '2026-08-21T18:15:00Z',
    messages_count: 4,
    topic: 'Recursion Fundamentals'
  },
  {
    id: 'sess-103',
    title: 'QuickSort Partitioning In-Place Mechanics',
    created_at: '2026-08-20T10:00:00Z',
    messages_count: 8,
    topic: 'Sorting Algorithms'
  }
];

export const MOCK_SESSION_MESSAGES = {
  'sess-101': [
    {
      role: 'user',
      content: 'Can you explain why binary search tree search is O(log n) on average but O(n) in worst case?'
    },
    {
      role: 'bot',
      status: 'answered',
      explanation_segments: [
        {
          text: 'In a balanced Binary Search Tree (BST), each comparison halves the remaining search space because every left child is smaller and every right child is larger than the parent node.',
          source_chunk_id: 'chunk_bst_01'
        },
        {
          text: 'However, if elements are inserted in already-sorted order without balancing, the tree degenerates into a linked list of height n, making worst-case search linear O(n).',
          source_chunk_id: 'chunk_bst_02'
        }
      ],
      practice_questions: [
        'What self-balancing BST variant prevents worst-case O(n) degeneracy by performing rotations?',
        'If you insert [1, 2, 3, 4, 5] sequentially into an unaugmented BST, what is the search complexity for 5?'
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
          text: 'Unbalanced insertions cause skew trees where height equals node count N. Worst-case lookup requires visiting all N nodes.',
          topic: 'Tree Fundamentals',
          section_label: 'Section 4.3: Degenerate Tree Analysis'
        }
      ],
      session_id: 'sess-101'
    }
  ]
};

/**
 * Task E: Fuller Rich Citation Reference Mock
 * Note: Backend schema currently guarantees source_chunk_id.
 * This fuller shape is used to present rich document metadata.
 */
export const MOCK_CITATION_METADATA = {
  'chunk_bst_01': {
    source_chunk_id: 'chunk_bst_01',
    document_title: 'Introduction to Algorithms (CLRS)',
    chapter: 'Chapter 12: Binary Search Trees',
    section_label: 'Section 12.2: Querying a Binary Search Tree',
    page: 289
  },
  'chunk_bst_02': {
    source_chunk_id: 'chunk_bst_02',
    document_title: 'Introduction to Algorithms (CLRS)',
    chapter: 'Chapter 12: Binary Search Trees',
    section_label: 'Section 12.3: Insertion and Deletion',
    page: 294
  },
  'chunk_rec_01': {
    source_chunk_id: 'chunk_rec_01',
    document_title: 'Computer Systems: A Programmer\'s Perspective',
    chapter: 'Chapter 3: Machine-Level Representation',
    section_label: 'Section 3.7: Runtime Call Stack & Frames',
    page: 242
  }
};

/**
 * Task C: Document Library Mock (matching ingest.controller.js structure)
 */
export const MOCK_DOCUMENTS = [
  {
    id: 'doc-1',
    filename: 'Algorithms_Core_BST_Notes.pdf',
    subject: 'Computer Science',
    chapter: 'Trees & Graphs',
    fileSize: '4.8 MB',
    fileType: 'pdf',
    uploadDate: '2026-08-18',
    uploadedBy: 'Prof. Ananya Sharma',
    totalChunks: 36
  },
  {
    id: 'doc-2',
    filename: 'Linear_Algebra_Transformations_Slides.pptx',
    subject: 'Mathematics',
    chapter: 'Matrices & Spaces',
    fileSize: '12.4 MB',
    fileType: 'pptx',
    uploadDate: '2026-08-14',
    uploadedBy: 'Dr. Marcus Vance',
    totalChunks: 52
  },
  {
    id: 'doc-3',
    filename: 'Operating_Systems_Virtual_Memory.pdf',
    subject: 'Computer Science',
    chapter: 'Memory Management',
    fileSize: '8.2 MB',
    fileType: 'pdf',
    uploadDate: '2026-08-10',
    uploadedBy: 'Prof. Ananya Sharma',
    totalChunks: 44
  },
  {
    id: 'doc-4',
    filename: 'Electromagnetism_Wave_Equations.pdf',
    subject: 'Physics',
    chapter: 'Maxwell Equations',
    fileSize: '6.1 MB',
    fileType: 'pdf',
    uploadDate: '2026-08-05',
    uploadedBy: 'Dr. Clara Thorne',
    totalChunks: 28
  }
];

/**
 * Task D: Teacher Dashboard Extended Data
 */
export const MOCK_MISCONCEPTIONS = [
  {
    chunk_id: 'chunk_rec_01',
    section_label: 'Call Stack Frame Allocation in Recursive Unwinding',
    incorrect_rate: 0.58,
    total_attempts: 42,
    most_common_gap: {
      chunk_id: 'chunk_mem_03',
      section_label: 'Stack Pointer vs Base Pointer Offsets',
      frequency: 19
    }
  },
  {
    chunk_id: 'chunk_bst_02',
    section_label: 'Degenerate Tree Worst-Case Search Complexity',
    incorrect_rate: 0.46,
    total_attempts: 37,
    most_common_gap: {
      chunk_id: 'chunk_bst_01',
      section_label: 'BST Invariant Properties',
      frequency: 14
    }
  },
  {
    chunk_id: 'chunk_mat_04',
    section_label: 'Eigenbasis Diagonalization Conditions',
    incorrect_rate: 0.32,
    total_attempts: 25,
    most_common_gap: null
  },
  {
    chunk_id: 'chunk_phy_02',
    section_label: 'Poynting Flux Integration across Surfaces',
    incorrect_rate: 0.28,
    total_attempts: 31,
    most_common_gap: null
  }
];

export const MOCK_CONCEPT_MASTERY = [
  { module: 'Recursion & Stack Frames', masteryPct: 42, studentCount: 48, status: 'critical' },
  { module: 'Binary Search Trees', masteryPct: 54, studentCount: 48, status: 'warning' },
  { module: 'Asymptotic Analysis (Big-O)', masteryPct: 88, studentCount: 48, status: 'good' },
  { module: 'Hash Tables & Collisions', masteryPct: 79, studentCount: 48, status: 'good' },
  { module: 'Graph Search (BFS / DFS)', masteryPct: 68, studentCount: 48, status: 'warning' }
];

export const MOCK_STUDENT_GAPS = [
  {
    studentName: 'Maya Patel',
    email: 'maya.p@study.edu',
    failingConcepts: ['Recursion Call Stack', 'BST Tree Rotations'],
    lastActive: '2 hours ago',
    riskLevel: 'High'
  },
  {
    studentName: 'Leo Zhang',
    email: 'leo.z@study.edu',
    failingConcepts: ['Recursion Call Stack'],
    lastActive: 'Yesterday',
    riskLevel: 'Medium'
  },
  {
    studentName: 'Sophia Martinez',
    email: 'sophia.m@study.edu',
    failingConcepts: ['Degenerate Tree Height', 'AVL Balancing'],
    lastActive: '3 hours ago',
    riskLevel: 'Medium'
  },
  {
    studentName: 'Daniel Kim',
    email: 'daniel.k@study.edu',
    failingConcepts: ['Base Pointer Offsets'],
    lastActive: '1 day ago',
    riskLevel: 'Low'
  }
];

export const MOCK_INTERVENTIONS = [
  {
    id: 'int-1',
    topic: 'Recursion Call Stack Visual Walkthrough',
    recommendation: '58% of the class fails questions requiring stack frame unwinding mental models. Host a 15-minute live debugger trace session before the quiz.',
    targetStudents: 28,
    priority: 'Urgent'
  },
  {
    id: 'int-2',
    topic: 'BST Worst-Case Degeneracy Practice Set',
    recommendation: 'Assign 3 interactive tree-building exercises showing sorted input degeneration into linked lists.',
    targetStudents: 22,
    priority: 'Recommended'
  }
];

/**
 * Task B: Practice Test with Escalating Hints
 * 
 * [BACKEND-DEPENDENT FLAG]:
 * The current backend only returns plain practice_questions strings with no hint data or answer-checking.
 * The UI interaction pattern below simulates progressive hint escalation (General concept -> Narrowed clue -> Step-by-step guidance -> Concept summary).
 * Actual production use requires a new backend endpoint (e.g. POST /api/practice-hint or a structured Gemini prompt)
 * to evaluate the student's partial response and escalate clues dynamically without revealing the direct solution.
 */
export const MOCK_PRACTICE_QUESTIONS_FLOW = [
  {
    id: 'pq-flow-1',
    question: 'In a Binary Search Tree with N nodes, what is the maximum number of comparisons needed to find a node in the worst-case scenario?',
    correctAnswerKeyword: 'n',
    hints: [
      'Think about the shape of the tree if elements were inserted in sorted ascending order (e.g., 1, 2, 3, 4...).',
      'When every node has only a single right child, what classic linear data structure does the BST resemble?',
      'In a degenerate BST of height N, you must traverse all levels from root to leaf, so the number of comparisons is proportional to...'
    ],
    conceptRecap: 'In the worst case (a degenerate/skewed tree), the tree height is N, meaning search takes O(N) comparisons.'
  },
  {
    id: 'pq-flow-2',
    question: 'When a function calls itself recursively, where does the computer allocate the local variables and return address for each call instance?',
    correctAnswerKeyword: 'stack',
    hints: [
      'Consider the memory segment dedicated to dynamic function execution contexts (LIFO order).',
      'Each call pushes a new "activation record" or "frame" onto this segment.',
      'It is called the Call _______ (opposed to the Heap for dynamic malloc allocations).'
    ],
    conceptRecap: 'Each recursive invocation pushes a distinct activation record (stack frame) onto the Call Stack.'
  }
];
