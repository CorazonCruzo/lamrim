import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Note } from '../types';

interface NotesState {
  [noteId: string]: Note;
}

interface NotesContextType {
  notes: Note[];
  getNotesBySection: (sectionId: string) => Note[];
  getNote: (noteId: string) => Note | undefined;
  addNote: (sectionId: string, content: string) => Note;
  updateNote: (noteId: string, content: string) => void;
  deleteNote: (noteId: string) => void;
}

const NotesContext = createContext<NotesContextType | null>(null);

const STORAGE_KEY = 'lamrim-notes';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function loadNotes(): NotesState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load notes:', e);
  }
  return {};
}

function saveNotes(notes: NotesState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (e) {
    console.error('Failed to save notes:', e);
  }
}

export function NotesProvider({ children }: { children: ReactNode }) {
  const [notesState, setNotesState] = useState<NotesState>(loadNotes);

  useEffect(() => {
    saveNotes(notesState);
  }, [notesState]);

  const notes = Object.values(notesState).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const getNotesBySection = useCallback((sectionId: string): Note[] => {
    return Object.values(notesState)
      .filter((note) => note.sectionId === sectionId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [notesState]);

  const getNote = useCallback((noteId: string): Note | undefined => {
    return notesState[noteId];
  }, [notesState]);

  const addNote = useCallback((sectionId: string, content: string): Note => {
    const now = new Date().toISOString();
    const note: Note = {
      id: generateId(),
      sectionId,
      content,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
    setNotesState((prev) => ({
      ...prev,
      [note.id]: note,
    }));
    return note;
  }, []);

  const updateNote = useCallback((noteId: string, content: string) => {
    setNotesState((prev) => {
      const note = prev[noteId];
      if (!note) return prev;
      return {
        ...prev,
        [noteId]: {
          ...note,
          content,
          updatedAt: new Date(),
        },
      };
    });
  }, []);

  const deleteNote = useCallback((noteId: string) => {
    setNotesState((prev) => {
      const newNotes = { ...prev };
      delete newNotes[noteId];
      return newNotes;
    });
  }, []);

  return (
    <NotesContext.Provider
      value={{
        notes,
        getNotesBySection,
        getNote,
        addNote,
        updateNote,
        deleteNote,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes(): NotesContextType {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
}
