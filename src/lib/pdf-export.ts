import { jsPDF } from 'jspdf';
import type { Note } from '../types';
import { getSectionById } from '../content';

interface ExportOptions {
  filenamePrefix?: string;
}

function formatDate(date: Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Strip markdown formatting for plain text
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
    .replace(/\*(.+?)\*/g, '$1') // Italic
    .replace(/^#+\s*/gm, '') // Headers
    .replace(/^>\s*/gm, '') // Blockquotes
    .replace(/^-\s*/gm, '• '); // Lists
}

async function loadCyrillicFont(doc: jsPDF): Promise<void> {
  const fontUrl = 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5WZLCzYlKw.ttf';

  try {
    const response = await fetch(fontUrl);
    const arrayBuffer = await response.arrayBuffer();

    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    doc.addFileToVFS('Roboto-Regular.ttf', base64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.setFont('Roboto');
  } catch (error) {
    console.warn('Failed to load Cyrillic font, using default:', error);
  }
}

// Helper to create safe filename (only letters, numbers, underscores)
function createFilename(prefix: string): string {
  const safe = prefix
    .replace(/[^a-zA-Zа-яА-ЯёЁ0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return `${safe || 'notes'}.pdf`;
}

export async function exportNotesToPdf(
  notes: Note[],
  options: ExportOptions = {}
): Promise<void> {
  if (notes.length === 0) {
    throw new Error('No notes to export');
  }

  const { filenamePrefix = 'Заметки' } = options;
  const filename = createFilename(filenamePrefix);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  await loadCyrillicFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const result = getSectionById(note.sectionId);
    const sectionTitle = result?.section.title || 'Неизвестный раздел';

    checkPageBreak(30);

    doc.setFontSize(12);
    doc.setTextColor(92, 107, 192); // #5C6BC0
    const sectionLines = doc.splitTextToSize(sectionTitle, contentWidth);
    doc.text(sectionLines, margin, y);
    y += sectionLines.length * 5 + 3;

    doc.setFontSize(9);
    doc.setTextColor(153, 153, 153);
    doc.text(formatDate(note.updatedAt), margin, y);
    y += 8;

    doc.setFontSize(11);
    doc.setTextColor(51, 51, 51);
    const plainText = stripMarkdown(note.content);
    const contentLines = doc.splitTextToSize(plainText, contentWidth);

    for (const line of contentLines) {
      checkPageBreak(6);
      doc.text(line, margin, y);
      y += 5;
    }

    if (i < notes.length - 1) {
      y += 5;
      checkPageBreak(10);
      doc.setDrawColor(221, 221, 221);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;
    }
  }

  doc.save(filename);
}

export async function exportSectionNotesToPdf(
  notes: Note[],
  sectionTitle: string
): Promise<void> {
  await exportNotesToPdf(notes, {
    filenamePrefix: sectionTitle,
  });
}

export async function exportAllNotesToPdf(notes: Note[]): Promise<void> {
  await exportNotesToPdf(notes, {
    filenamePrefix: 'Все_заметки',
  });
}

export async function exportSingleNoteToPdf(note: Note): Promise<void> {
  const result = getSectionById(note.sectionId);
  const sectionTitle = result?.section.title || 'Заметка';

  await exportNotesToPdf([note], {
    filenamePrefix: sectionTitle,
  });
}
