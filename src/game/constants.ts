import type { AiDifficulty, GameOptions, Player, ThemeName } from './types';

export const TOTAL_POINTS = 24;
export const TOTAL_CHECKERS = 15;
export const PERSISTENCE_VERSION = 1;

export const HOME_BOARD: Record<Player, { start: number; end: number }> = {
  white: { start: 0, end: 5 },
  black: { start: 18, end: 23 },
};

export const BOARD_LAYOUT = {
  topLeft: [12, 13, 14, 15, 16, 17],
  topRight: [18, 19, 20, 21, 22, 23],
  bottomLeft: [11, 10, 9, 8, 7, 6],
  bottomRight: [5, 4, 3, 2, 1, 0],
};

export const MATCH_TARGETS = [1, 3, 5, 7, 11, 15];
export const CUBE_VALUES = [1, 2, 4, 8, 16, 32, 64];
export const AI_DIFFICULTIES: AiDifficulty[] = ['easy', 'medium', 'hard'];
export const THEMES: ThemeName[] = ['classic', 'harbor'];

export const DEFAULT_OPTIONS: GameOptions = {
  mode: 'ai',
  aiDifficulty: 'medium',
  matchTarget: 5,
  doublingCubeEnabled: true,
  crawfordRuleEnabled: true,
  jacobyRuleEnabled: false,
};

export const AI_THINKING_DELAY_RANGE: Record<AiDifficulty, number> = {
  easy: 450,
  medium: 700,
  hard: 950,
};
