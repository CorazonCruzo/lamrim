import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import './ReaderView.css';

interface ReaderViewProps {
  content: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function markdownLinksToHtml(text: string): string {
  return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function transformFootnotes(text: string): string {
  const parts = text.split(/\n---\n/);

  if (parts.length < 2) {
    return text.replace(
      /\[\^(\d+)\]/g,
      '<sup id="fnref-$1" class="footnote-ref"><a href="#fn-$1">$1</a></sup>'
    );
  }

  let mainContent = parts[0];
  const footnotesSection = parts.slice(1).join('\n---\n');

  const footnotesMap: Record<string, string> = {};
  const fnRegex = /\[\^(\d+)\]:\s*([\s\S]*?)(?=\n\n\[\^\d+\]:|$)/g;
  let match;
  while ((match = fnRegex.exec(footnotesSection)) !== null) {
    footnotesMap[match[1]] = match[2].trim();
  }

  mainContent = mainContent.replace(
    /\[\^(\d+)\]/g,
    (_, num) => {
      const footnoteText = footnotesMap[num] || '';
      const processedText = markdownLinksToHtml(escapeHtml(footnoteText));
      return `<sup id="fnref-${num}" class="footnote-ref"><a href="#fn-${num}">${num}</a><span class="footnote-tooltip"><span class="footnote-tooltip-scroll"><span class="footnote-tooltip-num">${num}</span>${processedText}</span></span></sup>`;
    }
  );

  const processedFootnotes = footnotesSection.replace(
    /\[\^(\d+)\]:\s*([\s\S]*?)(?=\n\n\[\^\d+\]:|$)/g,
    (_, num, fnText) => {
      const cleanText = markdownLinksToHtml(fnText.trim());
      return `<div id="fn-${num}" class="footnote-def"><a href="#fnref-${num}" class="footnote-backref" title="Вернуться к тексту">↩</a> <span class="footnote-num">${num}</span> ${cleanText}</div>\n\n`;
    }
  );

  return mainContent + '\n\n<div class="footnotes-section">\n\n' + processedFootnotes + '\n</div>';
}

export default function ReaderView({ content }: ReaderViewProps) {
  const processedContent = transformFootnotes(content);

  return (
    <article className="reader-view">
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
      >
        {processedContent}
      </Markdown>
    </article>
  );
}
