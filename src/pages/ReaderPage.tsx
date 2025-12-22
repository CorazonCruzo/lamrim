import { useParams } from 'react-router-dom';

export default function ReaderPage() {
  const { sectionId } = useParams<{ sectionId: string }>();

  return (
    <div className="reader-page">
      <h1>Читалка</h1>
      <p>Раздел: {sectionId || 'не выбран'}</p>
    </div>
  );
}
