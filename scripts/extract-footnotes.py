#!/usr/bin/env python3
"""
Extract all footnotes from Volume 2 (lamrim_2.pdf).
Footnotes start at PDF page 512 and continue to ~page 700.
Output: JSON file with {number: text} mapping.
"""

import fitz
import re
import json
import sys


def extract_footnotes(pdf_path: str, start_page: int = 512, end_page: int = 700) -> dict:
    """Extract footnotes from PDF."""
    doc = fitz.open(pdf_path)

    footnotes = {}
    current_num = None
    current_text = []

    # Extract text from footnotes pages
    for page_num in range(start_page, min(end_page, len(doc))):
        page = doc[page_num]
        text = page.get_text()

        # Skip pages that are clearly not footnotes (appendix, glossary, index)
        if 'ПРИЛОЖЕНИЯ' in text:
            print(f"Stopping at page {page_num} (reached appendix)")
            break
        if 'УКАЗАТЕЛЬ-ГЛОССАРИЙ' in text:
            print(f"Stopping at page {page_num} (reached glossary)")
            break
        if 'Примечания к приложениям' in text:
            print(f"Stopping at page {page_num} (reached appendix notes)")
            break

        lines = text.split('\n')

        for line in lines:
            stripped = line.strip()

            # Skip header and page numbers
            if stripped in ('ПРИМЕЧАНИЯ', 'Примечания'):
                continue
            if re.match(r'^\d{4}$', stripped):
                continue

            # Check for footnote number - two formats:
            # 1. Number alone on line: "123"
            # 2. Number + tab + text: "123\t Some text..."

            # Check for footnote number - must be sequential (within reasonable range)
            def is_valid_footnote_num(num, current):
                """Check if num is a valid next footnote number."""
                if current is None:
                    return num <= 10  # First footnote should be small
                # Valid if: same as current (continuation), next one, or close (+1 to +5)
                return num > current and num <= current + 5

            # Format 1: number alone on line
            match = re.match(r'^(\d{1,4})$', stripped)
            if match:
                num = int(match.group(1))
                if is_valid_footnote_num(num, current_num):
                    # Save previous footnote
                    if current_num is not None and current_text:
                        fn_text = ' '.join(current_text)
                        fn_text = fn_text.replace('\u00ad', '')
                        fn_text = re.sub(r'\s+', ' ', fn_text).strip()
                        if fn_text:
                            footnotes[current_num] = fn_text
                    # Start new footnote
                    current_num = num
                    current_text = []
                    continue
                else:
                    # This number is not sequential - it's part of a list in the text
                    if current_num is not None:
                        current_text.append(stripped)
                    continue

            # Format 2: number + tab + text (on same line)
            match = re.match(r'^(\d{1,4})\t\s*(.+)$', line)
            if match:
                num = int(match.group(1))
                text_part = match.group(2).strip()
                if is_valid_footnote_num(num, current_num):
                    # Save previous footnote
                    if current_num is not None and current_text:
                        fn_text = ' '.join(current_text)
                        fn_text = fn_text.replace('\u00ad', '')
                        fn_text = re.sub(r'\s+', ' ', fn_text).strip()
                        if fn_text:
                            footnotes[current_num] = fn_text
                    # Start new footnote with text
                    current_num = num
                    current_text = [text_part] if text_part else []
                    continue
                else:
                    # This is a numbered list item inside the footnote text
                    if current_num is not None:
                        current_text.append(line.strip())
                    continue

            # Regular text line - add to current footnote
            if current_num is not None and stripped:
                current_text.append(stripped)

    # Save last footnote
    if current_num is not None and current_text:
        fn_text = ' '.join(current_text)
        fn_text = fn_text.replace('\u00ad', '')
        fn_text = re.sub(r'\s+', ' ', fn_text).strip()
        if fn_text:
            footnotes[current_num] = fn_text

    doc.close()
    return footnotes


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Extract footnotes from Lamrim Volume 2')
    parser.add_argument('pdf_path', nargs='?', default='lamrim_2.pdf', help='Path to PDF file')
    parser.add_argument('--output', '-o', default='src/content/footnotes.json', help='Output JSON file')
    parser.add_argument('--start', type=int, default=512, help='Start page (0-indexed)')
    parser.add_argument('--end', type=int, default=700, help='End page (0-indexed)')

    args = parser.parse_args()

    print(f"Extracting footnotes from {args.pdf_path}")
    print(f"Pages {args.start} to {args.end}")

    footnotes = extract_footnotes(args.pdf_path, args.start, args.end)

    print(f"\nExtracted {len(footnotes)} footnotes")

    # Show range
    if footnotes:
        nums = sorted(footnotes.keys())
        print(f"Footnote numbers: {nums[0]} to {nums[-1]}")

        # Check for gaps
        expected = set(range(nums[0], nums[-1] + 1))
        actual = set(nums)
        missing = expected - actual
        if missing:
            print(f"Warning: Missing footnotes: {sorted(missing)[:20]}{'...' if len(missing) > 20 else ''}")

    # Save to JSON
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(footnotes, f, ensure_ascii=False, indent=2)

    print(f"\nSaved to {args.output}")

    # Show sample
    print("\nSample footnotes:")
    for num in [1, 2, 3, 100, 500]:
        if num in footnotes:
            text = footnotes[num][:100] + ('...' if len(footnotes[num]) > 100 else '')
            print(f"  [{num}]: {text}")


if __name__ == "__main__":
    main()
