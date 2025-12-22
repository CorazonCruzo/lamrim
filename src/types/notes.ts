export type SectionStatus = 'available' | 'completed';

export interface SectionProgress {
  sectionId: string;
  status: SectionStatus;
  bookmarked?: boolean;
  completedAt?: Date;
}

export interface Note {
  id: string;
  sectionId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}
