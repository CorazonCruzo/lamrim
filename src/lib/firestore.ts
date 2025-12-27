import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Note, SectionStatus } from '../types';

// Notes

export interface FirestoreNote {
  sectionId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

function notesCollection(userId: string) {
  if (!db) throw new Error('Firestore not configured');
  return collection(db, 'users', userId, 'notes');
}

export async function fetchNotes(userId: string): Promise<Note[]> {
  const snapshot = await getDocs(notesCollection(userId));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: new Date(doc.data().createdAt),
    updatedAt: new Date(doc.data().updatedAt),
  })) as Note[];
}

export function subscribeToNotes(
  userId: string,
  callback: (notes: Note[]) => void
): Unsubscribe {
  return onSnapshot(notesCollection(userId), (snapshot) => {
    const notes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: new Date(doc.data().createdAt),
      updatedAt: new Date(doc.data().updatedAt),
    })) as Note[];
    callback(notes);
  });
}

export async function saveNote(userId: string, note: Note): Promise<void> {
  if (!db) throw new Error('Firestore not configured');
  const noteDoc = doc(db, 'users', userId, 'notes', note.id);
  await setDoc(noteDoc, {
    sectionId: note.sectionId,
    content: note.content,
    createdAt: note.createdAt instanceof Date ? note.createdAt.toISOString() : note.createdAt,
    updatedAt: note.updatedAt instanceof Date ? note.updatedAt.toISOString() : note.updatedAt,
  });
}

export async function deleteNoteFromFirestore(userId: string, noteId: string): Promise<void> {
  if (!db) throw new Error('Firestore not configured');
  const noteDoc = doc(db, 'users', userId, 'notes', noteId);
  await deleteDoc(noteDoc);
}

export async function migrateNotesToFirestore(userId: string, notes: Note[]): Promise<void> {
  if (!db || notes.length === 0) return;
  const batch = writeBatch(db);
  for (const note of notes) {
    const noteDoc = doc(db, 'users', userId, 'notes', note.id);
    batch.set(noteDoc, {
      sectionId: note.sectionId,
      content: note.content,
      createdAt: note.createdAt instanceof Date ? note.createdAt.toISOString() : note.createdAt,
      updatedAt: note.updatedAt instanceof Date ? note.updatedAt.toISOString() : note.updatedAt,
    });
  }
  await batch.commit();
}

// Progress

export interface ProgressEntry {
  status: SectionStatus;
  bookmarked?: boolean;
  completedAt?: string;
}

export type ProgressState = Record<string, ProgressEntry>;

function progressDoc(userId: string) {
  if (!db) throw new Error('Firestore not configured');
  return doc(db, 'users', userId, 'data', 'progress');
}

export async function fetchProgress(userId: string): Promise<ProgressState> {
  if (!db) return {};
  const { getDoc } = await import('firebase/firestore');
  const snapshot = await getDoc(progressDoc(userId));
  return (snapshot.data() as ProgressState) || {};
}

export function subscribeToProgress(
  userId: string,
  callback: (progress: ProgressState) => void
): Unsubscribe {
  return onSnapshot(progressDoc(userId), (snapshot) => {
    callback((snapshot.data() as ProgressState) || {});
  });
}

export async function saveProgress(userId: string, progress: ProgressState): Promise<void> {
  await setDoc(progressDoc(userId), progress);
}

export async function migrateProgressToFirestore(
  userId: string,
  progress: ProgressState
): Promise<void> {
  if (!db || Object.keys(progress).length === 0) return;
  await setDoc(progressDoc(userId), progress, { merge: true });
}
