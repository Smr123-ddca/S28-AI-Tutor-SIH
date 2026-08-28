import pymupdf
import json
import sys
import os
import re
from statistics import median


# ============================================================
# UTF-8
# ============================================================

try:
    sys.stdout.reconfigure(
        encoding="utf-8",
        errors="replace"
    )
    sys.stderr.reconfigure(
        encoding="utf-8",
        errors="replace"
    )
except Exception:
    pass


# ============================================================
# EXTRACT PDF
# ============================================================

def extract_pdf_structure(pdf_path):

    doc = pymupdf.open(pdf_path)

    pages = []

    for page_number, page in enumerate(doc, start=1):

        lines = []

        blocks = page.get_text("dict").get("blocks", [])

        for block in blocks:

            if "lines" not in block:
                continue

            for line in block["lines"]:

                spans = line.get("spans", [])

                text = "".join(
                    span.get("text", "")
                    for span in spans
                )

                if not text.strip():
                    continue

                font_sizes = [
                    span.get("size", 0)
                    for span in spans
                    if span.get("text", "").strip()
                ]

                font_size = (
                    sum(font_sizes) / len(font_sizes)
                    if font_sizes
                    else 0
                )

                bold = any(
                    "bold" in span.get(
                        "font",
                        ""
                    ).lower()
                    for span in spans
                )

                lines.append({
                    "text": text,
                    "font_size": font_size,
                    "bold": bold
                })

        pages.append({
            "page": page_number,
            "lines": lines
        })

    doc.close()

    total_lines = sum(
        len(page["lines"])
        for page in pages
    )

    print(
        f"Extracted {len(pages)} pages, {total_lines} lines.",
        file=sys.stderr
    )

    return pages


# ============================================================
# TOPIC
# ============================================================

def detect_topic(pages, pdf_path):

    all_text = "\n".join(
        line["text"]
        for page in pages
        for line in page["lines"]
    )

    match = re.search(
        r"SUBJECT\s*:\s*(.+)",
        all_text,
        re.IGNORECASE
    )

    if match:
        return match.group(1).strip()

    match = re.search(
        r"COURSE\s*:\s*(.+)",
        all_text,
        re.IGNORECASE
    )

    if match:
        return match.group(1).strip()

    filename = os.path.basename(pdf_path)

    return os.path.splitext(filename)[0]


# ============================================================
# HEADING
# ============================================================

def is_heading(text, font_size, bold, body_median):

    text = text.strip()

    if not text:
        return False

    if len(text) > 180:
        return False

    patterns = [
        r"^\d+\.\s+.+",
        r"^\d+\.\d+\s+.+",
        r"^\d+\.\d+\.\d+\s+.+",
        r"^chapter\s+\d+",
        r"^unit\s+\d+",
        r"^module\s+\d+",
        r"^section\s+\d+",
        r"^lesson\s+\d+",
        r"^lecture\s+\d+"
    ]

    for pattern in patterns:

        if re.match(
            pattern,
            text,
            re.IGNORECASE
        ):
            return True

    letters = re.sub(
        r"[^A-Za-z]",
        "",
        text
    )

    if (
        len(letters) >= 5
        and letters.upper() == letters
        and len(text) <= 120
    ):
        return True

    if body_median > 0:

        if font_size >= body_median * 1.35:
            return True

        if (
            bold
            and font_size >= body_median * 1.15
        ):
            return True

    return False


# ============================================================
# BUILD SECTIONS
# ============================================================

