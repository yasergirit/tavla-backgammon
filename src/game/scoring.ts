import { HOME_BOARD, TOTAL_CHECKERS } from './constants';
import { getOpponent } from './rules';
import type { GameState, Player, WinType } from './types';

export const getWinner = (state: GameState): Player | null => {
  if (state.borneOff.white.length === TOTAL_CHECKERS) {
    return 'white';
  }
  if (state.borneOff.black.length === TOTAL_CHECKERS) {
    return 'black';
  }
  return null;
};

export const getWinType = (state: GameState, winner: Player): WinType => {
  const loser = getOpponent(winner);

  if (state.borneOff[loser].length > 0) {
    return 'normal';
  }

  const home = HOME_BOARD[winner];
  const loserInWinnerHome = state.board
    .slice(home.start, home.end + 1)
    .some((point) => point.some((checker) => checker.player === loser));

  if (state.bar[loser].length > 0 || loserInWinnerHome) {
    return 'backgammon';
  }

  return 'gammon';
};

export const getScoreDelta = (
  state: GameState,
  _winner: Player,
  winType: WinType,
): number => {
  let multiplier = state.doublingCube.enabled ? state.doublingCube.value : 1;

  if (
    state.options.jacobyRuleEnabled &&
    state.options.matchTarget === 1 &&
    state.doublingCube.value === 1
  ) {
    multiplier = 1;
    return multiplier;
  }

  const base =
    winType === 'backgammon' ? 3 : winType === 'gammon' ? 2 : 1;

  return base * multiplier;
};
