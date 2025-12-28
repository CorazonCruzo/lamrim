/**
 * FB2 to Markdown Parser for Lamrim Chenmo
 *
 * This script converts FB2 files to Markdown format with proper footnote linking.
 * FB2 is an XML-based ebook format commonly used for Russian books.
 *
 * Usage: npx tsx scripts/parse-fb2.ts <input.fb2> <volume-number>
 *
 * Features:
 * - Reads FB2 XML (handles windows-1251 encoding via iconv)
 * - Converts *N footnote markers to [^N] markdown syntax
 * - Extracts "Примечания" section into footnote definitions
 * - Converts <I> tags to italic markdown
 * - Preserves paragraph structure
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

interface Chapter {
  title: string;
  slug: string;
  content: string;
  order: number;
}

interface ParsedVolume {
  volumeNumber: string;
  title: string;
  chapters: Chapter[];
  footnotes: Map<string, string>;
}

/**
 * Read FB2 file, handling windows-1251 encoding
 */
function readFb2File(filePath: string): string {
  // Try reading as UTF-8 first
  let content = readFileSync(filePath, 'utf-8');

  // Check if it's windows-1251 encoded
  if (content.includes('encoding="windows-1251"')) {
    // Use iconv to convert
    try {
      const utf8Path = filePath.replace('.fb2', '_utf8_temp.fb2');
      execSync(`iconv -f windows-1251 -t utf-8 "${filePath}" > "${utf8Path}"`);
      content = readFileSync(utf8Path, 'utf-8');
      execSync(`rm "${utf8Path}"`);
    } catch {
      console.log('Note: iconv conversion failed, using original content');
    }
  }

  return content;
}

/**
 * Extract text content from XML, removing tags
 */
function stripTags(xml: string): string {
  return xml
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"');
}

/**
 * Convert FB2/HTML elements to Markdown
 */
function convertToMarkdown(text: string): string {
  let result = text;

  // Convert <I>text</I> to *text* with proper spacing
  result = result.replace(/<I>([^<]*)<\/I>/gi, ' *$1* ');

  // Convert <emphasis>text</emphasis> to *text*
  result = result.replace(/<emphasis>([^<]*)<\/emphasis>/gi, ' *$1* ');

  // Convert <strong>text</strong> to **text**
  result = result.replace(/<strong>([^<]*)<\/strong>/gi, ' **$1** ');

  // Convert footnote markers *N to [^N]
  result = result.replace(/\*(\d+)/g, '[^$1]');

  // Remove remaining XML/HTML tags
  result = result.replace(/<[^>]+>/g, '');

  // Clean up entities
  result = result.replace(/&lt;/g, '<');
  result = result.replace(/&gt;/g, '>');
  result = result.replace(/&amp;/g, '&');
  result = result.replace(/&quot;/g, '"');
  result = result.replace(/&nbsp;/g, ' ');

  // Clean up question marks (common encoding issues in FB2)
  result = result.replace(/\?/g, '—');

  // Clean up multiple spaces
  result = result.replace(/\s+/g, ' ');

  return result.trim();
}

/**
 * Check if a paragraph is a citation/quote (starts with quotation mark)
 */
function isQuoteParagraph(text: string): boolean {
  const trimmed = text.trim();
  // Russian quotes start with " or «
  // Check if starts with quote and ends with quote (or quote + punctuation)
  return (
    (trimmed.startsWith('"') || trimmed.startsWith('«')) &&
    (trimmed.endsWith('"') || trimmed.endsWith('»') ||
     trimmed.endsWith('".') || trimmed.endsWith('».') ||
     trimmed.endsWith('"—') || trimmed.endsWith('»—'))
  );
}

/**
 * Convert paragraph to blockquote if it's a citation
 */
function formatParagraph(text: string): string {
  if (isQuoteParagraph(text)) {
    // Add > prefix for blockquote, handle multi-line
    return '> ' + text;
  }
  return text;
}

/**
 * Parse footnotes from the "Примечания" section
 */
function parseFootnotes(content: string): Map<string, string> {
  const footnotes = new Map<string, string>();

  // Find the footnotes section
  const footnotesMatch = content.match(/<p>Примечания<\/p>([\s\S]*?)(?:<section>|<\/body>|$)/i);

  if (!footnotesMatch) {
    console.log('No footnotes section found');
    return footnotes;
  }

  const footnotesSection = footnotesMatch[1];

  // Extract each footnote: N. Note text
  const footnoteRegex = /<p>(\d+)\.\s*([\s\S]*?)<\/p>/g;
  let match;

  while ((match = footnoteRegex.exec(footnotesSection)) !== null) {
    const num = match[1];
    let noteText = match[2];
    noteText = convertToMarkdown(noteText);
    footnotes.set(num, noteText);
  }

  console.log(`Found ${footnotes.size} footnotes`);
  return footnotes;
}

