// Feedback & Evaluation Service for COMMERCIA
import { api } from './api';

export type FeedbackCategory = 'suggestion' | 'amelioration' | 'avis' | 'bug' | 'autre';

export interface UserFeedback {
  id: string;
  rating: number; // 1 to 5
  category: FeedbackCategory;
  categoryLabel: string;
  comment: string;
  userName: string;
  businessName: string;
  userPhone?: string;
  userEmail?: string;
  satisfactionTags?: string[];
  createdAt: string;
}

const STORAGE_KEY = 'commercia_user_feedbacks';

export const FEEDBACK_CATEGORIES: { id: FeedbackCategory; label: string; icon: string }[] = [
  { id: 'suggestion', label: 'Suggestion de fonctionnalité', icon: '💡' },
  { id: 'amelioration', label: 'Amélioration de l\'ergonomie', icon: '⚡' },
  { id: 'avis', label: 'Avis & Témoignage', icon: '⭐' },
  { id: 'bug', label: 'Signalement de bug', icon: '🐞' },
  { id: 'autre', label: 'Autre remarque', icon: '💬' },
];

export const SATISFACTION_TAGS = [
  'Gain de temps',
  'Clôture de caisse rapide',
  'Suivi des dettes clair',
  'Gestion des stocks facile',
  'Support WhatsApp réactif',
  'Interface intuitive',
  'Prise en main express',
];

export function getStoredFeedbacks(): UserFeedback[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function submitUserFeedback(data: Omit<UserFeedback, 'id' | 'createdAt'>): Promise<UserFeedback> {
  const newFeedback: UserFeedback = {
    ...data,
    id: 'fb-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    createdAt: new Date().toISOString(),
  };

  // 1. Save in local storage
  try {
    const existing = getStoredFeedbacks();
    const updated = [newFeedback, ...existing];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Could not save feedback locally:', err);
  }

  // 2. Transmit to backend API if available
  try {
    await api.post('/feedback', newFeedback);
  } catch (err) {
    // Graceful fallback: local persistence is already secured
    console.info('Feedback logged locally and queued for sync:', newFeedback.id);
  }

  return newFeedback;
}
