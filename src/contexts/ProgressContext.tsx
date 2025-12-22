import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { SectionStatus } from '../types';
import { tableOfContents } from '../content';

interface ProgressState {
  [sectionId: string]: {
    status: SectionStatus;
    bookmarked?: boolean;
    completedAt?: string;
  };
}

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

function loadProgress(): ProgressState {
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

function saveProgress(progress: ProgressState): void {
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
  const [progress, setProgress] = useState<ProgressState>(loadProgress);

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  const getSectionStatus = useCallback((sectionId: string): SectionStatus => {
    return progress[sectionId]?.status || 'available';
  }, [progress]);

  const isBookmarked = useCallback((sectionId: string): boolean => {
    return progress[sectionId]?.bookmarked || false;
  }, [progress]);

  const markAsCompleted = useCallback((sectionId: string) => {
    setProgress((prev) => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        status: 'completed',
        completedAt: new Date().toISOString(),
      },
    }));
  }, []);

  const markAsUnread = useCallback((sectionId: string) => {
    setProgress((prev) => {
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
  }, []);

  const toggleBookmark = useCallback((sectionId: string) => {
    setProgress((prev) => {
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
  }, []);

  const resetProgress = useCallback(() => {
    setProgress({});
  }, []);

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