/**
 * Extract paragraphs from FB2 body
 */
function extractParagraphs(content: string): string[] {
  const paragraphs: string[] = [];

  // Remove the footnotes section to avoid including it in main content
  const mainContent = content.replace(/<p>Примечания<\/p>[\s\S]*$/i, '');

  // Extract <p> tags
  const pRegex = /<p>([\s\S]*?)<\/p>/g;
  let match;

  while ((match = pRegex.exec(mainContent)) !== null) {
    const text = convertToMarkdown(match[1]);
    if (text.trim()) {
      paragraphs.push(text);
    }
  }

  return paragraphs;
}

/**
 * Create slug from Russian title
 */
function createSlug(title: string): string {
  const translitMap: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    ' ': '-', '.': '', ',': '', ':': '', ';': '', '!': '', '?': '',
    '(': '', ')': '', '[': '', ']': '', '"': '', "'": '', '«': '', '»': '',
  };

  return title
    .toLowerCase()
    .split('')
    .map((char) => translitMap[char] ?? char)
    .join('')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

/**
 * Clean up chapter title
 */
function cleanTitle(title: string): string {
  return title
    // Remove page numbers like "303б", "304а"
    .replace(/\s*\d+[абАБ]\s*$/g, '')
    .replace(/\s*\d+[абАБ]\s+/g, ' ')
    // Remove markdown formatting from titles
    .replace(/\*/g, '')
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if a line is a divider (series of dashes)
 */
function isDivider(text: string): boolean {
  const cleaned = text.replace(/\s/g, '');
  return /^[—–-]{3,}$/.test(cleaned);
}

/**
 * Detect chapter titles from content
 */
function detectChapters(paragraphs: string[]): Chapter[] {
  const chapters: Chapter[] = [];
  let currentChapter: Chapter | null = null;
  let contentBuffer: string[] = [];
  let order = 1;

  // Patterns that indicate chapter/section starts
  // Note: Only uppercase letters - lowercase like "а.", "б." are sub-points within text
  const chapterPatterns = [
    /^(?:Раздел|Глава|Часть)\s*\d*\.?\s*/i,
    /^\d+\.\s*\[/,  // "1. [Title]"
    /^[IVX]+\.\s/,  // "I. Title"
    /^[А-ЯAB]\.\s/,  // "А. Title" - only uppercase Russian or Latin
  ];

  // Skip patterns (table of contents, boilerplate, etc.)
  const skipPatterns = [
    /^Листы:/,
    /^Схема\s+\d+/,
    /^\d+\s+[А-Я]/,  // Table of contents entries
    /^Спасибо, что скачали/,
    /^Все книги автора/,
    /^Приятного чтения/,
    /^Эта же книга в других форматах/,
  ];

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i].trim();

    // Skip empty paragraphs
    if (!para) {
      continue;
    }

    // Skip divider lines completely
    if (isDivider(para)) {
      continue;
    }

    // Skip boilerplate
    if (skipPatterns.some((p) => p.test(para))) {
      continue;
    }

    // Check if this is a chapter heading
    const isUpperCase = para.length < 100 && para.toUpperCase() === para && para.length > 5;
    const matchesPattern = chapterPatterns.some((p) => p.test(para));
    const isChapterHeading = (matchesPattern || isUpperCase) && para.length < 150;

    if (isChapterHeading) {
      // Save previous chapter
      if (currentChapter && contentBuffer.length > 0) {
        currentChapter.content = contentBuffer.join('\n\n');
        chapters.push(currentChapter);
      }

      // Clean and create new chapter
      const cleanedTitle = cleanTitle(para);
      const slug = createSlug(cleanedTitle);

      // Skip chapters with empty slugs (dividers that slipped through)
      if (!slug) {
        continue;
      }

      currentChapter = {
        title: cleanedTitle,
        slug: slug,
        content: '',
        order: order++,
      };
      contentBuffer = [];
    } else if (currentChapter) {
      // Format paragraph (convert quotes to blockquotes)
      contentBuffer.push(formatParagraph(para));
    } else {
      // Content before first chapter - create intro
      if (!currentChapter) {
        currentChapter = {
          title: 'Введение',
          slug: 'introduction',
          content: '',
          order: order++,
        };
      }
      contentBuffer.push(formatParagraph(para));
    }
  }

  // Save last chapter
  if (currentChapter && contentBuffer.length > 0) {
    currentChapter.content = contentBuffer.join('\n\n');
    chapters.push(currentChapter);
  }

  return chapters;
}

/**
 * Add footnote definitions to chapter content
 */
