export type Player = 'white' | 'black';
export type GameMode = 'local' | 'ai';
export type AiDifficulty = 'easy' | 'medium' | 'hard';
export type WinType = 'normal' | 'gammon' | 'backgammon';
export type ThemeName = 'classic' | 'harbor';

export interface Checker {
  id: string;
  player: Player;
}

export interface OpeningRoll {
  white: number | null;
  black: number | null;
}

export interface DiceState {
  current: number[];
  original: number[];
}

export interface MoveStep {
  from: number | 'bar';
  to: number | 'off';
  die: number;
  player: Player;
  hit: boolean;
}

export interface TurnSnapshot {
  board: Checker[][];
  bar: Record<Player, Checker[]>;
  borneOff: Record<Player, Checker[]>;
  dice: DiceState;
  currentTurnMoves: MoveStep[];
}

export interface GameOptions {
  mode: GameMode;
  aiDifficulty: AiDifficulty;
  matchTarget: number;
  doublingCubeEnabled: boolean;
  crawfordRuleEnabled: boolean;
  jacobyRuleEnabled: boolean;
}

export interface MatchState {
  score: Record<Player, number>;
  target: number;
  crawfordPending: boolean;
  crawfordActive: boolean;
  crawfordCompleted: boolean;
}

export interface DoublingCubeState {
  value: number;
  owner: Player | null;
  offeredBy: Player | null;
  enabled: boolean;
}

export interface GameState {
  board: Checker[][];
  bar: Record<Player, Checker[]>;
  borneOff: Record<Player, Checker[]>;
  turn: Player | null;
  dice: DiceState;
  currentTurnMoves: MoveStep[];
  turnHistory: TurnSnapshot[];
  openingRoll: OpeningRoll | null;
  options: GameOptions;
  match: MatchState;
  doublingCube: DoublingCubeState;
  winner: Player | null;
  winType: WinType | null;
  isGameOver: boolean;
  matchWinner: Player | null;
  aiThinking: boolean;
  lastScoredPoints: number;
  onlinePlayer: Player | null;
  onlineGameId: string | null;
}

export interface PersistedGame {
  version: number;
  savedAt: string;
  state: GameState;
}

export interface SettingsState {
  soundEnabled: boolean;
  highlightLegalMoves: boolean;
  autoConfirmForcedMoves: boolean;
  boardFlipped: boolean;
  whiteAtBottom: boolean;
  animationSpeed: 'slow' | 'normal' | 'fast';
  theme: ThemeName;
  aiDelayMs: number;
  showDiceDebug: boolean;
}
