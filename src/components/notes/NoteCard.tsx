import { useState } from 'react';
import { ConfirmDialog } from '../common';
import { NoteContent } from './NoteContent';
import type { Note } from '../../types';
import './NoteCard.css';

interface NoteCardProps {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (noteId: string) => void;
}

function formatDate(date: Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function NoteCard({ note, onEdit, onDelete }: NoteCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="note-card">
      <div className="note-card__header">
        <span className="note-card__date">{formatDate(note.updatedAt)}</span>
        <div className="note-card__actions">
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
