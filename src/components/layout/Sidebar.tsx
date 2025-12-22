import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { tableOfContents } from '../../content';
import './Sidebar.css';

interface SidebarProps {
  currentSectionId?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ currentSectionId, isOpen = false, onClose }: SidebarProps) {
  const location = useLocation();
  const [expandedVolumes, setExpandedVolumes] = useState<Set<string>>(() => {
    if (currentSectionId) {
      const volumeId = currentSectionId.split('-')[0];
      return new Set([volumeId]);
    }
    return new Set(['1']);
  });

  // Закрываем sidebar при навигации на мобильных
  useEffect(() => {
    if (onClose) {
      onClose();
    }
  }, [location.pathname]);

  const toggleVolume = (volumeId: string) => {
    setExpandedVolumes((prev) => {
      const next = new Set(prev);
      if (next.has(volumeId)) {
        next.delete(volumeId);
      } else {
        next.add(volumeId);
      }
      return next;
    });
  };

  return (
    <>
      {/* Overlay для мобильных */}
      <div
        className={`sidebar__overlay ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
      />

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Кнопка закрытия для мобильных */}
        <button className="sidebar__close" onClick={onClose} aria-label="Закрыть меню">
          ×
        </button>

        <div className="sidebar__header">
          <h2>Оглавление</h2>
        </div>
        <nav className="sidebar__nav">
          {tableOfContents.volumes.map((volume) => (
            <div key={volume.id} className="sidebar__volume">
              <button
                className={`sidebar__volume-title ${expandedVolumes.has(volume.id) ? 'expanded' : ''}`}
                onClick={() => toggleVolume(volume.id)}
              >
                <span className="sidebar__volume-icon">
                  {expandedVolumes.has(volume.id) ? '▼' : '▶'}
                </span>
                {volume.title}
              </button>

              {expandedVolumes.has(volume.id) && (
                <ul className="sidebar__sections">
                  {volume.sections.map((section) => (
                    <li key={section.id}>
                      <NavLink
                        to={`/read/${section.id}`}
                        className={({ isActive }) =>
                          `sidebar__section-link ${isActive ? 'active' : ''}`
                        }
                      >
                        {section.title}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
