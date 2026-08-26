// ─── Unicode Normalization Maps ───────────────────────────────────────────────
const UNICODE_REPLACEMENTS = {
    // Apostrophe variants → straight apostrophe
    '\u2019': "'", '\u2018': "'", '\u201B': "'", '\u02BC': "'", '\u02BB': "'",
    '\uFF07': "'", '\u0060': "'", '\u00B4': "'",
    // Quotation mark variants → straight double quote
    '\u201C': '"', '\u201D': '"', '\u201E': '"', '\u201F': '"',
    '\u00AB': '"', '\u00BB': '"',
    // Dash variants → hyphen
    '\u2013': '-', '\u2014': '-', '\u2015': '-', '\u2212': '-',
    // Whitespace variants → space
    '\u00A0': ' ', '\u2000': ' ', '\u2001': ' ', '\u2002': ' ',
    '\u2003': ' ', '\u2004': ' ', '\u2005': ' ', '\u2006': ' ',
    '\u2007': ' ', '\u2008': ' ', '\u2009': ' ', '\u200A': ' ',
    '\u202F': ' ', '\u205F': ' ', '\u3000': ' ',
    // Zero-width characters → remove
    '\u200B': '', '\u200C': '', '\u200D': '', '\uFEFF': ''
};

const UNICODE_REGEX = new RegExp(
    '[' + Object.keys(UNICODE_REPLACEMENTS).join('') + ']', 'g'
);

// ─── Stopwords ────────────────────────────────────────────────────────────────
const STOP_WORDS = new Set([
    // Determiners / articles
    "a", "an", "the",
    // Conjunctions / prepositions
    "and", "are", "as", "at", "be", "but", "by", "for", "if",
    "in", "into", "is", "it", "no", "not", "of", "on", "or",
    "such", "that", "their", "then", "there", "these", "they",
    "this", "to", "was", "will", "with", "which", "who",
    // Question words — useful for query analysis but not for TF-IDF retrieval
    "what", "why", "how", "when", "where",
    // Academic filler
    "does", "do", "s", "subject", "syllabus",
    "please", "can", "you", "me", "tell", "about",
    "i", "my", "your", "we", "our", "us", "its",
    "would", "could", "should", "have", "has", "had",
    "been", "being", "am", "were",
    // Ultra-common instructional verbs that don't help retrieval
    "explain", "describe", "show", "give", "list", "summarize", "elaborate",
    "clarify", "discuss", "explore", "help", "understand", "provide", "share",
    "mean", "meaning", "define",
    // Academic request modifiers
    "summary", "complete", "overview", "detail", "details", "all", "brief",
    "detailed", "exactly", "simply", "simple", "example", "examples",
    "definition", "information", "info", "answer", "question",
    // Ultra-common verbs that rarely help retrieval
    "get", "got", "go", "going", "let", "know", "think",
    "want", "need", "like", "just", "also", "so", "very",
    "really", "some", "any", "more", "much", "many", "most"
]);

// ─── Morphological Stemming ──────────────────────────────────────────────────
// Words that must NEVER be stemmed (would produce wrong base form)
const STEM_EXCEPTIONS = new Set([
    // Words ending in 's' that are NOT plurals
    "class", "glass", "grass", "mass", "pass", "gas", "bus",
    "lens", "axis", "basis", "thesis", "analysis", "synthesis",
    "hypothesis", "diagnosis", "emphasis", "crisis", "parenthesis",
    "this", "is", "his", "as", "was", "has", "yes", "no",
    "plus", "minus", "versus", "radius", "focus", "locus",
    "status", "apparatus", "stimulus", "nucleus", "syllabus",
    "calculus", "campus", "corpus", "census", "bonus", "virus",
    "conscious", "previous", "obvious", "serious", "curious",
    "nervous", "famous", "various", "continuous", "enormous",
    // Words ending in 'ss'
    "process", "progress", "success", "access", "address",
    "express", "compress", "impress", "possess", "assess",
    "stress", "less", "cross", "loss", "boss", "moss",
    // Scientific terms
    "physics", "mathematics", "dynamics", "mechanics", "statics",
    "kinetics", "optics", "electronics", "genetics", "robotics",
    "thermodynamics", "electrodynamics", "aerodynamics",
    "economics", "politics", "statistics", "linguistics",
    // Common words where removing 's' damages meaning
    "always", "perhaps", "towards", "besides", "whereas",
    "species", "series", "means"
]);

/**
 * Safe morphological stemmer for retrieval.
 * Conservative: only handles clear English plurals.
 * @param {string} word - lowercase token
 * @returns {string} stemmed token
 */
