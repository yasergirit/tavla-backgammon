import { HOME_BOARD, TOTAL_POINTS } from './constants';
import type { Checker, GameState, MoveStep, Player } from './types';

export const getOpponent = (player: Player): Player =>
  player === 'white' ? 'black' : 'white';

export const getDirection = (player: Player): number =>
  player === 'white' ? -1 : 1;

export const cloneCheckers = (checkers: Checker[]): Checker[] =>
  checkers.map((checker) => ({ ...checker }));

export const cloneState = (state: GameState): GameState => ({
  ...state,
  board: state.board.map(cloneCheckers),
  bar: {
    white: cloneCheckers(state.bar.white),
    black: cloneCheckers(state.bar.black),
  },
  borneOff: {
    white: cloneCheckers(state.borneOff.white),
    black: cloneCheckers(state.borneOff.black),
  },
  dice: {
    current: [...state.dice.current],
    original: [...state.dice.original],
  },
  currentTurnMoves: state.currentTurnMoves.map((move) => ({ ...move })),
  turnHistory: state.turnHistory.map((snapshot) => ({
    board: snapshot.board.map(cloneCheckers),
    bar: {
      white: cloneCheckers(snapshot.bar.white),
      black: cloneCheckers(snapshot.bar.black),
    },
    borneOff: {
      white: cloneCheckers(snapshot.borneOff.white),
      black: cloneCheckers(snapshot.borneOff.black),
    },
    dice: {
      current: [...snapshot.dice.current],
      original: [...snapshot.dice.original],
    },
    currentTurnMoves: snapshot.currentTurnMoves.map((move) => ({ ...move })),
  })),
  openingRoll: state.openingRoll ? { ...state.openingRoll } : null,
  options: { ...state.options },
  match: {
    ...state.match,
    score: { ...state.match.score },
  },
  doublingCube: { ...state.doublingCube },
});

export const getEntryPoint = (player: Player, die: number): number =>
  player === 'white' ? TOTAL_POINTS - die : die - 1;

export const isPointBlocked = (state: GameState, player: Player, point: number): boolean => {
  const opponent = getOpponent(player);
  return state.board[point].filter((checker) => checker.player === opponent).length >= 2;
};

export const isBearingOffAllowed = (state: GameState, player: Player): boolean => {
  if (state.bar[player].length > 0) {
    return false;
  }

  const home = HOME_BOARD[player];
  for (let point = 0; point < TOTAL_POINTS; point += 1) {
    if (point >= home.start && point <= home.end) {
      continue;
    }

    if (state.board[point].some((checker) => checker.player === player)) {
      return false;
    }
  }

  return true;
};

export const getFarthestOccupiedHomePoint = (
  state: GameState,
  player: Player,
): number | null => {
  const home = HOME_BOARD[player];

  if (player === 'white') {
    for (let point = home.end; point >= home.start; point -= 1) {
      if (state.board[point].some((checker) => checker.player === player)) {
        return point;
      }
    }
  } else {
    for (let point = home.start; point <= home.end; point += 1) {
      if (state.board[point].some((checker) => checker.player === player)) {
        return point;
      }
    }
  }

  return null;
};

export const getDistanceToBearOff = (player: Player, point: number): number =>
  player === 'white' ? point + 1 : TOTAL_POINTS - point;

export const getPipCount = (state: GameState, player: Player): number => {
  let total = state.bar[player].length * 25;

  for (let point = 0; point < TOTAL_POINTS; point += 1) {
    const count = state.board[point].filter((checker) => checker.player === player).length;
    if (count === 0) {
      continue;
    }
    total += count * getDistanceToBearOff(player, point);
  }

  return total;
};

export const getCheckerCountOnBoard = (state: GameState, player: Player): number =>
  state.board.reduce(
    (sum, point) => sum + point.filter((checker) => checker.player === player).length,
    0,
  );

export const canOfferDouble = (state: GameState, player: Player): boolean => {
  if (!state.doublingCube.enabled) {
    return false;
  }

  if (state.isGameOver || state.turn !== player || state.dice.current.length > 0) {
    return false;
  }

  if (state.doublingCube.offeredBy) {
    return false;
  }

  if (state.match.crawfordActive) {
    return false;
  }

  if (state.doublingCube.value >= 64) {
    return false;
  }

  return state.doublingCube.owner === null || state.doublingCube.owner === player;
};

export const getMoveSummary = (steps: MoveStep[]): string =>
  steps
    .map((step) => `${step.from === 'bar' ? 'BAR' : step.from + 1}-${step.to === 'off' ? 'OFF' : step.to + 1}`)
    .join(', ');
