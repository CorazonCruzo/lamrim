import { useState, useRef, useEffect, useCallback } from 'react';
import './NoteEditor.css';

interface NoteEditorProps {
  initialContent?: string;
  onSave: (content: string) => void;
  onCancel: () => void;
  onDelete?: () => void;
  autoSave?: boolean;
}

export function NoteEditor({
  initialContent = '',
  onSave,
  onCancel,
  onDelete,
  autoSave = true,
}: NoteEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasChanges = content.trim() !== initialContent.trim();

  useEffect(() => {
    if (!autoSave || !hasChanges) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (content.trim()) {
        setIsSaving(true);
        onSave(content);
        setTimeout(() => setIsSaving(false), 500);
      }
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, autoSave, hasChanges, onSave]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const insertMarkdown = useCallback((before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    const newContent =
      content.substring(0, start) +
      before +
      selectedText +
      after +
      content.substring(end);

    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      );
    }, 0);
  }, [content]);

  const handleBold = () => insertMarkdown('**', '**');
  const handleItalic = () => insertMarkdown('*', '*');
  const handleHeading = () => insertMarkdown('### ');
  const handleList = () => insertMarkdown('- ');
  const handleQuote = () => insertMarkdown('> ');

  const handleSave = () => {
    if (content.trim()) {
      onSave(content);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      handleBold();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
      e.preventDefault();
      handleItalic();
    }
  };

  return (
    <div className="note-editor">
      <div className="note-editor__toolbar">
        <div className="note-editor__format-buttons">
          <button
            type="button"
            className="note-editor__btn note-editor__btn--format"
            onClick={handleBold}
            title="Жирный (Ctrl+B)"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            className="note-editor__btn note-editor__btn--format"
            onClick={handleItalic}
            title="Курсив (Ctrl+I)"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            className="note-editor__btn note-editor__btn--format"
            onClick={handleHeading}
            title="Заголовок"
          >
            H
          </button>
          <button
            type="button"
            className="note-editor__btn note-editor__btn--format"
            onClick={handleList}
            title="Список"
          >
            •
          </button>
          <button
            type="button"
            className="note-editor__btn note-editor__btn--format"
            onClick={handleQuote}
            title="Цитата"
          >
            "
          </button>
        </div>
      </div>

      <div className="note-editor__content">
        <textarea
          ref={textareaRef}
          className="note-editor__textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Напишите заметку..."
        />
      </div>

      <div className="note-editor__footer">
        <div className="note-editor__status">
          {isSaving && <span className="note-editor__saving">Сохранение...</span>}
          {autoSave && hasChanges && !isSaving && (
            <span className="note-editor__unsaved">Несохранённые изменения</span>
          )}
        </div>
        <div className="note-editor__actions">
          {onDelete && (
            <button
              type="button"
              className="note-editor__btn note-editor__btn--delete"
              onClick={onDelete}
            >
              Удалить
            </button>
          )}
          <button
            type="button"
            className="note-editor__btn note-editor__btn--cancel"
            onClick={onCancel}
          >
            Отмена
          </button>
          <button
            type="button"
            className="note-editor__btn note-editor__btn--save"
            onClick={handleSave}
            disabled={!content.trim()}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
