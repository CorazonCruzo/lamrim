import { useState, useCallback } from 'react';
import { useNotes } from '../../contexts';
import { NoteEditor } from './NoteEditor';
import { NoteCard } from './NoteCard';
import { exportSectionNotesToPdf } from '../../lib/pdf-export';
import { getSectionById } from '../../content';
import type { Note } from '../../types';
import './NotesList.css';

interface NotesListProps {
  sectionId: string;
}

export function NotesList({ sectionId }: NotesListProps) {
  const { getNotesBySection, addNote, updateNote, deleteNote } = useNotes();
  const [isEditing, setIsEditing] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  
  const notes = getNotesBySection(sectionId);

  const handleAddClick = () => {
    setEditingNote(null);
    setIsEditing(true);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setIsEditing(true);
  };

  const handleSave = useCallback((content: string) => {
    if (editingNote) {
      updateNote(editingNote.id, content);
    } else {
      addNote(sectionId, content);
    }
    setIsEditing(false);
    setEditingNote(null);
  }, [editingNote, sectionId, addNote, updateNote]);

  const handleCancel = () => {
    setIsEditing(false);
    setEditingNote(null);
  };

  const handleDelete = useCallback((noteId: string) => {
    deleteNote(noteId);
    if (editingNote?.id === noteId) {
      setIsEditing(false);
      setEditingNote(null);
    }
  }, [editingNote, deleteNote]);

  const handleExport = async () => {
    if (notes.length === 0) return;
    const result = getSectionById(sectionId);
    const sectionTitle = result?.section.title || 'Раздел';
    try {
      await exportSectionNotesToPdf(notes, sectionTitle);
    } catch (error) {
      console.error('Failed to export notes:', error);
    }
  };

  return (
    <div className="notes-list">
      <div className="notes-list__header">
        <h3 className="notes-list__title">
          Заметки {notes.length > 0 && <span className="notes-list__count">({notes.length})</span>}
        </h3>
        <div className="notes-list__actions">
          {notes.length > 0 && !isEditing && (
            <button className="notes-list__export-btn" onClick={handleExport} title="Экспорт в PDF">
              PDF
            </button>
          )}
          {!isEditing && (
            <button className="notes-list__add-btn" onClick={handleAddClick}>
              + Добавить заметку
            </button>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="notes-list__editor">
          <NoteEditor
            initialContent={editingNote?.content || ''}
            onSave={handleSave}
            onCancel={handleCancel}
            onDelete={editingNote ? () => handleDelete(editingNote.id) : undefined}
            autoSave={false}
          />
        </div>
      )}

      {notes.length > 0 ? (
        <div className="notes-list__items">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={handleEditNote}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        !isEditing && (
          <p className="notes-list__empty">
            Пока нет заметок к этому разделу
          </p>
        )
      )}
    </div>
  );
}
