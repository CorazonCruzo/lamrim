#!/usr/bin/env python3
"""
Extract chapters from Lamrim PDF using PyMuPDF.

Features:
- Proper spacing between spans (using x-coordinates)
- Poetry/verse detection by indentation (formatted as blockquotes)
- Subheading detection by font size (formatted as ### headers)
- Bold-italic section headers
- Inline footnote markers as [^N]
- Hyphenated word joining across lines
"""

import fitz
import re
import sys
import os
from dataclasses import dataclass
from typing import Optional
from transliterate import translit


# Chapter definitions: (title, start_page, end_page, slug)
# Pages are 0-indexed
VOLUME_1_CHAPTERS = [
    ("Введение", 110, 115, "vvedenie"),
    ("Величие автора", 115, 127, "velichie-avtora"),
    ("Величие Дхармы", 127, 140, "velichie-dharmy"),
    ("Правила слушания и проповедования Дхармы", 140, 157, "pravila-slushaniya-i-propovedovaniya"),
    ("Вверение себя благому другу", 157, 194, "vverenie-sebya-blagomu-drugu"),
]


# Constants for layout detection
NORMAL_LEFT_MARGIN = 54  # Normal text left margin
POETRY_INDENT_THRESHOLD = 100  # X position indicating poetry/quote indent
HEADER_TOP_MARGIN = 55  # Y position - anything above is header
FOOTNOTE_BOTTOM_MARGIN = 510  # Y position - footnotes at very bottom (page height ~538)
SPACE_THRESHOLD = 2.0  # Gap between spans that indicates a space
SUBHEADING_FONT_SIZE = 10.5  # Font size threshold for subheadings vs poetry


@dataclass
class Span:
    """A span of text with formatting and position info."""
    text: str
    font: str
    size: float
    flags: int
    x0: float  # left edge
    x1: float  # right edge
    y: float   # top edge

    @property
    def is_italic(self) -> bool:
        return 'Italic' in self.font

    @property
    def is_bold(self) -> bool:
        return 'Bold' in self.font

    @property
    def is_bold_italic(self) -> bool:
        return self.is_bold and self.is_italic

    @property
    def is_superscript(self) -> bool:
        """Small superscript text (footnote markers)."""
        return self.size < 7 and self.text.strip().isdigit()

    @property
    def is_footnote_def(self) -> bool:
        """Footnote definition text (small, at bottom)."""
        return self.size < 9


def is_page_header(span: Span, block_y: float) -> bool:
    """Detect page headers to skip."""
    if block_y < HEADER_TOP_MARGIN:
        text = span.text.strip()
        # Roman numerals, page numbers
        if re.match(r'^[IVXLCDM]+$', text):
            return True
        if re.match(r'^\d+$', text):
            return True
        # Header fonts
        if span.font in ("PragmaticaBold-Reg", "PragmaticaBook-Reg"):
            return True
    return False


def is_leaf_number(text: str) -> bool:
    """Detect Tibetan-style leaf numbers like '1 а', '2 б'."""
    return bool(re.match(r'^\d+\s*[абв]?$', text.strip()))


def extract_page(page, page_num: int, page_height: float) -> dict:
    """
    Extract structured content from a page.
    Returns: {
        'paragraphs': list of (text, is_poetry, is_header),
        'footnotes': dict of {number: definition}
    }
    """
    blocks = page.get_text("dict")["blocks"]

    paragraphs = []
    footnotes = {}

    for block in blocks:
        if block["type"] != 0:  # Not text
            continue

        block_y = block["bbox"][1]
        block_x = block["bbox"][0]

        # Collect all spans in this block with their positions
        lines_data = []

        for line in block.get("lines", []):
            line_spans = []
            line_x = line["bbox"][0]

            for span_data in line.get("spans", []):
                span = Span(
                    text=span_data["text"],
                    font=span_data["font"],
                    size=span_data["size"],
                    flags=span_data["flags"],
                    x0=span_data["bbox"][0],
                    x1=span_data["bbox"][2],
                    y=span_data["bbox"][1],
                )
                line_spans.append(span)

            if line_spans:
                lines_data.append((line_x, line_spans))

        if not lines_data:
            continue

        # Check if this is footnote area (bottom of page)
        if block_y > FOOTNOTE_BOTTOM_MARGIN:
            fn_text = process_footnote_block(lines_data)
            if fn_text:
                # Try to extract footnote number
                match = re.match(r'^(\d+)\s+(.+)$', fn_text, re.DOTALL)
                if match:
                    fn_num = match.group(1)
                    fn_def = match.group(2).strip()
                    footnotes[fn_num] = fn_def
            continue

        # Check if this is page header
        first_span = lines_data[0][1][0] if lines_data and lines_data[0][1] else None
        if first_span and is_page_header(first_span, block_y):
            continue

        # Determine block type
        is_subheading = is_subheading_block(lines_data)
        is_poetry = is_poetry_block(lines_data)
        is_header = is_header_block(lines_data)

        # Process the block
        if is_subheading:
            text = process_subheading_block(lines_data)
        elif is_poetry:
            text = process_poetry_block(lines_data)
        elif is_header:
            text = process_header_block(lines_data)
        else:
            text = process_normal_block(lines_data)

        if text.strip():
            paragraphs.append((text, is_poetry, is_header, is_subheading))

    return {'paragraphs': paragraphs, 'footnotes': footnotes}


