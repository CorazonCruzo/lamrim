#!/usr/bin/env python3
"""
Link footnotes from footnotes.json to markdown chapter files.

For each chapter:
1. Find all [^N] markers
2. Look up footnote text in footnotes.json
3. Add footnote definitions at the end (before any existing footnotes section)
"""

import json
import re
import os
import sys
from pathlib import Path


def load_footnotes(footnotes_path: str) -> dict:
    """Load footnotes from JSON file."""
    with open(footnotes_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def find_footnote_markers(content: str) -> set:
    """Find all [^N] markers in the content."""
    markers = re.findall(r'\[\^(\d+)\]', content)
    return set(markers)


def remove_existing_footnotes_section(content: str) -> tuple[str, dict]:
    """Remove existing footnotes section and extract any existing definitions."""
    existing = {}

    # Find existing footnotes section (starts with --- followed by [^N]: definitions)
    pattern = r'\n---\n\n(\[\^\d+\]:.*?)$'
    match = re.search(pattern, content, re.DOTALL)

    if match:
        footnotes_section = match.group(1)
        content = content[:match.start()]

        # Extract existing footnote definitions
        for fn_match in re.finditer(r'\[\^(\d+)\]:\s*(.+?)(?=\n\[\^\d+\]:|$)', footnotes_section, re.DOTALL):
            num = fn_match.group(1)
            text = fn_match.group(2).strip()
            existing[num] = text

    return content.rstrip(), existing


def process_chapter(chapter_path: str, footnotes: dict, dry_run: bool = False) -> tuple[int, int]:
    """
    Process a single chapter file.
    Returns: (markers_found, footnotes_added)
    """
    with open(chapter_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find all footnote markers
    markers = find_footnote_markers(content)

    if not markers:
        return 0, 0

    # Remove existing footnotes section
    content, existing = remove_existing_footnotes_section(content)

    # Build new footnotes section
    footnotes_added = 0
    footnotes_section = []

    for num in sorted(markers, key=int):
        if num in footnotes:
            footnotes_section.append(f"[^{num}]: {footnotes[num]}")
            footnotes_added += 1
        elif num in existing:
            # Keep existing footnote if not in JSON
            footnotes_section.append(f"[^{num}]: {existing[num]}")

    if footnotes_section:
        content += "\n\n---\n\n"
        content += "\n\n".join(footnotes_section)
        content += "\n"

    if not dry_run:
        with open(chapter_path, 'w', encoding='utf-8') as f:
            f.write(content)

    return len(markers), footnotes_added


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Link footnotes to chapter files')
    parser.add_argument('--footnotes', '-f', default='src/content/footnotes.json',
                        help='Path to footnotes.json')
    parser.add_argument('--volumes-dir', '-d', default='src/content/volumes',
                        help='Path to volumes directory')
    parser.add_argument('--dry-run', action='store_true',
                        help='Show what would be done without making changes')
    parser.add_argument('--volume', type=int, help='Process only specified volume')

    args = parser.parse_args()

    # Load footnotes
    footnotes = load_footnotes(args.footnotes)
    print(f"Loaded {len(footnotes)} footnotes from {args.footnotes}")

    # Find all chapter files
    volumes_dir = Path(args.volumes_dir)

    if args.volume:
        volume_dirs = [volumes_dir / f'volume-{args.volume}']
    else:
        volume_dirs = sorted(volumes_dir.iterdir())

    total_markers = 0
    total_added = 0

    for volume_dir in volume_dirs:
        if not volume_dir.is_dir():
            continue

        print(f"\n{volume_dir.name}:")

        chapter_files = sorted(volume_dir.glob('*.md'))

        for chapter_path in chapter_files:
            markers, added = process_chapter(str(chapter_path), footnotes, args.dry_run)

            if markers > 0:
                status = "(dry run)" if args.dry_run else ""
                print(f"  {chapter_path.name}: {markers} markers, {added} footnotes linked {status}")
                total_markers += markers
                total_added += added

    print(f"\nTotal: {total_markers} markers found, {total_added} footnotes linked")

    if args.dry_run:
        print("\n(Dry run - no files modified)")


if __name__ == "__main__":
    main()