def build_sections(pages):

    body_sizes = []

    for page in pages:

        for line in page["lines"]:

            if (
                len(line["text"]) > 25
                and line["font_size"] > 0
            ):
                body_sizes.append(
                    line["font_size"]
                )

    body_median = (
        median(body_sizes)
        if body_sizes
        else 10
    )

    sections = []

    current_chapter = "General"
    current_section = "Course Material"

    current_text = []

    start_page = None
    end_page = None

    def save_section():

        nonlocal current_text
        nonlocal start_page
        nonlocal end_page

        if not current_text:
            return

        text = "\n".join(
            current_text
        ).strip()

        if len(text) >= 30:

            sections.append({
                "chapter": current_chapter,
                "section": current_section,
                "page_start": start_page,
                "page_end": end_page,
                "text": text
            })

        current_text = []

    for page in pages:

        page_number = page["page"]

        for line in page["lines"]:

            text = line["text"].strip()

            if not text:
                continue

            if is_heading(
                text,
                line["font_size"],
                line["bold"],
                body_median
            ):

                save_section()

                lower = text.lower()

                if (
                    lower.startswith("chapter")
                    or lower.startswith("unit")
                    or lower.startswith("module")
                ):
                    current_chapter = text
                    current_section = "Introduction"

                else:
                    current_section = text

                start_page = page_number
                end_page = page_number

                continue

            if start_page is None:
                start_page = page_number

            end_page = page_number

            current_text.append(text)

    save_section()

    return sections


# ============================================================
# FALLBACK
# ============================================================

def fallback_section(pages):

    all_lines = []

    first_page = None
    last_page = None

    for page in pages:

        for line in page["lines"]:

            text = line["text"].strip()

            if not text:
                continue

            if first_page is None:
                first_page = page["page"]

            last_page = page["page"]

            all_lines.append(text)

    text = " ".join(all_lines).strip()

    if len(text) < 30:
        return []

    return [{
        "chapter": "General",
        "section": "Course Material",
        "page_start": first_page,
        "page_end": last_page,
        "text": text
    }]


# ============================================================
# SPLIT
# ============================================================

def split_section(
    section,
    max_words=350,
    overlap=50
):

    words = section["text"].split()

    if len(words) <= max_words:

        return [{
            **section,
            "chunk_index": 1
        }]

    result = []

    start = 0
    index = 1

    while start < len(words):

        end = min(
            start + max_words,
            len(words)
        )

        result.append({
            **section,
            "text": " ".join(words[start:end]),
            "chunk_index": index
        })

        if end >= len(words):
            break

        start = end - overlap
        index += 1

    return result


# ============================================================
# CHUNKS
# ============================================================

def create_chunks(sections, topic):

    chunks = []

    counter = 1

    for section in sections:

        pieces = split_section(section)

        for piece in pieces:

            chunks.append({
                "id": f"chunk_{counter}",
                "topic": topic,
                "chapter": piece["chapter"],
                "section": piece["section"],
                "section_label": piece["section"],
                "chunk_index": piece["chunk_index"],
                "page_start": piece["page_start"],
                "page_end": piece["page_end"],
                "text": piece["text"]
            })

            counter += 1

    return chunks


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    if len(sys.argv) < 2:

        print(
            json.dumps({
                "error": "PDF path required"
            }),
            flush=True
        )

        sys.exit(1)

    pdf_path = sys.argv[1]

    if not os.path.exists(pdf_path):

        print(
            json.dumps({
                "error": f"PDF not found: {pdf_path}"
            }),
            flush=True
        )

        sys.exit(1)

    try:

        pages = extract_pdf_structure(pdf_path)

        total_lines = sum(
            len(page["lines"])
            for page in pages
        )

        if total_lines == 0:

            print(
                "PDF contains no extractable text.",
                file=sys.stderr
            )

            sys.exit(1)

        topic = detect_topic(
            pages,
            pdf_path
        )

        sections = build_sections(pages)

        # IMPORTANT:
        # If heading detection fails, don't return 0 chunks.
        if not sections:

            print(
                "Heading detection produced no sections.",
                file=sys.stderr
            )

            print(
                "Using fallback section.",
                file=sys.stderr
            )

            sections = fallback_section(pages)

        chunks = create_chunks(
            sections,
            topic
        )

        if not chunks:

            print(
                "Chunking failed: zero chunks produced.",
                file=sys.stderr
            )

            sys.exit(1)

        print(
            f"Created {len(chunks)} chunks.",
            file=sys.stderr
        )

        # stdout ONLY JSON
        print(
            json.dumps(
                chunks,
                ensure_ascii=False
            ),
            flush=True
        )

    except Exception as e:

        print(
            f"Chunking error: {e}",
            file=sys.stderr
        )

        sys.exit(1)