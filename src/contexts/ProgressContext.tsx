import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  subscribeToProgress,
  saveProgress as saveProgressToFirestore,
  migrateProgressToFirestore,
  type ProgressState,
} from '../lib/firestore';
import { isFirebaseConfigured } from '../lib/firebase';
import type { SectionStatus } from '../types';
import { tableOfContents } from '../content';

interface ProgressContextType {
  progress: ProgressState;
  getSectionStatus: (sectionId: string) => SectionStatus;
  isBookmarked: (sectionId: string) => boolean;
  markAsCompleted: (sectionId: string) => void;
  markAsUnread: (sectionId: string) => void;
  toggleBookmark: (sectionId: string) => void;
  resetProgress: () => void;
  completedCount: number;
  totalCount: number;
}

const ProgressContext = createContext<ProgressContextType | null>(null);

const STORAGE_KEY = 'lamrim-progress';

function loadLocalProgress(): ProgressState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load progress:', e);
  }
  return {};
}

function saveLocalProgress(progress: ProgressState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save progress:', e);
  }
}

function clearLocalProgress(): void {
  localStorage.removeItem(STORAGE_KEY);
}

function getTotalSections(): number {
  return tableOfContents.volumes.reduce(
    (total, volume) => total + volume.sections.length,
    0
  );
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const [progress, setProgress] = useState<ProgressState>(loadLocalProgress);

  const isAuthenticated = status === 'authenticated' && user && !user.isAnonymous;
  const useFirestore = isFirebaseConfigured() && isAuthenticated && user;

  useEffect(() => {
    if (!useFirestore || !user) return;

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    const setupSync = async () => {
      const localProgress = loadLocalProgress();

      if (Object.keys(localProgress).length > 0) {
        try {
          await migrateProgressToFirestore(user.uid, localProgress);
          if (!cancelled) {
            clearLocalProgress();
          }
        } catch (error) {
          console.error('Progress migration failed:', error);
        }
      }

      if (cancelled) return;

      unsubscribe = subscribeToProgress(user.uid, (firestoreProgress) => {
        if (cancelled) return;
        setProgress(firestoreProgress);
      });
    };

    setupSync();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [useFirestore, user]);

  // Save to localStorage when not using Firestore
  useEffect(() => {
    if (!useFirestore) {
      saveLocalProgress(progress);
    }
  }, [progress, useFirestore]);

  // Helper to update progress and sync to Firestore
  const updateProgress = useCallback((updater: (prev: ProgressState) => ProgressState) => {
    setProgress((prev) => {
      const newProgress = updater(prev);
      if (useFirestore && user) {
        saveProgressToFirestore(user.uid, newProgress).catch(console.error);
      }
      return newProgress;
    });
  }, [useFirestore, user]);

  const getSectionStatus = useCallback((sectionId: string): SectionStatus => {
    return progress[sectionId]?.status || 'available';
  }, [progress]);

  const isBookmarked = useCallback((sectionId: string): boolean => {
    return progress[sectionId]?.bookmarked || false;
  }, [progress]);

  const markAsCompleted = useCallback((sectionId: string) => {
    updateProgress((prev) => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        status: 'completed',
        completedAt: new Date().toISOString(),
      },
    }));
  }, [updateProgress]);

  const markAsUnread = useCallback((sectionId: string) => {
    updateProgress((prev) => {
      const current = prev[sectionId];
      if (current?.bookmarked) {
        return {
          ...prev,
          [sectionId]: {
            status: 'available',
            bookmarked: true,
          },
        };
      }
      const newProgress = { ...prev };
      delete newProgress[sectionId];
      return newProgress;
    });
  }, [updateProgress]);

  const toggleBookmark = useCallback((sectionId: string) => {
    updateProgress((prev) => {
      const current = prev[sectionId];
      const newBookmarked = !current?.bookmarked;

      if (!newBookmarked && (!current?.status || current.status === 'available')) {
        const newProgress = { ...prev };
        delete newProgress[sectionId];
        return newProgress;
      }

      return {
        ...prev,
        [sectionId]: {
          ...current,
          status: current?.status || 'available',
          bookmarked: newBookmarked,
        },
      };
    });
  }, [updateProgress]);

  const resetProgress = useCallback(() => {
    updateProgress(() => ({}));
  }, [updateProgress]);

  const completedCount = Object.values(progress).filter(
    (p) => p.status === 'completed'
  ).length;

  const totalCount = getTotalSections();

  return (
    <ProgressContext.Provider
      value={{
        progress,
        getSectionStatus,
        isBookmarked,
        markAsCompleted,
        markAsUnread,
        toggleBookmark,
        resetProgress,
        completedCount,
        totalCount,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress(): ProgressContextType {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
}
