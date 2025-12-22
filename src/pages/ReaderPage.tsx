import { useParams, Link } from 'react-router-dom';
import { useSection } from '../hooks/useSection';
import { ReaderView } from '../components/reader';
import './ReaderPage.css';

export default function ReaderPage() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const { section, volume, content, isLoading, error, nextSection, prevSection } = useSection(sectionId);

  if (isLoading) {
    return (
      <div className="reader-page">
        <div className="reader-loading">Загрузка...</div>
      </div>
    );
  }

  if (error || !section || !content) {
    return (
      <div className="reader-page">
        <div className="reader-error">
          <h1>Раздел не найден</h1>
          <p>{error || 'Запрошенный раздел не существует.'}</p>
          <Link to="/" className="btn-primary">
            На главную
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="reader-page">
      <div className="reader-breadcrumb">
        <Link to="/">Главная</Link>
        <span className="separator">/</span>
        <span>{volume?.title}</span>
        <span className="separator">/</span>
        <span>{section.title}</span>
      </div>

      <ReaderView content={content} />

      <nav className="reader-navigation">
        {prevSection ? (
          <Link to={`/read/${prevSection.id}`} className="nav-prev">
            ← {prevSection.title}
          </Link>
        ) : (
          <span className="nav-placeholder" />
        )}

        {nextSection ? (
          <Link to={`/read/${nextSection.id}`} className="nav-next">
            {nextSection.title} →
          </Link>
        ) : (
          <span className="nav-placeholder" />
        )}
      </nav>
    </div>
  );
}
