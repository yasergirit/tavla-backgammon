import type { Checker, Player } from './types';
import { TOTAL_POINTS } from './constants';

let checkerId = 0;

const createCheckers = (player: Player, count: number): Checker[] =>
  Array.from({ length: count }, () => ({
    id: `${player}-${checkerId++}`,
    player,
  }));

export const getInitialBoard = (): Checker[][] => {
  checkerId = 0;
  const board = Array.from({ length: TOTAL_POINTS }, () => [] as Checker[]);

  board[23].push(...createCheckers('white', 2));
  board[12].push(...createCheckers('white', 5));
  board[7].push(...createCheckers('white', 3));
  board[5].push(...createCheckers('white', 5));

  board[0].push(...createCheckers('black', 2));
  board[11].push(...createCheckers('black', 5));
  board[16].push(...createCheckers('black', 3));
  board[18].push(...createCheckers('black', 5));

  return board;
};
