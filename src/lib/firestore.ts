import {
  collection,
  doc,
  getDoc,
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
  statusUpdatedAt: string;
  bookmarked?: boolean;
  bookmarkUpdatedAt?: string;
}

export type ProgressState = Record<string, ProgressEntry>;

function getTimestamp(entry: ProgressEntry & { updatedAt?: string }, field: 'status' | 'bookmark'): number {
  if (field === 'status') {
    const ts = entry.statusUpdatedAt || entry.updatedAt;
    return ts ? new Date(ts).getTime() : 0;
  } else {
    const ts = entry.bookmarkUpdatedAt || entry.updatedAt;
    return ts ? new Date(ts).getTime() : 0;
  }
}

export function mergeProgressByTimestamp(
  local: ProgressState,
  remote: ProgressState
): ProgressState {
  const allSectionIds = new Set([
    ...Object.keys(local),
    ...Object.keys(remote),
  ]);

  const merged: ProgressState = {};

  for (const sectionId of allSectionIds) {
    const localEntry = local[sectionId];
    const remoteEntry = remote[sectionId];

    if (!remoteEntry) {
      merged[sectionId] = localEntry;
      continue;
    }

    if (!localEntry) {
      merged[sectionId] = remoteEntry;
      continue;
    }

    const localStatusTime = getTimestamp(localEntry, 'status');
    const remoteStatusTime = getTimestamp(remoteEntry, 'status');
    const localBookmarkTime = getTimestamp(localEntry, 'bookmark');
    const remoteBookmarkTime = getTimestamp(remoteEntry, 'bookmark');

    const statusFromLocal = localStatusTime >= remoteStatusTime;
    const bookmarkFromLocal = localBookmarkTime >= remoteBookmarkTime;

    merged[sectionId] = {
      status: statusFromLocal ? localEntry.status : remoteEntry.status,
      statusUpdatedAt: statusFromLocal
        ? (localEntry.statusUpdatedAt || new Date().toISOString())
        : (remoteEntry.statusUpdatedAt || new Date().toISOString()),
      bookmarked: bookmarkFromLocal ? localEntry.bookmarked : remoteEntry.bookmarked,
      bookmarkUpdatedAt: bookmarkFromLocal
        ? localEntry.bookmarkUpdatedAt
        : remoteEntry.bookmarkUpdatedAt,
    };
  }

  return merged;
}

function progressDoc(userId: string) {
  if (!db) throw new Error('Firestore not configured');
  return doc(db, 'users', userId, 'data', 'progress');
}

function cleanProgressForFirestore(progress: ProgressState): Record<string, Record<string, unknown>> {
  const cleaned: Record<string, Record<string, unknown>> = {};
  for (const [sectionId, entry] of Object.entries(progress)) {
    cleaned[sectionId] = {};
    for (const [key, value] of Object.entries(entry)) {
      if (value !== undefined) {
        cleaned[sectionId][key] = value;
      }
    }
  }
  return cleaned;
}

export async function fetchProgress(userId: string): Promise<ProgressState> {
  if (!db) return {};
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
  await setDoc(progressDoc(userId), cleanProgressForFirestore(progress));
}

export async function migrateProgressToFirestore(
  userId: string,
  localProgress: ProgressState
): Promise<ProgressState> {
  if (!db || Object.keys(localProgress).length === 0) return localProgress;

  const remoteProgress = await fetchProgress(userId);
  const merged = mergeProgressByTimestamp(localProgress, remoteProgress);

  await setDoc(progressDoc(userId), cleanProgressForFirestore(merged));
  return merged;
}
