import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import './ReaderView.css';

interface ReaderViewProps {
  content: string;
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
  let footnotesSection = parts.slice(1).join('\n---\n');

  mainContent = mainContent.replace(
    /\[\^(\d+)\]/g,
    '<sup id="fnref-$1" class="footnote-ref"><a href="#fn-$1" title="Перейти к примечанию $1">$1</a></sup>'
  );

  footnotesSection = footnotesSection.replace(
    /\[\^(\d+)\]:\s*([\s\S]*?)(?=\n\n\[\^\d+\]:|$)/g,
    (_, num, text) => {
      const cleanText = text.trim();
      return `<div id="fn-${num}" class="footnote-def"><a href="#fnref-${num}" class="footnote-backref" title="Вернуться к тексту">↩</a> <span class="footnote-num">${num}</span> ${cleanText}</div>\n\n`;
    }
  );

  return mainContent + '\n\n<div class="footnotes-section">\n\n' + footnotesSection + '\n</div>';
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
