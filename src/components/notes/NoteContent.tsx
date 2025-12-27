import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import './NoteContent.css';

interface NoteContentProps {
  content: string;
}

// Convert leading spaces to non-breaking spaces so they're preserved
function preserveLeadingSpaces(content: string): string {
  return content
    .split('\n')
    .map((line) => {
      const match = line.match(/^( +)/);
      if (match) {
        const spaces = match[1];
        const nbsp = '\u00A0'.repeat(spaces.length);
        return nbsp + line.slice(spaces.length);
      }
      return line;
    })
    .join('\n');
}

export function NoteContent({ content }: NoteContentProps) {
  const processedContent = preserveLeadingSpaces(content);

  return (
    <div className="note-content">
      <ReactMarkdown remarkPlugins={[remarkBreaks]} rehypePlugins={[rehypeRaw]}>
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
