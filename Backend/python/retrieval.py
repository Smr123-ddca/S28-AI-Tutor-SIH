import sys
import os
import json
import re


# ============================================================
# WINDOWS UTF-8 OUTPUT
# ============================================================

sys.stdout.reconfigure(
    encoding="utf-8",
    errors="replace"
)

sys.stderr.reconfigure(
    encoding="utf-8",
    errors="replace"
)


# ============================================================
# ARGUMENT VALIDATION
# ============================================================

if len(sys.argv) < 3:

    print(
        json.dumps(
            {
                "status": "error",
                "error": "Usage: python retrieval.py <question> <courseName>"
            },
            ensure_ascii=False
        )
    )

    sys.exit(1)


question = sys.argv[1].strip()
course_name = sys.argv[2].strip()


if not question:

    print(
        json.dumps(
            {
                "status": "error",
                "error": "Empty question provided."
            },
            ensure_ascii=False
        )
    )

    sys.exit(1)


if not course_name:

    print(
        json.dumps(
            {
                "status": "error",
                "error": "Empty course name provided."
            },
            ensure_ascii=False
        )
    )

    sys.exit(1)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        ".."
    )
)

DATA_DIR = os.path.join(
    BASE_DIR,
    "src",
    "data"
)

chunks_path = os.path.join(
    DATA_DIR,
    f"{course_name}_chunks.json"
)

prereq_path = os.path.join(
    DATA_DIR,
    f"{course_name}_prerequisites.json"
)


print(
    "==========================================",
    file=sys.stderr
)

print(
    "🐍 PYTHON RETRIEVAL STARTED",
    file=sys.stderr
)

print(
    f"Question: {question}",
    file=sys.stderr
)

print(
    f"Course: {course_name}",
    file=sys.stderr
)

print(
    f"Chunks path: {chunks_path}",
    file=sys.stderr
)

print(
    f"Prerequisites path: {prereq_path}",
    file=sys.stderr
)


# ============================================================
# CHECK FILES
# ============================================================

if not os.path.exists(chunks_path):

    print(
        json.dumps(
            {
                "status": "error",
                "error":
                    f"Course '{course_name}' chunks file not found: {chunks_path}"
            },
            ensure_ascii=False
        )
    )

    sys.exit(1)


if not os.path.exists(prereq_path):

    print(
        json.dumps(
            {
                "status": "error",
                "error":
                    f"Course '{course_name}' prerequisites file not found: {prereq_path}"
            },
            ensure_ascii=False
        )
    )

    sys.exit(1)


# ============================================================
# LOAD CHUNKS
# ============================================================

try:

    with open(
        chunks_path,
        "r",
        encoding="utf-8"
    ) as f:

        chunks = json.load(f)

except Exception as e:

    print(
        json.dumps(
            {
                "status": "error",
                "error":
                    f"Failed to load chunks: {str(e)}"
            },
            ensure_ascii=False
        )
    )

    sys.exit(1)


if not isinstance(chunks, list):

    print(
        json.dumps(
            {
                "status": "error",
                "error": "Chunks JSON is not an array."
            },
            ensure_ascii=False
        )
    )

    sys.exit(1)


if len(chunks) == 0:

    print(
        json.dumps(
            {
                "status": "error",
                "error": "No chunks found."
            },
            ensure_ascii=False
        )
    )

    sys.exit(1)


print(
    f"Loaded {len(chunks)} chunks.",
    file=sys.stderr
)


# ============================================================
# LOAD PREREQUISITES
# ============================================================

try:

    with open(
        prereq_path,
        "r",
        encoding="utf-8"
    ) as f:

        graph = json.load(f)

except Exception as e:

    print(
        json.dumps(
            {
                "status": "error",
                "error":
                    f"Failed to load prerequisites: {str(e)}"
            },
            ensure_ascii=False
        )
    )

    sys.exit(1)


if not isinstance(graph, dict):

    print(
        json.dumps(
            {
                "status": "error",
                "error": "Prerequisites JSON is not an object."
            },
            ensure_ascii=False
        )
    )

    sys.exit(1)


# ============================================================
# TEXT NORMALIZATION
# ============================================================

def normalize(text):

    if text is None:
        return ""

    text = str(text).lower()

    # Normalize apostrophes
    text = text.replace("’", "'")
    text = text.replace("‘", "'")

    # Replace hyphens with spaces
    text = text.replace("-", " ")

    # Remove punctuation
    text = re.sub(
        r"[^a-z0-9\s]",
        " ",
        text
    )

    # Collapse whitespace
    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text.strip()


# ============================================================
# STOP WORDS
# ============================================================