def get_block_font_size(lines_data: list) -> float:
    """Get the predominant font size in a block."""
    sizes = []
    for line_x, spans in lines_data:
        for span in spans:
            if not span.is_superscript:  # Exclude footnote markers
                sizes.append(span.size)
    return max(sizes) if sizes else 0


def is_subheading_block(lines_data: list) -> bool:
    """Detect if block is a subheading (indented + larger font)."""
    if not lines_data:
        return False

    first_line_x = lines_data[0][0]
    font_size = get_block_font_size(lines_data)

    # Subheadings are indented AND have larger font (>10.5)
    if first_line_x > POETRY_INDENT_THRESHOLD and font_size > SUBHEADING_FONT_SIZE:
        return True

    return False


def is_poetry_block(lines_data: list) -> bool:
    """Detect if block is poetry (indented, short lines, normal font size)."""
    if not lines_data:
        return False

    # First check if it's a subheading (larger font) - not poetry
    if is_subheading_block(lines_data):
        return False

    # Check first line's x position
    first_line_x = lines_data[0][0]

    # Poetry is typically indented (x > 100) with normal font size
    if first_line_x > POETRY_INDENT_THRESHOLD:
        # Also check: multiple short lines
        if len(lines_data) >= 2:
            return True

    return False


def is_header_block(lines_data: list) -> bool:
    """Detect if block is a section header (bold-italic)."""
    if not lines_data:
        return False

    # Check if all spans are bold-italic
    for line_x, spans in lines_data:
        for span in spans:
            if span.is_bold_italic and span.size >= 9:
                return True

    return False


def process_normal_block(lines_data: list) -> str:
    """Process a normal text block, joining lines with proper spacing."""
    result_parts = []

    for line_x, spans in lines_data:
        line_text = process_line_spans(spans)
        if line_text.strip():
            # Skip leaf numbers
            if is_leaf_number(line_text):
                continue
            result_parts.append(line_text)

    # Join lines with space (normal paragraph flow)
    text = ' '.join(result_parts)

    # Clean up multiple spaces
    text = re.sub(r'  +', ' ', text)

    return text


def process_poetry_block(lines_data: list) -> str:
    """Process a poetry block, preserving line breaks."""
    result_lines = []

    for line_x, spans in lines_data:
        line_text = process_line_spans(spans)
        if line_text.strip():
            result_lines.append(line_text.strip())

    # Join with newlines to preserve poetry structure
    return '\n'.join(result_lines)


def process_header_block(lines_data: list) -> str:
    """Process a section header block."""
    parts = []

    for line_x, spans in lines_data:
        line_text = ''
        for span in spans:
            line_text += span.text
        parts.append(line_text.strip())

    # Join multi-line headers
    header_text = ' '.join(parts)

    # Format as markdown header
    return f"\n**{header_text}**\n"


def process_subheading_block(lines_data: list) -> str:
    """Process a subheading block (larger font, centered in PDF)."""
    parts = []

    for line_x, spans in lines_data:
        line_text = ''
        for span in spans:
            line_text += span.text
        parts.append(line_text.strip())

    # Join multi-line subheadings
    subheading_text = ' '.join(parts)

    # Format as markdown level 3 heading (centered via CSS)
    return f"\n### {subheading_text}\n"


def process_footnote_block(lines_data: list) -> str:
    """Process a footnote definition block."""
    parts = []

    for line_x, spans in lines_data:
        for span in spans:
            parts.append(span.text)

    return ' '.join(parts).strip()


def process_line_spans(spans: list) -> str:
    """
    Process spans in a line, adding proper spacing between them.
    Also handles italic/bold formatting and footnote markers.
    """
    if not spans:
        return ''

    parts = []

    for i, span in enumerate(spans):
        text = span.text

        # Handle footnote markers (superscript numbers)
        if span.is_superscript:
            parts.append(f'[^{text.strip()}]')
        # Handle italic text
        elif span.is_italic and not span.is_bold:
            stripped = text.strip()
            if stripped:
                # Preserve leading/trailing spaces outside the markers
                prefix = ' ' if text.startswith(' ') or (text and text[0] == ' ') else ''
                suffix = ' ' if text.endswith(' ') or (text and text[-1] == ' ') else ''
                parts.append(f'{prefix}*{stripped}*{suffix}')
            elif text.strip() == '':
                parts.append(text)  # Just whitespace
        # Handle bold text (non-header)
        elif span.is_bold and not span.is_italic:
            stripped = text.strip()
            if stripped and span.size >= 10:
                prefix = ' ' if text.startswith(' ') else ''
                suffix = ' ' if text.endswith(' ') else ''
                parts.append(f'{prefix}**{stripped}**{suffix}')
            else:
                parts.append(text)
        else:
            parts.append(text)

    # Join parts - no automatic space adding, rely on original spacing
    result = ''.join(parts)

    return result


