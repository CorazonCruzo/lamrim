import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '../common';
import { NoteContent } from './NoteContent';
import { exportSingleNoteToPdf } from '../../lib/pdf-export';
import type { Note } from '../../types';
import './NoteCard.css';

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (noteId: string) => void;
  sectionTitle?: string;
  sectionLink?: string;
}

function formatDate(date: Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function NoteCard({ note, onEdit, onDelete, sectionTitle, sectionLink }: NoteCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleExport = async () => {
    try {
      await exportSingleNoteToPdf(note);
    } catch (error) {
      console.error('Failed to export note:', error);
    }
  };

  return (
    <div className="note-card">
      {sectionTitle && (
        <div className="note-card__section">
          {sectionLink ? (
            <Link to={sectionLink} className="note-card__section-link">{sectionTitle}</Link>
          ) : (
            <span>{sectionTitle}</span>
          )}
        </div>
      )}
      <div className="note-card__header">
        <span className="note-card__date">{formatDate(note.updatedAt)}</span>
        <div className="note-card__actions">
          <button
            className="note-card__btn"
            onClick={handleExport}
            title="Скачать PDF"
          >
            ⬇
          </button>
          <button
            className="note-card__btn"
            onClick={() => onEdit(note)}
            title="Редактировать"
          >
            ✎
          </button>
          <button
            className="note-card__btn note-card__btn--delete"
            onClick={() => setShowDeleteConfirm(true)}
            title="Удалить"
          >
            🗑
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Удаление заметки"
        message="Вы уверены, что хотите удалить эту заметку?"
        confirmText="Удалить"
        onConfirm={() => {
          onDelete(note.id);
          setShowDeleteConfirm(false);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <div className="note-card__content">
        <NoteContent content={note.content} />
      </div>
    </div>
  );
}