STOP_WORDS = {
    "what",
    "is",
    "are",
    "was",
    "were",
    "the",
    "a",
    "an",
    "of",
    "in",
    "on",
    "to",
    "for",
    "and",
    "or",
    "who",
    "whom",
    "how",
    "why",
    "does",
    "do",
    "did",
    "can",
    "could",
    "would",
    "should",
    "will",
    "explain",
    "tell",
    "me",
    "about",
    "define",
    "definition",
    "meaning",
    "describe",
    "give",
    "provide",
    "please",
    "according",
    "course",
    "material"
}


# ============================================================
# QUERY WORDS
# ============================================================

def get_query_words(query):

    normalized = normalize(query)

    words = normalized.split()

    return [
        word
        for word in words
        if word not in STOP_WORDS
        and len(word) > 1
    ]


# ============================================================
# BUILD SEARCHABLE FIELDS
# ============================================================

def get_fields(chunk):

    return {
        "topic": normalize(
            chunk.get("topic", "")
        ),

        "chapter": normalize(
            chunk.get("chapter", "")
        ),

        "section": normalize(
            chunk.get("section", "")
        ),

        "section_label": normalize(
            chunk.get("section_label", "")
        ),

        "text": normalize(
            chunk.get("text", "")
        )
    }


# ============================================================
# CHECK WHETHER CHUNK IS MOSTLY METADATA
# ============================================================

def is_metadata_chunk(chunk):

    fields = get_fields(chunk)

    text = fields["text"]

    topic = fields["topic"]
    chapter = fields["chapter"]
    section = fields["section"]
    section_label = fields["section_label"]

    # Very little actual text
    if len(text.split()) < 12:

        return True

    # Common metadata/header patterns
    metadata_patterns = [

        r"^subject\s*:",
        r"^course\s*:",
        r"^course\s*code\s*:",
        r"^title\s*:",
        r"^chapter\s*:",
        r"^unit\s*:",
        r"^module\s*:",
        r"^contents\s*$",
        r"^table of contents$"
    ]

    for pattern in metadata_patterns:

        if re.search(
            pattern,
            text,
            re.IGNORECASE
        ):

            return True

    # If the text is basically identical to the topic/title
    short_text = " ".join(
        text.split()
    )

    title_text = " ".join(
        (
            topic
            + " "
            + chapter
            + " "
            + section
            + " "
            + section_label
        ).split()
    )

    if (
        title_text
        and len(short_text) < 20
        and short_text in title_text
    ):

        return True

    return False


# ============================================================
# DEFINITION DETECTION
# ============================================================

def contains_definition(
    chunk,
    query_words
):

    fields = get_fields(chunk)

    text = fields["text"]

    if not text:
        return False

    # We only care about meaningful query concepts
    if not query_words:
        return False

    # --------------------------------------------------------
    # Definition patterns
    # --------------------------------------------------------

    definition_patterns = [

        r"\bis\s+(a|an|the)\b",

        r"\bare\s+(a|an|the)\b",

        r"\brefers\s+to\b",

        r"\bdefined\s+as\b",

        r"\bmeans\b",

        r"\bcan\s+be\s+defined\s+as\b",

        r"\bis\s+defined\s+as\b",

        r"\bdescribes\b",

        r"\bdeals\s+with\b",

        r"\bstudies\b",

        r"\bfocuses\s+on\b",

        r"\bconcerned\s+with\b"
    ]

    has_definition_pattern = any(
        re.search(
            pattern,
            text
        )
        for pattern in definition_patterns
    )

    if not has_definition_pattern:
        return False

    # At least one query concept should appear
    # reasonably close to the definition
    for word in query_words:

        if re.search(
            rf"\b{re.escape(word)}\b",
            text
        ):

            return True

    return False


# ============================================================
# SCORE CHUNK
# ============================================================

