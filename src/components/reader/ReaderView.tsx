import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import './ReaderView.css';

interface ReaderViewProps {
  content: string;
}

function transformFootnotes(text: string): string {
  return text.replace(/\[\^(\d+)\]/g, '<sup class="footnote-ref">$1</sup>');
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
