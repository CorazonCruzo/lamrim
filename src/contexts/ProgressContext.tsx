import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  subscribeToProgress,
  saveProgress as saveProgressToFirestore,
  migrateProgressToFirestore,
  mergeProgressByTimestamp,
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
          const merged = await migrateProgressToFirestore(user.uid, localProgress);
          if (!cancelled) {
            setProgress(merged);
          }
        } catch (error) {
          console.error('Progress migration failed:', error);
        }
      }

      if (cancelled) return;

      unsubscribe = subscribeToProgress(user.uid, (firestoreProgress) => {
        if (cancelled) return;
        setProgress((current) => mergeProgressByTimestamp(current, firestoreProgress));
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
    saveLocalProgress(progress);
  }, [progress]);

  // Helper to update progress and sync to Firestore
  const updateProgress = useCallback((updater: (prev: ProgressState) => ProgressState) => {
    setProgress((prev) => {
      const newProgress = updater(prev);

      if (useFirestore && user) {
        queueMicrotask(() => {
          saveProgressToFirestore(user.uid, newProgress).catch(console.error);
        });
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

  const getOldTimestamp = (entry: ProgressState[string] & { updatedAt?: string } | undefined): string | undefined => {
    return entry?.updatedAt;
  };

  const markAsCompleted = useCallback((sectionId: string) => {
    updateProgress((prev) => {
      const current = prev[sectionId] as ProgressState[string] & { updatedAt?: string } | undefined;
      return {
        ...prev,
        [sectionId]: {
          status: 'completed',
          statusUpdatedAt: new Date().toISOString(),
          bookmarked: current?.bookmarked,
          bookmarkUpdatedAt: current?.bookmarkUpdatedAt || getOldTimestamp(current),
        },
      };
    });
  }, [updateProgress]);

  const markAsUnread = useCallback((sectionId: string) => {
    updateProgress((prev) => {
      const current = prev[sectionId] as ProgressState[string] & { updatedAt?: string } | undefined;
      return {
        ...prev,
        [sectionId]: {
          status: 'available',
          statusUpdatedAt: new Date().toISOString(),
          bookmarked: current?.bookmarked,
          bookmarkUpdatedAt: current?.bookmarkUpdatedAt || getOldTimestamp(current),
        },
      };
    });
  }, [updateProgress]);

  const toggleBookmark = useCallback((sectionId: string) => {
    updateProgress((prev) => {
      const current = prev[sectionId] as ProgressState[string] & { updatedAt?: string } | undefined;
      return {
        ...prev,
        [sectionId]: {
          status: current?.status || 'available',
          statusUpdatedAt: current?.statusUpdatedAt || getOldTimestamp(current) || new Date().toISOString(),
          bookmarked: !current?.bookmarked,
          bookmarkUpdatedAt: new Date().toISOString(),
        },
      };
    });
  }, [updateProgress]);

  const resetProgress = useCallback(() => {
    updateProgress((prev) => {
      const now = new Date().toISOString();
      const reset: ProgressState = {};
      for (const sectionId of Object.keys(prev)) {
        const current = prev[sectionId] as ProgressState[string] & { updatedAt?: string } | undefined;
        reset[sectionId] = {
          status: 'available',
          statusUpdatedAt: now,
          bookmarked: current?.bookmarked,
          bookmarkUpdatedAt: current?.bookmarkUpdatedAt || getOldTimestamp(current),
        };
      }
      return reset;
    });
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
