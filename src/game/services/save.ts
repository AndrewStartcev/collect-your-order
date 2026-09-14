import type { Progress } from '../types';

const STORAGE_KEY = 'collect-your-order:v1';

export const DEFAULT_PROGRESS: Progress = {
  money: 0,
  rating: 4.5,
  xp: 0,
  completedOrders: 0,
  bestStreak: 0,
  nextOrderId: 1,
};

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };

    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      money: Number.isFinite(parsed.money) ? Number(parsed.money) : DEFAULT_PROGRESS.money,
      rating: Number.isFinite(parsed.rating) ? Number(parsed.rating) : DEFAULT_PROGRESS.rating,
      xp: Number.isFinite(parsed.xp) ? Number(parsed.xp) : DEFAULT_PROGRESS.xp,
      completedOrders: Number.isFinite(parsed.completedOrders)
        ? Number(parsed.completedOrders)
        : DEFAULT_PROGRESS.completedOrders,
      bestStreak: Number.isFinite(parsed.bestStreak) ? Number(parsed.bestStreak) : DEFAULT_PROGRESS.bestStreak,
      nextOrderId: Number.isFinite(parsed.nextOrderId) ? Number(parsed.nextOrderId) : DEFAULT_PROGRESS.nextOrderId,
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function saveProgress(progress: Progress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Prototype must remain playable even when storage is unavailable.
  }
}
