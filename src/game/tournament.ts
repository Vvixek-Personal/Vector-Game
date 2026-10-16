// Seeded Weekly Tournament logic, schedule, and reward bracket system

import type { Stats } from "./storage";
import type { Profile } from "./profile";

export interface TournamentTier {
  tier: string;
  rankLabel: string;
  minRank: number;
  maxRank: number;
  diamonds: number;
  sparks: number;
  titleId?: string;
  titleName?: string;
  badge: string;
}

export const TOURNAMENT_TIERS: TournamentTier[] = [
  {
    tier: "Champion",
    rankLabel: "1st Place",
    minRank: 1,
    maxRank: 1,
    diamonds: 50,
    sparks: 1500,
    titleId: "tournament-king",
    titleName: "Tournament King",
    badge: "👑",
  },
  {
    tier: "Podium",
    rankLabel: "Top 3",
    minRank: 2,
    maxRank: 3,
    diamonds: 30,
    sparks: 1000,
    titleId: "apex-gladiator",
    titleName: "Apex Gladiator",
    badge: "🥈",
  },
  {
    tier: "Elite Top 10",
    rankLabel: "Ranks 4–10",
    minRank: 4,
    maxRank: 10,
    diamonds: 15,
    sparks: 600,
    badge: "⚡",
  },
  {
    tier: "Challenger",
    rankLabel: "Ranks 11–50",
    minRank: 11,
    maxRank: 50,
    diamonds: 5,
    sparks: 300,
    badge: "✦",
  },
];

export interface TournamentInfo {
  weekKey: string;
  displayLabel: string;
  seasonName: string;
  msRemaining: number;
  formattedCountdown: string;
}

export function getCurrentTournamentInfo(): TournamentInfo {
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const diff = now.getTime() - start.getTime() + (start.getTimezoneOffset() - now.getTimezoneOffset()) * 60000;
  const weekNum = Math.floor(diff / (1000 * 60 * 60 * 24 * 7));
  const weekKey = `${year}-W${weekNum}`;

  // Next Sunday 23:59:59 UTC
  const day = now.getUTCDay();
  const daysUntilSunday = (7 - day) % 7;
  const nextReset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilSunday, 23, 59, 59));
  if (daysUntilSunday === 0 && now.getUTCHours() === 23 && now.getUTCMinutes() >= 59) {
    nextReset.setUTCDate(nextReset.getUTCDate() + 7);
  }

  const msRemaining = Math.max(0, nextReset.getTime() - now.getTime());
  const hours = Math.floor(msRemaining / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  const minutes = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));

  const formattedCountdown = days > 0 ? `${days}d ${remHours}h ${minutes}m` : `${remHours}h ${minutes}m`;

  return {
    weekKey,
    displayLabel: `Tournament Season · Week ${weekNum}`,
    seasonName: `Genesis Circuit · Week ${weekNum}`,
    msRemaining,
    formattedCountdown,
  };
}

export function getRewardForRank(rank: number): TournamentTier | null {
  if (rank <= 0) return null;
  return TOURNAMENT_TIERS.find((t) => rank >= t.minRank && rank <= t.maxRank) ?? null;
}