def score_chunk(
    chunk,
    query
):

    fields = get_fields(chunk)

    topic = fields["topic"]
    chapter = fields["chapter"]
    section = fields["section"]
    section_label = fields["section_label"]
    text = fields["text"]

    searchable = " ".join(
        [
            topic,
            chapter,
            section,
            section_label,
            text
        ]
    )

    normalized_query = normalize(query)

    query_words = get_query_words(query)

    score = 0

    # --------------------------------------------------------
    # If there are no meaningful query words, don't retrieve
    # random chunks.
    # --------------------------------------------------------

    if not query_words:

        return 0


    # ========================================================
    # EXACT PHRASE
    # ========================================================

    if (
        normalized_query
        and normalized_query in text
    ):

        score += 35


    elif (
        normalized_query
        and normalized_query in searchable
    ):

        # Phrase only appears in metadata
        score += 8


    # ========================================================
    # QUERY WORD MATCHING
    # ========================================================

    matched_text_words = 0

    matched_metadata_words = 0

    for word in query_words:

        word_pattern = (
            rf"\b{re.escape(word)}\b"
        )

        # ----------------------------------------------------
        # ACTUAL COURSE TEXT
        # ----------------------------------------------------

        if re.search(
            word_pattern,
            text
        ):

            score += 18

            matched_text_words += 1


        # ----------------------------------------------------
        # TOPIC
        # ----------------------------------------------------

        if re.search(
            word_pattern,
            topic
        ):

            score += 6

            matched_metadata_words += 1


        # ----------------------------------------------------
        # SECTION
        # ----------------------------------------------------

        if re.search(
            word_pattern,
            section
        ):

            score += 5

            matched_metadata_words += 1


        # ----------------------------------------------------
        # SECTION LABEL
        # ----------------------------------------------------

        if re.search(
            word_pattern,
            section_label
        ):

            score += 5

            matched_metadata_words += 1


        # ----------------------------------------------------
        # CHAPTER
        # ----------------------------------------------------

        if re.search(
            word_pattern,
            chapter
        ):

            score += 3

            matched_metadata_words += 1


    # ========================================================
    # MULTIPLE QUERY WORDS
    # ========================================================

    if (
        len(query_words) > 1
        and matched_text_words == len(query_words)
    ):

        score += 20


    # ========================================================
    # DEFINITION BONUS
    # ========================================================

    if contains_definition(
        chunk,
        query_words
    ):

        print(
            f"  📖 Definition detected in {chunk.get('id')}",
            file=sys.stderr
        )

        score += 40


    # ========================================================
    # METADATA PENALTY
    # ========================================================

    if is_metadata_chunk(chunk):

        score -= 25


    # ========================================================
    # VERY STRONG PENALTY:
    #
    # If the query only matches metadata and NOT actual text,
    # don't allow a title/header chunk to dominate.
    # ========================================================

    if (
        matched_text_words == 0
        and matched_metadata_words > 0
    ):

        score -= 20


    # ========================================================
    # ACTUAL TEXT LENGTH BONUS
    #
    # Give a small advantage to meaningful explanatory chunks,
    # but don't let huge chunks dominate.
    # ========================================================

    text_word_count = len(
        text.split()
    )

    if text_word_count >= 20:

        score += 3

    if text_word_count >= 50:

        score += 3

    if text_word_count >= 100:

        score += 2


    return max(
        score,
        0
    )


# ============================================================
# FIND RELEVANT CHUNKS
# ============================================================

def find_relevant_chunks(
    query,
    max_chunks=3
):

    scored = []

    for chunk in chunks:

        if not isinstance(
            chunk,
            dict
        ):

            continue

        score = score_chunk(
            chunk,
            query
        )

        if score > 0:

            scored.append(
                (
                    score,
                    chunk
                )
            )


    if not scored:

        return []


    # Highest score first
    scored.sort(
        key=lambda item: item[0],
        reverse=True
    )


    print(
        "Top retrieval results:",
        file=sys.stderr
    )

    for score, chunk in scored[:10]:

        print(
            f"  {chunk.get('id')} -> {score}",
            file=sys.stderr
        )

        print(
            f"      topic: {chunk.get('topic', '')}",
            file=sys.stderr
        )

        print(
            f"      section: {chunk.get('section', '')}",
            file=sys.stderr
        )


    # --------------------------------------------------------
    # Determine whether the best result is actually useful
    # --------------------------------------------------------

    best_score = scored[0][0]

    best_chunk = scored[0][1]

    best_fields = get_fields(
        best_chunk
    )

    best_text = best_fields["text"]

    query_words = get_query_words(
        query
    )


    # --------------------------------------------------------
    # Check whether actual course text contains the concept
    # --------------------------------------------------------

    text_matches = 0

    for word in query_words:

        if re.search(
            rf"\b{re.escape(word)}\b",
            best_text
        ):

            text_matches += 1


    # --------------------------------------------------------
    # If the best result is only a weak metadata match,
    # consider the question outside the approved material.
    # --------------------------------------------------------

    if (
        best_score < 15
        and text_matches == 0
    ):

        print(
            "🚫 Best match is too weak and only appears in metadata.",
            file=sys.stderr
        )

        return []


    # --------------------------------------------------------
    # Select useful results
    #
    # Don't blindly take 3 unrelated chunks.
    # A chunk must have a reasonable relationship to the
    # highest-scoring chunk.
    # --------------------------------------------------------

    selected = []

    for score, chunk in scored:

        if len(selected) >= max_chunks:

            break


        # First result is always selected
        if not selected:

            selected.append(
                chunk
            )

            continue


        # Only include reasonably relevant chunks
        if score >= best_score * 0.35:

            selected.append(
                chunk
            )


    return selected


# ============================================================
# RECURSIVE PREREQUISITES
# ============================================================