function safeStem(word) {
    if (word.length <= 3) return word;
    if (STEM_EXCEPTIONS.has(word)) return word;

    // -ies → -y (e.g. "velocities" → "velocity", "odies" → "ody" — acceptable)
    if (word.endsWith('ies') && word.length > 4) {
        return word.slice(0, -3) + 'y';
    }

    // -ses, -xes, -zes, -ches, -shes → remove -es
    if (word.endsWith('ses') || word.endsWith('xes') || word.endsWith('zes')) {
        return word.slice(0, -2);
    }
    if (word.endsWith('ches') || word.endsWith('shes')) {
        return word.slice(0, -2);
    }

    // -es after consonant (but not -ss, -us, -is patterns already caught)
    // e.g. "forces" → "force", "masses" already in exceptions
    if (word.endsWith('es') && word.length > 4) {
        const beforeEs = word[word.length - 3];
        // Only strip -es after certain consonants where it's clearly a plural
        if ('cglnrt'.includes(beforeEs)) {
            return word.slice(0, -1); // keep the 'e': "forces" → "force"
        }
    }

    // Simple -s plurals (but not -ss, -us, -is)
    if (word.endsWith('s') && !word.endsWith('ss') &&
        !word.endsWith('us') && !word.endsWith('is')) {
        return word.slice(0, -1);
    }

    return word;
}

// ─── Unicode Cleanup ─────────────────────────────────────────────────────────
/**
 * Normalize Unicode characters to ASCII equivalents for retrieval.
 * Does NOT modify the original text — returns a new string.
 * @param {string} text
 * @returns {string}
 */
function normalizeUnicode(text) {
    if (!text) return '';
    // Apply NFKD decomposition first to handle composed characters
    let result = text.normalize('NFKD');
    // Replace known Unicode variants
    result = result.replace(UNICODE_REGEX, ch => UNICODE_REPLACEMENTS[ch] || ch);
    // Collapse multiple spaces
    result = result.replace(/\s+/g, ' ').trim();
    return result;
}

// ─── Core Tokenizer ──────────────────────────────────────────────────────────
/**
 * Tokenize text for TF-IDF retrieval.
 * Pipeline: Unicode normalize → lowercase → remove possessives → extract words
 *           → filter stopwords → safe stem
 *
 * @param {string} text - raw text input
 * @returns {string[]} array of normalized tokens
 */
function tokenize(text) {
    if (!text) return [];

    // 1. Unicode normalization
    let cleaned = normalizeUnicode(text);

    // 2. Lowercase
    cleaned = cleaned.toLowerCase();

    // 2.5 Ordinal normalization (transform numbers to words for better TF-IDF matching)
    cleaned = cleaned.replace(/\b(1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th)\b/g, match => {
        const map = {
            '1st': 'first', '2nd': 'second', '3rd': 'third', '4th': 'fourth',
            '5th': 'fifth', '6th': 'sixth', '7th': 'seventh', '8th': 'eighth',
            '9th': 'ninth', '10th': 'tenth'
        };
        return map[match] || match;
    });

    // 3. Remove possessive 's (both straight and any remaining curly)
    cleaned = cleaned.replace(/['']s\b/g, '');

    // 4. Extract alphanumeric tokens
    const rawTokens = cleaned.match(/\b[a-z0-9]+\b/g) || [];

    // 5. Filter stopwords and apply safe stemming
    return rawTokens
        .filter(t => !STOP_WORDS.has(t))
        .map(t => safeStem(t));
}

// ─── Retrieval Normalization API ─────────────────────────────────────────────
/**
 * Central retrieval normalization API.
 * Returns the original text alongside its retrieval representation.
 *
 * @param {string} text - the raw student query or chunk text
 * @returns {{ original: string, normalized: string, tokens: string[] }}
 */
function normalizeForRetrieval(text) {
    const original = text || '';
    const tokens = tokenize(original);
    const normalized = tokens.join(' ');
    return { original, normalized, tokens };
}

// ─── TF-IDF Helpers ──────────────────────────────────────────────────────────
function getTermFrequencies(tokens) {
    const tf = {};
    for (const token of tokens) {
        tf[token] = (tf[token] || 0) + 1;
    }
    return tf;
}

function cosineSimilarity(tf1, tf2) {
    const termSet = new Set([...Object.keys(tf1), ...Object.keys(tf2)]);
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (const term of termSet) {
        const val1 = tf1[term] || 0;
        const val2 = tf2[term] || 0;
        dotProduct += val1 * val2;
        norm1 += val1 * val1;
        norm2 += val2 * val2;
    }

    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

module.exports = {
    tokenize,
    normalizeForRetrieval,
    normalizeUnicode,
    safeStem,
    getTermFrequencies,
    cosineSimilarity,
    STOP_WORDS,
    STEM_EXCEPTIONS
};
