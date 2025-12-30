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


# Chapter definitions: (title, start_page, end_page, slug, start_marker, end_marker)
# Pages are 0-indexed
# start_marker: text that marks where the chapter begins
# end_marker: text that marks where the chapter ends (usually next chapter's start_marker)
VOLUME_1_CHAPTERS = [
    # Part 1: Intro and Teacher (already working)
    ("Введение", 110, 116, "vvedenie", None, "1. Автор"),
    ("Величие автора", 114, 128, "velichie-avtora", "1. Автор", "Дхарма, [о которой идет речь]"),
    ("Величие Дхармы", 126, 141, "velichie-dharmy", "Дхарма, [о которой идет речь]", "3. Правила слушания"),
    ("Правила слушания и проповедования Дхармы", 139, 160, "pravila-slushaniya-i-propovedovaniya", "3. Правила слушания", "Основа пути"),
    ("Вверение себя благому другу", 157, 195, "vverenie-sebya-blagomu-drugu", "Основа пути", "II. Краткое изложение"),
    ("Краткое изложение правил практики", 192, 218, "kratkoe-izlozhenie-pravil-praktiki", "II. Краткое изложение", "§2 Упразднение ложных"),
    ("Упразднение ложных представлений об аналитическом созерцании", 215, 230, "uprazdnenie-lozhnyh-predstavleniy", "§2 Упразднение ложных", "после вверения"),
    ("Наделение смыслом благоприятного рождения", 227, 270, "nadelenie-smyslom-blagopriyatnogo-rozhdeniya", "после вверения", "Здесь три [книги]"),

    # Part 2: Lower Person (низшая личность) - book pages 159-336
    ("Этап духовного развития низшей личности", 265, 270, "etap-nizshey-lichnosti", "Здесь три [книги]", None),
    ("Памятование о смерти", 270, 294, "pamyatovanie-o-smerti", None, None),  # book 163-187
    ("После смерти: счастливые и несчастные уделы", 294, 322, "posle-smerti", None, None),  # book 187-215
    ("Обращение к Прибежищу", 322, 368, "obrashhenie-k-pribezhishhu", None, None),  # book 215-261
    ("Общие размышления о законе кармы", 368, 377, "obshchie-razmyshleniya-o-zakone-karmy", None, None),  # book 261-270
    ("Дурные пути кармы", 377, 419, "durnye-puti-karmy", None, None),  # book 270-312
    ("Выбор правильного поведения", 419, 426, "vybor-pravilnogo-povedeniya", None, None),  # book 312-319
    ("Очищение четырьмя силами", 426, 444, "ochishchenie-chetyrmya-silami", None, None),  # book 319-337

    # Part 3: Middle Person (средняя личность) - book pages 337-466
    ("Этап духовного развития средней личности", 444, 452, "etap-sredney-lichnosti", None, None),  # book 337-345
    ("Размышление о страдании", 452, 490, "razmyshlenie-o-stradanii", None, None),  # book 345-383
    ("Истина источника — причины страдания", 490, 542, "istina-istochnika", None, None),  # book 383-435
    ("Основы пути Освобождения", 542, 552, "osnovy-puti-osvobozhdeniya", None, None),  # book 435-445
    ("Особенности трех практик", 552, 574, "osobennosti-treh-praktik", None, None),  # book 445-467

    # Part 4: Higher Person (высшая личность) - book pages 467-622
    ("Этап духовного развития высшей личности", 574, 580, "etap-vysshey-lichnosti", None, None),  # book 467-473
    ("Устремленность к Пробуждению", 580, 600, "ustremlennost-k-probuzhdeniyu", None, None),  # book 473-493
    ("Основа пути Махаяны — сострадание", 600, 644, "osnova-puti-mahayany-sostradanie", None, None),  # book 493-537
    ("Обретение устремленности к Пробуждению", 644, 686, "obretenie-ustremlennosti", None, None),  # book 537-579
    ("Почему нельзя достичь Будды без метода и мудрости", 686, 706, "pochemu-nelzya-dostich-buddy", None, None),  # book 579-599
    ("Этапы практики бодхисаттвы", 706, 730, "etapy-praktiki-bodhisattvy", None, None),  # book 599-623

    # Part 5: Six Paramitas - book pages 623-775
    ("Даяние", 730, 767, "dayanie", None, None),  # book 623-660
    ("Нравственность", 767, 778, "nravstvennost", None, None),  # book 660-671
    ("Терпение", 778, 822, "terpenie", None, None),  # book 671-715
    ("Усердие", 822, 860, "userdie", None, None),  # book 715-753
    ("Медитация", 860, 863, "meditatsiya", None, None),  # book 753-756
    ("Мудрость", 863, 882, "mudrost", None, None),  # book 756-775
]

