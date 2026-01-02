import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSection } from '../hooks/useSection';
import { useProgress } from '../contexts';
import { ReaderView } from '../components/reader';
import { Sidebar } from '../components/layout';
import { NotesList } from '../components/notes';
import './ReaderPage.css';

export default function ReaderPage() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const { section, volume, content, isLoading, error, nextSection, prevSection } = useSection(sectionId);
  const { getSectionStatus, isBookmarked, markAsCompleted, markAsUnread, toggleBookmark } = useProgress();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const newValue = !prev;
      localStorage.setItem('sidebarCollapsed', String(newValue));
      return newValue;
    });
  };

  const status = sectionId ? getSectionStatus(sectionId) : 'available';
  const bookmarked = sectionId ? isBookmarked(sectionId) : false;

  const handleToggleCompleted = () => {
    if (sectionId) {
      if (status === 'completed') {
        markAsUnread(sectionId);
      } else {
        markAsCompleted(sectionId);
      }
    }
  };

  const handleToggleBookmark = () => {
    if (sectionId) {
      toggleBookmark(sectionId);
    }
  };

  return (
    <div className="reader-layout">
      <Sidebar
        currentSectionId={sectionId}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebarCollapse}
      />

      <div className="reader-page">
        <button
          className="reader-menu-btn"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Открыть оглавление"
        >
          ☰ Оглавление
        </button>

        {isLoading ? (
          <div className="reader-loading">Загрузка...</div>
        ) : error || !section || !content ? (
          <div className="reader-error">
            <h1>Раздел не найден</h1>
            <p>{error || 'Запрошенный раздел не существует.'}</p>
            <Link to="/" className="btn-primary">
              На главную
            </Link>
          </div>
        ) : (
          <>
            <div className="reader-header">
              <div className="reader-breadcrumb">
                <Link to="/">Главная</Link>
                <span className="separator">/</span>
                <span>{volume?.title}</span>
                <span className="separator">/</span>
                <span>{section.title}</span>
              </div>

              <div className="reader-controls">
                <button
                  className={`reader-control--bookmark ${bookmarked ? 'active' : ''}`}
                  onClick={handleToggleBookmark}
                  data-tooltip={bookmarked ? 'Убрать закладку' : 'Добавить закладку'}
                >
                  ⚑
                </button>
                <button
                  className={`reader-control--status ${status === 'completed' ? 'completed' : ''}`}
                  onClick={handleToggleCompleted}
                  data-tooltip={status === 'completed' ? 'Отменить' : 'Прочитано'}
                >
                  {status === 'completed' ? '✓' : '○'}
                </button>
              </div>
            </div>

            <ReaderView content={content} />

            {sectionId && <NotesList sectionId={sectionId} />}

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
          </>
        )}
      </div>
    </div>
  );
}
