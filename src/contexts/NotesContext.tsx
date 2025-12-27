import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  subscribeToNotes,
  saveNote,
  deleteNoteFromFirestore,
  migrateNotesToFirestore,
} from '../lib/firestore';
import { isFirebaseConfigured } from '../lib/firebase';
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

function loadLocalNotes(): NotesState {
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

function saveLocalNotes(notes: NotesState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (e) {
    console.error('Failed to save notes:', e);
  }
}

export function NotesProvider({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const [notesState, setNotesState] = useState<NotesState>(loadLocalNotes);

  const isAuthenticated = status === 'authenticated' && user && !user.isAnonymous;
  const useFirestore = isFirebaseConfigured() && isAuthenticated && user;

  useEffect(() => {
    if (!useFirestore || !user) return;

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    const setupSync = async () => {
      const localNotes = loadLocalNotes();
      const localNotesArray = Object.values(localNotes);

      if (localNotesArray.length > 0) {
        try {
          await migrateNotesToFirestore(user.uid, localNotesArray);
        } catch (error) {
          console.error('Notes migration failed:', error);
        }
      }

      if (cancelled) return;

      unsubscribe = subscribeToNotes(user.uid, (firestoreNotes) => {
        if (cancelled) return;
        const notesMap: NotesState = {};
        firestoreNotes.forEach((note) => {
          notesMap[note.id] = note;
        });
        setNotesState(notesMap);
      });
    };

    setupSync();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [useFirestore, user]);

  // Always save to localStorage as cache for fast initial load
  useEffect(() => {
    saveLocalNotes(notesState);
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
    const now = new Date();
    const note: Note = {
      id: generateId(),
      sectionId,
      content,
      createdAt: now,
      updatedAt: now,
    };

    setNotesState((prev) => ({
      ...prev,
      [note.id]: note,
    }));

    if (useFirestore && user) {
      saveNote(user.uid, note).catch(console.error);
    }

    return note;
  }, [useFirestore, user]);

  const updateNote = useCallback((noteId: string, content: string) => {
    setNotesState((prev) => {
      const note = prev[noteId];
      if (!note) return prev;

      const updatedNote = {
        ...note,
        content,
        updatedAt: new Date(),
      };

      if (useFirestore && user) {
        saveNote(user.uid, updatedNote).catch(console.error);
      }

      return {
        ...prev,
        [noteId]: updatedNote,
      };
    });
  }, [useFirestore, user]);

  const deleteNote = useCallback((noteId: string) => {
    setNotesState((prev) => {
      const newNotes = { ...prev };
      delete newNotes[noteId];
      return newNotes;
    });

    if (useFirestore && user) {
      deleteNoteFromFirestore(user.uid, noteId).catch(console.error);
    }
  }, [useFirestore, user]);

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