function addFootnotesToChapter(
  content: string,
  footnotes: Map<string, string>
): string {
  // Find all footnote references in this chapter
  const refs = new Set<string>();
  const refRegex = /\[\^(\d+)\]/g;
  let match;

  while ((match = refRegex.exec(content)) !== null) {
    refs.add(match[1]);
  }

  if (refs.size === 0) {
    return content;
  }

  // Build footnotes section
  let footnotesSection = '\n\n---\n\n';
  const sortedRefs = Array.from(refs)
    .map(Number)
    .sort((a, b) => a - b);

  for (const num of sortedRefs) {
    const noteText = footnotes.get(String(num));
    if (noteText) {
      footnotesSection += `[^${num}]: ${noteText}\n\n`;
    } else {
      console.warn(`Warning: Footnote ${num} referenced but not found`);
    }
  }

  return content + footnotesSection;
}

/**
 * Write chapter to markdown file
 */
function writeChapterFile(
  volumeNumber: string,
  chapter: Chapter,
  footnotes: Map<string, string>
): void {
  const volumeDir = join(projectRoot, 'src', 'content', 'volumes', `volume-${volumeNumber}`);

  // Ensure directory exists
  if (!existsSync(volumeDir)) {
    mkdirSync(volumeDir, { recursive: true });
  }

  // Build content with header and footnotes
  const paddedOrder = String(chapter.order).padStart(2, '0');
  const fileName = `${paddedOrder}-${chapter.slug}.md`;
  const filePath = join(volumeDir, fileName);

  let markdownContent = `# ${chapter.title}\n\n`;
  markdownContent += addFootnotesToChapter(chapter.content, footnotes);

  writeFileSync(filePath, markdownContent, 'utf-8');
  console.log(`  Written: ${fileName}`);
}

/**
 * Main parsing function
 */
function parseFb2(inputPath: string, volumeNumber: string): ParsedVolume {
  console.log(`\nParsing FB2 file: ${inputPath}`);
  console.log(`Volume number: ${volumeNumber}\n`);

  // Read and parse FB2
  const content = readFb2File(inputPath);

  // Extract title
  const titleMatch = content.match(/<book-title>([^<]+)<\/book-title>/);
  const title = titleMatch ? stripTags(titleMatch[1]) : `Том ${volumeNumber}`;

  // Parse footnotes
  const footnotes = parseFootnotes(content);

  // Extract body content
  const bodyMatch = content.match(/<body>([\s\S]*?)<\/body>/);
  if (!bodyMatch) {
    throw new Error('No <body> tag found in FB2 file');
  }

  // Extract paragraphs
  const paragraphs = extractParagraphs(bodyMatch[1]);
  console.log(`Found ${paragraphs.length} paragraphs`);

  // Detect chapters
  const chapters = detectChapters(paragraphs);
  console.log(`Detected ${chapters.length} chapters\n`);

  return {
    volumeNumber,
    title,
    chapters,
    footnotes,
  };
}

/**
 * Write volume metadata
 */
function writeVolumeMeta(volumeNumber: string, title: string): void {
  const volumeDir = join(projectRoot, 'src', 'content', 'volumes', `volume-${volumeNumber}`);

  if (!existsSync(volumeDir)) {
    mkdirSync(volumeDir, { recursive: true });
  }

  const meta = {
    id: volumeNumber,
    title: title,
    description: '',
  };

  writeFileSync(join(volumeDir, '_meta.json'), JSON.stringify(meta, null, 2), 'utf-8');
  console.log(`Written: _meta.json`);
}

/**
 * Main entry point
 */
function main(): void {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: npx tsx scripts/parse-fb2.ts <input.fb2> <volume-number>');
    console.log('\nExample: npx tsx scripts/parse-fb2.ts /tmp/lamrim_4.fb2 4');
    process.exit(1);
  }

  const [inputPath, volumeNumber] = args;

  if (!existsSync(inputPath)) {
    console.error(`Error: File not found: ${inputPath}`);
    process.exit(1);
  }

  try {
    const parsed = parseFb2(inputPath, volumeNumber);

    // Write volume metadata
    writeVolumeMeta(volumeNumber, parsed.title);

    // Write chapters
    console.log('\nWriting chapter files:');
    for (const chapter of parsed.chapters) {
      writeChapterFile(volumeNumber, chapter, parsed.footnotes);
    }

    console.log(`\nDone! Written ${parsed.chapters.length} chapters to volume-${volumeNumber}/`);

    // Output section definitions for index.ts
    console.log('\n--- Add to src/content/index.ts ---\n');
    console.log(`{
  id: '${volumeNumber}',
  title: '${parsed.title}',
  description: '',
  sections: [`);

    for (const chapter of parsed.chapters) {
      console.log(`    {
      id: '${volumeNumber}-${String(chapter.order).padStart(2, '0')}',
      volumeId: '${volumeNumber}',
      title: '${chapter.title.replace(/'/g, "\\'")}',
      slug: '${chapter.slug}',
      order: ${chapter.order},
    },`);
    }

    console.log(`  ],
},`);
  } catch (error) {
    console.error('Error parsing FB2:', error);
    process.exit(1);
  }
}

main();
