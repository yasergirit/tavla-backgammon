import { HOME_BOARD } from '../constants';
import { getPipCount } from '../rules';
import type { GameState, Player } from '../types';

const countBlots = (state: GameState, player: Player): number =>
  state.board.filter(
    (point) => point.filter((checker) => checker.player === player).length === 1,
  ).length;

const countMadePoints = (state: GameState, player: Player): number =>
  state.board.filter(
    (point) => point.filter((checker) => checker.player === player).length >= 2,
  ).length;

const countAnchors = (state: GameState, player: Player): number => {
  const enemyHome = HOME_BOARD[player === 'white' ? 'black' : 'white'];
  return state.board
    .slice(enemyHome.start, enemyHome.end + 1)
    .filter((point) => point.filter((checker) => checker.player === player).length >= 2).length;
};

const countHomeStrength = (state: GameState, player: Player): number => {
  const home = HOME_BOARD[player];
  return state.board
    .slice(home.start, home.end + 1)
    .reduce(
      (sum, point) =>
        sum + (point.filter((checker) => checker.player === player).length >= 2 ? 1 : 0),
      0,
    );
};

export const evaluatePosition = (state: GameState, player: Player): number => {
  const opponent = player === 'white' ? 'black' : 'white';
  const pipAdvantage = getPipCount(state, opponent) - getPipCount(state, player);
  const blotPressure = countBlots(state, opponent) - countBlots(state, player);
  const madePointEdge = countMadePoints(state, player) - countMadePoints(state, opponent);
  const anchorEdge = countAnchors(state, player) - countAnchors(state, opponent);
  const homeEdge = countHomeStrength(state, player) - countHomeStrength(state, opponent);
  const barEdge = state.bar[opponent].length - state.bar[player].length;
  const borneOffEdge = state.borneOff[player].length - state.borneOff[opponent].length;

  return (
    pipAdvantage * 1.6 +
    blotPressure * 9 +
    madePointEdge * 6 +
    anchorEdge * 4 +
    homeEdge * 7 +
    barEdge * 12 +
    borneOffEdge * 15
  );
};