def get_prerequisites(
    chunk_id,
    visited=None
):

    if visited is None:

        visited = set()


    if chunk_id in visited:

        return []


    visited.add(
        chunk_id
    )


    prereqs = graph.get(
        chunk_id,
        []
    )


    if not isinstance(
        prereqs,
        list
    ):

        return []


    result = []


    for prereq in prereqs:

        if prereq not in visited:

            result.append(
                prereq
            )

            result.extend(
                get_prerequisites(
                    prereq,
                    visited
                )
            )


    # --------------------------------------------------------
    # Remove duplicates while preserving order
    # --------------------------------------------------------

    unique = []

    seen = set()

    for item in result:

        if item not in seen:

            unique.append(
                item
            )

            seen.add(
                item
            )


    return unique


# ============================================================
# FIND CHUNK BY ID
# ============================================================

def get_chunk_by_id(
    chunk_id
):

    for chunk in chunks:

        if (
            isinstance(chunk, dict)
            and chunk.get("id") == chunk_id
        ):

            return chunk

    return None


# ============================================================
# BUILD CONTEXT
# ============================================================

def build_context(
    query
):

    # --------------------------------------------------------
    # Find multiple relevant chunks
    # --------------------------------------------------------

    relevant_chunks = find_relevant_chunks(
        query,
        max_chunks=3
    )


    # --------------------------------------------------------
    # OUTSIDE APPROVED MATERIAL
    # --------------------------------------------------------

    if not relevant_chunks:

        print(
            "🚫 No matching approved course chunk found.",
            file=sys.stderr
        )

        return {
            "status": "course_not_approved",

            "answer_context": [],

            "learning_path": []
        }


    print(
        "✅ Relevant chunks found:",
        [
            chunk.get("id")
            for chunk in relevant_chunks
        ],
        file=sys.stderr
    )


    # --------------------------------------------------------
    # Main chunk = strongest match
    # --------------------------------------------------------

    main = relevant_chunks[0]


    print(
        f"✅ Main chunk: {main.get('id')}",
        file=sys.stderr
    )


    # --------------------------------------------------------
    # Collect prerequisites for all relevant chunks
    # --------------------------------------------------------

    prerequisite_ids = []

    for chunk in relevant_chunks:

        chunk_id = chunk.get(
            "id"
        )

        if not chunk_id:

            continue

        prereq_ids = get_prerequisites(
            chunk_id
        )

        for prereq_id in prereq_ids:

            if prereq_id not in prerequisite_ids:

                prerequisite_ids.append(
                    prereq_id
                )


    # --------------------------------------------------------
    # Build answer context
    # --------------------------------------------------------

    answer_context = []

    learning_path = []


    # --------------------------------------------------------
    # Add prerequisites FIRST
    # --------------------------------------------------------

    for prereq_id in prerequisite_ids:

        chunk = get_chunk_by_id(
            prereq_id
        )

        if not chunk:

            continue


        # Don't duplicate a relevant chunk
        if any(
            existing.get("id") == chunk.get("id")
            for existing in answer_context
        ):

            continue


        answer_context.append(
            chunk
        )

        learning_path.append(
            chunk.get("section")
            or chunk.get("section_label")
            or chunk.get("chapter")
            or "Prerequisite"
        )


    # --------------------------------------------------------
    # Add relevant chunks
    # --------------------------------------------------------

    for chunk in relevant_chunks:

        if any(
            existing.get("id") == chunk.get("id")
            for existing in answer_context
        ):

            continue


        answer_context.append(
            chunk
        )

        learning_path.append(
            chunk.get("section")
            or chunk.get("section_label")
            or chunk.get("chapter")
            or "Relevant Concept"
        )


    # --------------------------------------------------------
    # SAFETY:
    #
    # We must have actual context.
    # --------------------------------------------------------

    if not answer_context:

        print(
            "🚫 No usable approved course context.",
            file=sys.stderr
        )

        return {
            "status": "course_not_approved",

            "answer_context": [],

            "learning_path": []
        }


    # --------------------------------------------------------
    # FINAL RESULT
    # --------------------------------------------------------

    print(
        f"✅ Final context contains {len(answer_context)} chunks.",
        file=sys.stderr
    )


    return {
        "status": "success",

        "answer_context": answer_context,

        "learning_path": learning_path
    }


# ============================================================
# MAIN
# ============================================================

try:

    output = build_context(
        question
    )


    print(
        json.dumps(
            output,
            ensure_ascii=False
        )
    )


except Exception as e:

    print(
        json.dumps(
            {
                "status": "error",

                "error":
                    f"Unexpected retrieval error: {repr(e)}"
            },
            ensure_ascii=False
        )
    )

    sys.exit(1)