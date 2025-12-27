import html2pdf from 'html2pdf.js';
import type { Note } from '../types';
import { getSectionById } from '../content';

interface ExportOptions {
  title?: string;
  includeDate?: boolean;
}

function formatDate(date: Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function markdownToHtml(markdown: string): string {
  // Simple markdown to HTML conversion
  return markdown
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Paragraphs
    .split('\n\n')
    .map((block) => {
      if (block.startsWith('<')) return block;
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    })
    .join('');
}

function createNotesHtml(notes: Note[], options: ExportOptions = {}): string {
  const { title = 'Мои заметки', includeDate = true } = options;
  const now = new Date().toLocaleDateString('ru-RU');

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Georgia', serif;
          font-size: 12pt;
          line-height: 1.6;
          color: #333;
          max-width: 700px;
          margin: 0 auto;
          padding: 40px 20px;
        }
        h1 {
          font-size: 24pt;
          margin-bottom: 10px;
          color: #222;
        }
        .export-date {
          font-size: 10pt;
          color: #666;
          margin-bottom: 30px;
        }
        .note {
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #ddd;
        }
        .note:last-child {
          border-bottom: none;
        }
        .note-section {
          font-size: 14pt;
          font-weight: bold;
          color: #5C6BC0;
          margin-bottom: 8px;
        }
        .note-date {
          font-size: 10pt;
          color: #999;
          margin-bottom: 12px;
        }
        .note-content {
          font-size: 11pt;
        }
        .note-content p {
          margin: 0 0 10px 0;
        }
        .note-content h1, .note-content h2, .note-content h3 {
          font-size: 12pt;
          margin: 15px 0 8px 0;
        }
        .note-content blockquote {
          margin: 10px 0;
          padding-left: 15px;
          border-left: 3px solid #ddd;
          color: #666;
        }
        .note-content ul, .note-content ol {
          margin: 10px 0;
          padding-left: 25px;
        }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(title)}</h1>
      ${includeDate ? `<div class="export-date">Экспортировано: ${now}</div>` : ''}
  `;

  for (const note of notes) {
    const result = getSectionById(note.sectionId);
    const sectionTitle = result?.section.title || 'Неизвестный раздел';

    html += `
      <div class="note">
        <div class="note-section">${escapeHtml(sectionTitle)}</div>
        <div class="note-date">${formatDate(note.updatedAt)}</div>
        <div class="note-content">${markdownToHtml(note.content)}</div>
      </div>
    `;
  }

  html += '</body></html>';
  return html;
}

export async function exportNotesToPdf(
  notes: Note[],
  filename: string = 'notes.pdf',
  options: ExportOptions = {}
): Promise<void> {
  if (notes.length === 0) {
    throw new Error('No notes to export');
  }

  const html = createNotesHtml(notes, options);

  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  document.body.appendChild(container);

  try {
    await html2pdf()
      .set({
        margin: [15, 15, 15, 15],
        filename,
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(container)
      .save();
  } finally {
    document.body.removeChild(container);
  }
}

export async function exportSectionNotesToPdf(
  notes: Note[],
  sectionTitle: string
): Promise<void> {
  const sanitizedTitle = sectionTitle.replace(/[^a-zA-Zа-яА-Я0-9 ]/g, '').trim();
  const filename = `notes-${sanitizedTitle || 'section'}.pdf`;

  await exportNotesToPdf(notes, filename, {
    title: `Заметки: ${sectionTitle}`,
    includeDate: true,
  });
}

export async function exportAllNotesToPdf(notes: Note[]): Promise<void> {
  const filename = `all-notes-${new Date().toISOString().split('T')[0]}.pdf`;

  await exportNotesToPdf(notes, filename, {
    title: 'Все заметки',
    includeDate: true,
  });
}
