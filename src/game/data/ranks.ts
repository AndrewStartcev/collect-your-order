import type { Rank } from '../types';

export const RANKS: Rank[] = [
  { id: 'trainee', title: 'Стажёр', minXp: 0 },
  { id: 'picker', title: 'Сборщик', minXp: 500 },
  { id: 'experienced', title: 'Опытный сборщик', minXp: 1200 },
  { id: 'expert', title: 'Эксперт', minXp: 2200 },
  { id: 'master', title: 'Мастер', minXp: 3500 },
  { id: 'top1', title: 'Сборщик №1', minXp: 5000 },
];

export function getRank(xp: number): Rank {
  let current = RANKS[0];
  for (const rank of RANKS) {
    if (xp >= rank.minXp) current = rank;
  }
  return current;
}

export function getNextRank(xp: number): Rank | null {
  return RANKS.find((rank) => rank.minXp > xp) ?? null;
}
