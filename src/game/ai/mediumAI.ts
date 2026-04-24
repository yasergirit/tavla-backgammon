import { applyMove } from '../engine';
import { evaluatePosition } from './evaluatePosition';
import { getAllLegalSequences, type MoveSequence } from '../moveValidator';
import type { GameState, Player } from '../types';

const scoreSequence = (state: GameState, player: Player, sequence: MoveSequence): number => {
  let score = 0;
  let working = state;

  for (const step of sequence.steps) {
    const before = working;
    working = applyMove(working, step);

    if (step.to === 'off') {
      score += 18;
    }
    if (working.bar[player === 'white' ? 'black' : 'white'].length > before.bar[player === 'white' ? 'black' : 'white'].length) {
      score += 22;
    }
    if (step.to !== 'off' && working.board[step.to].filter((checker) => checker.player === player).length >= 2) {
      score += 12;
    }
  }

  score -= working.board.filter((point) => point.filter((checker) => checker.player === player).length === 1).length * 6;
  score += evaluatePosition(working, player);
  return score;
};

export const chooseMediumAiSequence = (state: GameState, player: Player): MoveSequence | null => {
  const sequences = getAllLegalSequences(state, player);
  if (sequences.length === 0) {
    return null;
  }

  return sequences.reduce((best, sequence) =>
    scoreSequence(state, player, sequence) > scoreSequence(state, player, best) ? sequence : best,
  );
};
