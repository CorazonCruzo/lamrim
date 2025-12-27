import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useNotes } from '../contexts';
import { ConfirmDialog } from '../components/common';
import { NoteEditor, NoteContent } from '../components/notes';
import { tableOfContents, getSectionById } from '../content';
import { exportAllNotesToPdf } from '../lib/pdf-export';
import type { Note } from '../types';
import './NotesPage.css';

function formatDate(date: Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}


interface NoteWithSection extends Note {
  sectionTitle: string;
  volumeTitle: string;
}

export default function NotesPage() {
  const { notes, deleteNote, updateNote } = useNotes();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVolume, setSelectedVolume] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'section'>('date');
  const [editingNote, setEditingNote] = useState<NoteWithSection | null>(null);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

  const enrichedNotes = useMemo((): NoteWithSection[] => {
    return notes.map((note) => {
      const result = getSectionById(note.sectionId);
      return {
        ...note,
        sectionTitle: result?.section.title || 'Неизвестный раздел',
        volumeTitle: result?.volume.title || 'Неизвестный том',
      };
    });
  }, [notes]);

  const filteredNotes = useMemo(() => {
    let result = enrichedNotes;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (note) =>
          note.content.toLowerCase().includes(query) ||
          note.sectionTitle.toLowerCase().includes(query)
      );
    }

    if (selectedVolume !== 'all') {
      result = result.filter((note) => {
        const sectionResult = getSectionById(note.sectionId);
        return sectionResult?.volume.id === selectedVolume;
      });
    }

    if (sortBy === 'date') {
      result = [...result].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    } else {
      result = [...result].sort((a, b) => {
        const volumeCompare = a.volumeTitle.localeCompare(b.volumeTitle);
        if (volumeCompare !== 0) return volumeCompare;
        return a.sectionTitle.localeCompare(b.sectionTitle);
      });
    }

    return result;
  }, [enrichedNotes, searchQuery, selectedVolume, sortBy]);

  const handleStartEdit = (note: NoteWithSection) => {
    setEditingNote(note);
  };

  const handleSaveEdit = useCallback((content: string) => {
    if (editingNote) {
      updateNote(editingNote.id, content);
      setEditingNote(null);
    }
  }, [editingNote, updateNote]);

  const handleCancelEdit = () => {
    setEditingNote(null);
  };

  const handleDeleteFromEditor = useCallback(() => {
    if (editingNote) {
      setDeleteNoteId(editingNote.id);
    }
  }, [editingNote]);

  const handleDeleteRequest = (noteId: string) => {
    setDeleteNoteId(noteId);
  };

  const handleConfirmDelete = () => {
    if (deleteNoteId) {
      deleteNote(deleteNoteId);
      setDeleteNoteId(null);
    }
  };

  const handleExportAll = async () => {
    if (notes.length === 0) return;
    try {
      await exportAllNotesToPdf(notes);
    } catch (error) {
      console.error('Failed to export notes:', error);
    }
  };

  return (
    <div className="notes-page">
      <div className="notes-page__header">
        <h1 className="notes-page__title">Мои заметки</h1>
        {notes.length > 0 && (
          <button className="notes-page__export-btn" onClick={handleExportAll}>
            Экспорт в PDF
          </button>
        )}
      </div>

      {notes.length === 0 ? (
        <div className="notes-page__empty">
          <p>У вас пока нет заметок.</p>
          <p>Заметки можно добавлять при чтении разделов.</p>
          <Link to="/" className="notes-page__start-btn">
            Начать чтение
          </Link>
        </div>
      ) : (
        <>
          <div className="notes-page__filters">
            <div className="notes-page__search">
              <input
                type="text"
                placeholder="Поиск по заметкам..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="notes-page__search-input"
              />
            </div>

            <div className="notes-page__filter-group">
              <select
                value={selectedVolume}
                onChange={(e) => setSelectedVolume(e.target.value)}
                className="notes-page__select"
              >
                <option value="all">Все тома</option>
                {tableOfContents.volumes.map((volume) => (
                  <option key={volume.id} value={volume.id}>
                    {volume.title}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'section')}
                className="notes-page__select"
              >
                <option value="date">По дате</option>
                <option value="section">По разделу</option>
              </select>
            </div>
          </div>

          <div className="notes-page__stats">
            Найдено: {filteredNotes.length} из {notes.length}
          </div>

          <div className="notes-page__list">
            {filteredNotes.map((note) => (
              <div key={note.id} className="notes-page__item">
                <div className="notes-page__item-header">
                  <Link
                    to={`/read/${note.sectionId}`}
                    className="notes-page__section-link"
                  >
                    {note.sectionTitle}
                  </Link>
                  <span className="notes-page__date">{formatDate(note.updatedAt)}</span>
                </div>

                {editingNote?.id === note.id ? (
                  <div className="notes-page__edit">
                    <NoteEditor
                      initialContent={editingNote.content}
                      onSave={handleSaveEdit}
                      onCancel={handleCancelEdit}
                      onDelete={handleDeleteFromEditor}
                      autoSave={false}
                    />
                  </div>
                ) : (
                  <>
                    <div className="notes-page__item-content">
                      <NoteContent content={note.content} />
                    </div>

                    <div className="notes-page__item-actions">
                      <button
                        onClick={() => handleStartEdit(note)}
                        className="notes-page__action-btn"
                        title="Редактировать"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => handleDeleteRequest(note.id)}
                        className="notes-page__action-btn notes-page__action-btn--delete"
                        title="Удалить"
                      >
                        🗑
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={deleteNoteId !== null}
        title="Удаление заметки"
        message="Вы уверены, что хотите удалить эту заметку?"
        confirmText="Удалить"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteNoteId(null)}
      />
    </div>
  );
}
