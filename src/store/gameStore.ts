import { create } from 'zustand';
import { AI_THINKING_DELAY_RANGE, DEFAULT_OPTIONS } from '../game/constants';
import { chooseEasyAiSequence } from '../game/ai/easyAI';
import { chooseHardAiSequence } from '../game/ai/hardAI';
import { chooseMediumAiSequence } from '../game/ai/mediumAI';
import { applyMove, createTurnSnapshot, restoreSnapshot } from '../game/engine';
import { getInitialBoard } from '../game/initialPosition';
import { getLegalDestinations, getValidFirstSteps, hasAnyLegalMove } from '../game/moveValidator';
import { canOfferDouble, cloneState, getOpponent } from '../game/rules';
import { getScoreDelta, getWinner, getWinType } from '../game/scoring';
import type { AiDifficulty, GameOptions, GameState, Player } from '../game/types';
import { clearGame, loadGame, saveGame } from '../utils/persistence';
import { rollDice, rollDie } from '../utils/dice';
import { useSettingsStore } from './settingsStore';

interface GameStore extends GameState {
  hasSavedGame: boolean;
  initializeGame: (overrides?: Partial<GameOptions>) => void;
  loadSavedGame: () => boolean;
  rollForOpening: () => void;
  rollTurnDice: () => void;
  moveChecker: (from: number | 'bar', to: number | 'off') => void;
  undoMove: () => void;
  autoPlayForcedMoves: () => void;
  confirmTurn: () => void;
  startNextGame: () => void;
  resignGame: (player: Player) => void;
  offerDouble: () => void;
  acceptDouble: () => void;
  declineDouble: () => void;
  performAiTurn: () => Promise<void>;
  dismissSavedGame: () => void;
  hydrateFromOnline: (state: GameState, onlinePlayer: Player, onlineGameId: string) => void;
  setOnlineSession: (onlinePlayer: Player | null, onlineGameId: string | null) => void;
  getValidStepsForChecker: (from: number | 'bar') => ReturnType<typeof getLegalDestinations>;
}

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export const createInitialGameState = (options?: Partial<GameOptions>): GameState => {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  return {
    board: getInitialBoard(),
    bar: { white: [], black: [] },
    borneOff: { white: [], black: [] },
    turn: null,
    dice: { current: [], original: [] },
    currentTurnMoves: [],
    turnHistory: [],
    openingRoll: null,
    options: mergedOptions,
    match: {
      score: { white: 0, black: 0 },
      target: mergedOptions.matchTarget,
      crawfordPending: false,
      crawfordActive: false,
      crawfordCompleted: false,
    },
    doublingCube: {
      value: 1,
      owner: null,
      offeredBy: null,
      enabled: mergedOptions.doublingCubeEnabled,
    },
    winner: null,
    winType: null,
    isGameOver: false,
    matchWinner: null,
    aiThinking: false,
    lastScoredPoints: 0,
    onlinePlayer: null,
    onlineGameId: null,
  };
};

const saveIfStable = (state: GameState): void => {
  if (!state.isGameOver && state.dice.current.length === 0 && state.turnHistory.length === 0 && state.turn) {
    saveGame(cloneState(state));
  }
};

const chooseAiSequence = (state: GameState, difficulty: AiDifficulty) => {
  if (!state.turn) {
    return null;
  }
  if (difficulty === 'easy') {
    return chooseEasyAiSequence(state, state.turn);
  }
  if (difficulty === 'hard') {
    return chooseHardAiSequence(state, state.turn);
  }
  return chooseMediumAiSequence(state, state.turn);
};

