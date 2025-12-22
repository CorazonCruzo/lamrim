import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './ReaderView.css';

interface ReaderViewProps {
  content: string;
}

export default function ReaderView({ content }: ReaderViewProps) {
  return (
    <article className="reader-view">
      <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
    </article>
  );
}
