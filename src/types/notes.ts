export type SectionStatus = 'locked' | 'available' | 'reading' | 'completed';

export interface SectionProgress {
  sectionId: string;
  status: SectionStatus;
  startedAt?: Date;
  completedAt?: Date;
}

export interface Note {
  id: string;
  sectionId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}