# Volume 2 chapters
# Book page to PDF page offset: PDF = book - 781
VOLUME_2_CHAPTERS = [
    # Безмятежность (Shamatha)
    ("Безмятежность и проникновение", 9, 33, "bezmyatezhnost-i-proniknovenie", None, None),  # book 790-814
    ("Правила практики безмятежности", 33, 124, "pravila-praktiki-bezmyatezhnosti", None, None),  # book 814-905
    ("Способы продвижения на основе безмятежности", 124, 149, "sposoby-prodvizheniya", None, None),  # book 905-930

    # Проникновение (Vipashyana)
    ("Снаряжение для проникновения", 149, 166, "snaryazhenie-dlya-proniknoveniya", None, None),  # book 930-947
    ("Определение объекта отрицания", 166, 299, "opredelenie-obekta-otritsaniya", None, None),  # book 947-1080
    ("Прасанга или сватантра", 299, 367, "prasanga-ili-svatantra", None, None),  # book 1080-1148
    ("Как развить воззрение посредством прасанги", 367, 441, "kak-razvit-vozzrenie", None, None),  # book 1148-1222
    ("Разновидности проникновения", 441, 447, "raznovidnosti-proniknoveniya", None, None),  # book 1222-1228
    ("Правила освоения проникновения", 447, 488, "pravila-osvoeniya-proniknoveniya", None, None),  # book 1228-1269

    # Завершение
    ("Метод сочетания безмятежности и проникновения", 488, 500, "metod-sochetaniya", None, None),  # book 1269-1281
    ("Особая практика Ваджраяны", 500, 504, "osobaya-praktika-vadzhrayany", None, None),  # book 1281-1285
    ("Завершающие строфы и колофон", 504, 512, "zavershenie", None, None),  # book 1285-1293
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


def replace_tibetan_ornaments(text: str) -> str:
    """Replace TibetanMachine font ornaments (PUA chars) with Unicode symbol."""
    # U+F021, U+F022, U+F023 are ornamental marks from TibetanMachineNormalA
    # Replace with ❧ (floral heart) or remove entirely
    text = text.replace('\uf021', '')
    text = text.replace('\uf022', '')
    text = text.replace('\uf023', '')
    # Clean up multiple spaces that may result
    text = re.sub(r'  +', ' ', text)
    return text.strip()


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

        # Skip TibetanMachine ornamental characters
        if 'TibetanMachine' in span.font:
            continue

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

    # Remove TibetanMachine PUA characters (U+F021, U+F022, U+F023)
    text = text.replace('\uf021', '')
    text = text.replace('\uf022', '')
    text = text.replace('\uf023', '')

    # Remove lines that are just ] (remnants from TibetanMachine ornament removal)
    lines = text.split('\n')
    lines = [line for line in lines if line.strip() != ']']
    text = '\n'.join(lines)

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


def extract_chapter(doc, start_page: int, end_page: int, title: str, start_marker: str = None, end_marker: str = None) -> str:
    """Extract a single chapter from the PDF.

    Args:
        start_marker: If provided, skip content until this text is found.
        end_marker: If provided, stop extraction when this text is found.
    """
    all_paragraphs = []
    all_footnotes = {}
    found_start = start_marker is None  # If no marker, start immediately
    found_end = False

    for page_num in range(start_page, end_page):
        if found_end:
            break

        page = doc[page_num]
        page_height = page.rect.height

        result = extract_page(page, page_num, page_height)

        for para_text, is_poetry, is_header, is_subheading in result['paragraphs']:
            # Check for end marker first
            if end_marker and end_marker in para_text:
                found_end = True
                break

            # If we haven't found the start marker yet, look for it
            if not found_start:
                if start_marker and start_marker in para_text:
                    found_start = True
                else:
                    continue  # Skip content before start marker

            if is_poetry:
                # Format poetry as blockquote
                para_text = format_poetry_as_blockquote(para_text)
            all_paragraphs.append(para_text)

        if not found_end:
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
    elif args.volume == 2:
        chapters = VOLUME_2_CHAPTERS
    else:
        print(f"Volume {args.volume} not configured yet", file=sys.stderr)
        sys.exit(1)

    if args.list:
        print("Available chapters:")
        for i, (title, start, end, slug, start_marker, end_marker) in enumerate(chapters, 1):
            print(f"  {i}. {title} (pages {start+1}-{end})")
        sys.exit(0)

    # Parse chapter selection
    if args.chapters:
        indices = [int(x) - 1 for x in args.chapters.split(',')]
        selected = [(i, chapters[i]) for i in indices if 0 <= i < len(chapters)]
    else:
        selected = [(i, chapters[i]) for i in range(min(5, len(chapters)))]

    # Open PDF
    doc = fitz.open(args.pdf_path)

    # Create output directory
    output_dir = os.path.join(args.output_dir, f'volume-{args.volume}')
    os.makedirs(output_dir, exist_ok=True)

    print(f"Extracting {len(selected)} chapters to {output_dir}")
    print()

    for idx, (chapter_idx, (title, start, end, slug, start_marker, end_marker)) in enumerate(selected, 1):
        chapter_num = chapter_idx + 1  # 1-based chapter number
        print(f"  [{idx}/{len(selected)}] Chapter {chapter_num}: {title}...", end=" ", flush=True)

        content = extract_chapter(doc, start, end, title, start_marker, end_marker)

        # Write file with correct chapter number
        filename = f"{chapter_num:02d}-{slug}.md"
        filepath = os.path.join(output_dir, filename)

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

        print(f"✓ ({len(content)} chars)")

    doc.close()

    print()
    print("Done!")


if __name__ == "__main__":
    main()