def join_hyphenated(text: str) -> str:
    """Join words split with hyphen at line break."""
    # Soft hyphen (U+00AD)
    text = re.sub(r'\u00ad\s*', '', text)
    # Regular hyphen at word break
    text = re.sub(r'([а-яёА-ЯЁ])-\s+([а-яёА-ЯЁ])', r'\1\2', text)
    return text


def clean_markdown(text: str) -> str:
    """Post-process markdown for better readability."""

    # Join hyphenated words
    text = join_hyphenated(text)

    # Join split italic words: *word* *part* -> *wordpart*
    # This handles words hyphenated across lines that were formatted separately
    text = re.sub(r'\*([а-яёА-ЯЁa-zA-Z]+)\*\s*\*([а-яёА-ЯЁa-zA-Z]+)\*', r'*\1\2*', text)

    # Also join: *word**part* -> *wordpart* (no space variant)
    text = re.sub(r'\*([а-яёА-ЯЁa-zA-Z]+)\*\*([а-яёА-ЯЁa-zA-Z]+)\*', r'*\1\2*', text)

    # Add space before [ if missing
    text = re.sub(r'([а-яёА-ЯЁa-zA-Z])\[', r'\1 [', text)

    # Add space after ] if followed by letter
    text = re.sub(r'\]([а-яёА-ЯЁa-zA-Z])', r'] \1', text)

    # Clean up multiple spaces
    text = re.sub(r'  +', ' ', text)

    # Clean up paragraph spacing
    text = re.sub(r'\n{3,}', '\n\n', text)

    # Remove trailing spaces on lines
    lines = [line.rstrip() for line in text.split('\n')]
    text = '\n'.join(lines)

    return text


def format_poetry_as_blockquote(text: str) -> str:
    """Format multi-line poetry as blockquote."""
    lines = text.split('\n')
    if len(lines) > 1:
        # It's poetry - add > prefix
        return '\n'.join('> ' + line for line in lines)
    return text


def extract_chapter(doc, start_page: int, end_page: int, title: str) -> str:
    """Extract a single chapter from the PDF."""
    all_paragraphs = []
    all_footnotes = {}

    for page_num in range(start_page, end_page):
        page = doc[page_num]
        page_height = page.rect.height

        result = extract_page(page, page_num, page_height)

        for para_text, is_poetry, is_header, is_subheading in result['paragraphs']:
            if is_poetry:
                # Format poetry as blockquote
                para_text = format_poetry_as_blockquote(para_text)
            all_paragraphs.append(para_text)

        all_footnotes.update(result['footnotes'])

    # Build final text
    content = f"# {title}\n\n"
    content += '\n\n'.join(all_paragraphs)

    # Clean up
    content = clean_markdown(content)

    # Add footnotes at end
    if all_footnotes:
        content += "\n\n---\n\n"
        for fn_num in sorted(all_footnotes.keys(), key=int):
            content += f"[^{fn_num}]: {all_footnotes[fn_num]}\n\n"

    return content


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Extract chapters from Lamrim PDF v2')
    parser.add_argument('pdf_path', help='Path to PDF file')
    parser.add_argument('--volume', type=int, default=1, help='Volume number')
    parser.add_argument('--output-dir', '-o', default='src/content/volumes', help='Output directory')
    parser.add_argument('--chapters', type=str, help='Comma-separated chapter indices (1-based)')
    parser.add_argument('--list', action='store_true', help='List available chapters')

    args = parser.parse_args()

    if args.volume == 1:
        chapters = VOLUME_1_CHAPTERS
    else:
        print(f"Volume {args.volume} not configured yet", file=sys.stderr)
        sys.exit(1)

    if args.list:
        print("Available chapters:")
        for i, (title, start, end, slug) in enumerate(chapters, 1):
            print(f"  {i}. {title} (pages {start+1}-{end})")
        sys.exit(0)

    # Parse chapter selection
    if args.chapters:
        indices = [int(x) - 1 for x in args.chapters.split(',')]
        selected = [chapters[i] for i in indices if 0 <= i < len(chapters)]
    else:
        selected = chapters[:5]

    # Open PDF
    doc = fitz.open(args.pdf_path)

    # Create output directory
    output_dir = os.path.join(args.output_dir, f'volume-{args.volume}')
    os.makedirs(output_dir, exist_ok=True)

    print(f"Extracting {len(selected)} chapters to {output_dir}")
    print()

    for i, (title, start, end, slug) in enumerate(selected, 1):
        print(f"  [{i}/{len(selected)}] {title}...", end=" ", flush=True)

        content = extract_chapter(doc, start, end, title)

        # Write file
        filename = f"{i:02d}-{slug}.md"
        filepath = os.path.join(output_dir, filename)

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

        print(f"✓ ({len(content)} chars)")

    doc.close()

    print()
    print("Done!")


if __name__ == "__main__":
    main()
