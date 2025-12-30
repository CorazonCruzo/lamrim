#!/usr/bin/env python3
"""
Fix page references in footnotes by replacing them with chapter links.

Finds patterns like "С. 808", "стр. 123", "с. 456" and replaces with
chapter references like "глава «Название»".
"""

import json
import re

# Chapter definitions with book page ranges
# Format: (title, start_book_page, end_book_page, section_id)
# section_id is the URL path like "1-01", "2-01", etc.

CHAPTERS = [
    # Volume 1 (book pages 3-775)
    ("Введение", 3, 9, "1-01"),
    ("Величие автора", 7, 21, "1-02"),
    ("Величие Дхармы", 19, 34, "1-03"),
    ("Правила слушания и проповедования Дхармы", 32, 53, "1-04"),
    ("Вверение себя благому другу", 50, 88, "1-05"),
    ("Краткое изложение правил практики", 85, 111, "1-06"),
    ("Упразднение ложных представлений об аналитическом созерцании", 108, 123, "1-07"),
    ("Наделение смыслом благоприятного рождения", 120, 163, "1-08"),
    ("Этап духовного развития низшей личности", 158, 163, "1-09"),
    ("Памятование о смерти", 163, 187, "1-10"),
    ("После смерти: счастливые и несчастные уделы", 187, 215, "1-11"),
    ("Обращение к Прибежищу", 215, 261, "1-12"),
    ("Общие размышления о законе кармы", 261, 270, "1-13"),
    ("Дурные пути кармы", 270, 312, "1-14"),
    ("Выбор правильного поведения", 312, 319, "1-15"),
    ("Очищение четырьмя силами", 319, 337, "1-16"),
    ("Этап духовного развития средней личности", 337, 345, "1-17"),
    ("Размышление о страдании", 345, 383, "1-18"),
    ("Истина источника — причины страдания", 383, 435, "1-19"),
    ("Основы пути Освобождения", 435, 445, "1-20"),
    ("Особенности трех практик", 445, 467, "1-21"),
    ("Этап духовного развития высшей личности", 467, 473, "1-22"),
    ("Устремленность к Пробуждению", 473, 493, "1-23"),
    ("Основа пути Махаяны — сострадание", 493, 537, "1-24"),
    ("Обретение устремленности к Пробуждению", 537, 579, "1-25"),
    ("Почему нельзя достичь Будды без метода и мудрости", 579, 599, "1-26"),
    ("Этапы практики бодхисаттвы", 599, 623, "1-27"),
    ("Даяние", 623, 660, "1-28"),
    ("Нравственность", 660, 671, "1-29"),
    ("Терпение", 671, 715, "1-30"),
    ("Усердие", 715, 753, "1-31"),
    ("Медитация", 753, 756, "1-32"),
    ("Мудрость", 756, 775, "1-33"),

    # Volume 2 (book pages 790-1293)
    ("Безмятежность и проникновение", 790, 814, "2-01"),
    ("Правила практики безмятежности", 814, 905, "2-02"),
    ("Способы продвижения на основе безмятежности", 905, 930, "2-03"),
    ("Снаряжение для проникновения", 930, 947, "2-04"),
    ("Определение объекта отрицания", 947, 1080, "2-05"),
    ("Прасанга или сватантра", 1080, 1148, "2-06"),
    ("Как развить воззрение посредством прасанги", 1148, 1222, "2-07"),
    ("Разновидности проникновения", 1222, 1228, "2-08"),
    ("Правила освоения проникновения", 1228, 1269, "2-09"),
    ("Метод сочетания безмятежности и проникновения", 1269, 1281, "2-10"),
    ("Особая практика Ваджраяны", 1281, 1285, "2-11"),
    ("Завершающие строфы и колофон", 1285, 1293, "2-12"),
]


def find_chapter_by_page(page_num: int) -> tuple | None:
    """Find chapter that contains the given page number."""
    for title, start, end, section_id in CHAPTERS:
        if start <= page_num <= end:
            return (title, section_id)
    return None


def replace_page_refs(text: str) -> tuple[str, list]:
    """Replace page references with chapter links.

    Only replaces internal references (preceded by "см", "См", etc.)
    Handles page ranges like "С. 124-126"

    Returns: (new_text, list of replacements made)
    """
    replacements = []

    # Pattern: "См" or "см" followed by optional punctuation, then "С." or "с." and page number(s)
    # Examples:
    #   "См. С. 877"
    #   "см. С. 299 и далее"
    #   "См.: С. 808"
    #   "Подробнее см. С. 386"
    #   "См. С. 124-126"
    #   "см. С. 364-365"

    # Pattern breakdown:
    # (См|см)\.?\s*:?\s*  - "См" or "см" with optional "." and ":" and spaces
    # [Сс]\.?\s*          - "С" or "с" with optional "." and spaces
    # (\d+)               - first page number
    # (?:\s*[-–—]\s*(\d+))? - optional range with second page number

    pattern = r'([Сс]м)\.?\s*:?\s*[Сс]\.?\s*(\d+)(?:\s*[-–—]\s*(\d+))?'

    def replace_match(match):
        prefix = match.group(1)  # "См" or "см"
        page_start = int(match.group(2))
        page_end = match.group(3)

        chapter = find_chapter_by_page(page_start)

        if chapter:
            title, section_id = chapter
            replacements.append((page_start, title))

            link = f'/read/{section_id}'

            if page_end:
                # Page range - check if same chapter
                end_chapter = find_chapter_by_page(int(page_end))
                if end_chapter and end_chapter[0] != title:
                    # Different chapters - mention both
                    end_title, end_section_id = end_chapter
                    end_link = f'/read/{end_section_id}'
                    return f'{prefix}. главы [«{title}»]({link}) — [«{end_title}»]({end_link})'

            return f'{prefix}. главу [«{title}»]({link})'
        else:
            # Keep original if page not found
            return match.group(0)

    result = re.sub(pattern, replace_match, text)
    return result, replacements


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Fix page references in footnotes')
    parser.add_argument('--dry-run', action='store_true', help='Show changes without modifying')
    parser.add_argument('--footnotes', default='src/content/footnotes.json', help='Path to footnotes.json')

    args = parser.parse_args()

    # Load footnotes
    with open(args.footnotes, 'r', encoding='utf-8') as f:
        footnotes = json.load(f)

    print(f"Loaded {len(footnotes)} footnotes")

    # Find and replace page references
    total_replacements = []
    modified_footnotes = {}

    for num, text in footnotes.items():
        new_text, replacements = replace_page_refs(text)
        modified_footnotes[num] = new_text

        if replacements:
            total_replacements.append((num, replacements))
            if args.dry_run:
                print(f"\n[{num}] Found {len(replacements)} page ref(s):")
                print(f"  Before: {text[:100]}...")
                print(f"  After:  {new_text[:100]}...")

    print(f"\nTotal: {len(total_replacements)} footnotes with page references")
    print(f"Total replacements: {sum(len(r[1]) for r in total_replacements)}")

    if not args.dry_run:
        with open(args.footnotes, 'w', encoding='utf-8') as f:
            json.dump(modified_footnotes, f, ensure_ascii=False, indent=2)
        print(f"\nSaved to {args.footnotes}")
    else:
        print("\n(Dry run - no changes made)")


if __name__ == "__main__":
    main()