const finishGame = (state: GameState, winner: Player): GameState => {
  const winType = getWinType(state, winner);
  const points = getScoreDelta(state, winner, winType);
  const updated = cloneState(state);
  updated.isGameOver = true;
  updated.winner = winner;
  updated.winType = winType;
  updated.lastScoredPoints = points;
  updated.match.score[winner] += points;
  updated.matchWinner =
    updated.match.score[winner] >= updated.match.target ? winner : null;

  if (
    updated.options.crawfordRuleEnabled &&
    !updated.matchWinner &&
    !updated.match.crawfordCompleted &&
    !updated.match.crawfordActive &&
    !updated.match.crawfordPending &&
    (updated.match.score.white === updated.match.target - 1 ||
      updated.match.score.black === updated.match.target - 1)
  ) {
    updated.match.crawfordPending = true;
  }

  if (updated.match.crawfordActive) {
    updated.match.crawfordActive = false;
    updated.match.crawfordCompleted = true;
  }

  clearGame();
  return updated;
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialGameState(),
  hasSavedGame: Boolean(loadGame()),

  initializeGame: (overrides) => {
    clearGame();
    set({
      ...createInitialGameState(overrides),
      hasSavedGame: false,
    });
  },

  loadSavedGame: () => {
    const saved = loadGame();
    if (!saved) {
      return false;
    }

    set({
      ...saved.state,
      onlinePlayer: null,
      onlineGameId: null,
      hasSavedGame: true,
    });
    return true;
  },

  dismissSavedGame: () => {
    clearGame();
    set({ hasSavedGame: false });
  },

  rollForOpening: () => {
    const current = get();
    if (current.onlinePlayer && current.onlinePlayer !== 'white') {
      return;
    }

    const white = rollDie();
    const black = rollDie();

    if (white === black) {
      set({
        openingRoll: { white, black },
      });
      return;
    }

    const turn: Player = white > black ? 'white' : 'black';
    set({
      openingRoll: { white, black },
      turn,
      dice: { current: [white, black], original: [white, black] },
      turnHistory: [],
      currentTurnMoves: [],
      aiThinking: false,
    });
  },

  rollTurnDice: () => {
    const state = get();
    if (
      !state.turn ||
      state.isGameOver ||
      (state.onlinePlayer && state.turn !== state.onlinePlayer) ||
      state.dice.current.length > 0 ||
      state.dice.original.length > 0 ||
      state.doublingCube.offeredBy
    ) {
      return;
    }

    const [dieOne, dieTwo] = rollDice();
    const rolledDice = dieOne === dieTwo ? [dieOne, dieOne, dieOne, dieOne] : [dieOne, dieTwo];
    set((current) => ({
      dice: { current: rolledDice, original: [...rolledDice] },
      turnHistory: [createTurnSnapshot(current)],
      currentTurnMoves: [],
    }));

    const next = get();
    if (next.turn && !hasAnyLegalMove(next, next.turn)) {
      const autoConfirm = useSettingsStore.getState().autoConfirmForcedMoves;
      if (autoConfirm) {
        window.setTimeout(() => {
          get().confirmTurn();
        }, 450);
      }
    }
  },

  moveChecker: (from, to) => {
    const state = get();
    if (!state.turn || state.isGameOver || (state.onlinePlayer && state.turn !== state.onlinePlayer)) {
      return;
    }

    const validStep = getLegalDestinations(state, state.turn, from).find((step) => step.to === to);
    if (!validStep) {
      return;
    }

    const nextState = applyMove(state, validStep);
    const winner = getWinner(nextState);

    if (winner) {
      set((current) => finishGame({
        ...nextState,
        turnHistory: [...current.turnHistory, createTurnSnapshot(current)],
      }, winner));
      return;
    }

    set((current) => ({
      ...nextState,
      turnHistory: [...current.turnHistory, createTurnSnapshot(current)],
    }));

    const updated = get();
    const autoConfirm = useSettingsStore.getState().autoConfirmForcedMoves;
    if (autoConfirm && updated.turn && getValidFirstSteps(updated, updated.turn).length === 0) {
      window.setTimeout(() => get().confirmTurn(), 350);
    }
  },

  undoMove: () => {
    const state = get();
    if (state.turnHistory.length <= 1 || state.aiThinking) {
      return;
    }

    const previousSnapshot = state.turnHistory[state.turnHistory.length - 1];
    set((current) => ({
      ...restoreSnapshot(current, previousSnapshot),
      turnHistory: current.turnHistory.slice(0, -1),
    }));
  },

  autoPlayForcedMoves: () => {
    let state = get();
    if (!state.turn || state.aiThinking || (state.onlinePlayer && state.turn !== state.onlinePlayer)) {
      return;
    }

    while (state.turn && !state.isGameOver) {
      const sequences = getValidFirstSteps(state, state.turn);
      if (sequences.length !== 1) {
        break;
      }
      const step = sequences[0];
      get().moveChecker(step.from, step.to);
      state = get();
      if (state.dice.current.length === 0) {
        break;
      }
    }
  },

  confirmTurn: () => {
    const state = get();
    if (
      !state.turn ||
      state.aiThinking ||
      state.doublingCube.offeredBy ||
      (state.onlinePlayer && state.turn !== state.onlinePlayer)
    ) {
      return;
    }

    if (state.dice.current.length > 0 && hasAnyLegalMove(state, state.turn)) {
      return;
    }

    const nextTurn = getOpponent(state.turn);
    const nextState: GameState = {
      ...cloneState(state),
      turn: nextTurn,
      dice: { current: [], original: [] },
      currentTurnMoves: [],
      turnHistory: [],
      openingRoll: state.openingRoll,
      aiThinking: false,
    };
    set(nextState);
    saveIfStable(nextState);
    set({ hasSavedGame: Boolean(loadGame()) });
  },

  startNextGame: () => {
    const current = get();
    const next = createInitialGameState(current.options);
    next.match = {
      ...current.match,
      score: { ...current.match.score },
      crawfordActive: current.match.crawfordPending,
      crawfordPending: false,
    };
    next.doublingCube.enabled = current.options.doublingCubeEnabled && !next.match.crawfordActive;
    set({
      ...next,
      hasSavedGame: false,
    });
  },

  resignGame: (player) => {
    const opponent = getOpponent(player);
    set((state) => finishGame(state, opponent));
  },

  offerDouble: () => {
    const state = get();
    if (!state.turn || (state.onlinePlayer && state.turn !== state.onlinePlayer) || !canOfferDouble(state, state.turn)) {
      return;
    }
    set((current) => ({
      doublingCube: {
        ...current.doublingCube,
        offeredBy: current.turn,
      },
    }));
  },

  acceptDouble: () => {
    const state = get();
    const offeredBy = state.doublingCube.offeredBy;
    if (!offeredBy || !state.turn) {
      return;
    }
    const accepter = getOpponent(offeredBy);
    set((current) => ({
      doublingCube: {
        ...current.doublingCube,
        value: Math.min(current.doublingCube.value * 2, 64),
        owner: accepter,
        offeredBy: null,
      },
    }));
  },

  declineDouble: () => {
    const state = get();
    const offeredBy = state.doublingCube.offeredBy;
    if (!offeredBy) {
      return;
    }
    set((current) => finishGame({
      ...current,
      doublingCube: {
        ...current.doublingCube,
        offeredBy: null,
      },
    }, offeredBy));
  },

  performAiTurn: async () => {
    const state = get();
    if (
      state.options.mode !== 'ai' ||
      state.turn !== 'black' ||
      state.isGameOver ||
      state.aiThinking ||
      state.doublingCube.offeredBy
    ) {
      return;
    }

    const settings = useSettingsStore.getState();
    const waitMs = settings.aiDelayMs || AI_THINKING_DELAY_RANGE[state.options.aiDifficulty];
    set({ aiThinking: true });
    await delay(waitMs);

    if (get().dice.current.length === 0) {
      get().rollTurnDice();
      await delay(Math.max(250, Math.floor(waitMs / 2)));
    }

    let working = get();
    const sequence = chooseAiSequence(working, working.options.aiDifficulty);
    if (!sequence || sequence.steps.length === 0) {
      set({ aiThinking: false });
      get().confirmTurn();
      return;
    }

    for (const step of sequence.steps) {
      get().moveChecker(step.from, step.to);
      await delay(260);
      working = get();
      if (working.isGameOver) {
        set({ aiThinking: false });
        return;
      }
    }

    set({ aiThinking: false });
    get().confirmTurn();
  },

  getValidStepsForChecker: (from) => {
    const state = get();
    if (!state.turn || (state.onlinePlayer && state.turn !== state.onlinePlayer)) {
      return [];
    }
    return getLegalDestinations(state, state.turn, from);
  },

  hydrateFromOnline: (state, onlinePlayer, onlineGameId) => {
    set({
      ...state,
      onlinePlayer,
      onlineGameId,
      aiThinking: false,
      hasSavedGame: false,
    });
  },

  setOnlineSession: (onlinePlayer, onlineGameId) => {
    set({ onlinePlayer, onlineGameId });
  },
}));
