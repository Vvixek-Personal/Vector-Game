export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // lucide icon name
  condition: (stats: any) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "a_first_run", title: "Initiation", description: "Complete your first run.", icon: "play", condition: (s) => s.runs >= 1 },
  { id: "a_100_runs", title: "Veteran", description: "Complete 100 runs.", icon: "shield", condition: (s) => s.runs >= 100 },
  { id: "a_streak_50", title: "Unbreakable", description: "Achieve a 50x combo.", icon: "flame", condition: (s) => s.bestStreak >= 50 },
  { id: "a_streak_100", title: "Godlike", description: "Achieve a 100x combo.", icon: "crown", condition: (s) => s.bestStreak >= 100 },
  { id: "a_score_100k", title: "High Roller", description: "Accumulate 100,000 total score.", icon: "target", condition: (s) => (s.score || 0) >= 100000 },
  { id: "a_diamond_100", title: "Gem Collector", description: "Collect 100 Diamonds.", icon: "gem", condition: (s) => (s.diamonds || 0) >= 100 },
];

export function getUnlockedAchievements(stats: any): string[] {
  return ACHIEVEMENTS.filter(a => a.condition(stats)).map(a => a.id);
}
