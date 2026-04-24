import { applyMove } from '../engine';
import { evaluatePosition } from './evaluatePosition';
import { getAllLegalSequences, type MoveSequence } from '../moveValidator';
import { getPipCount } from '../rules';
import type { GameState, Player } from '../types';

const estimateRaceState = (state: GameState): boolean =>
  state.bar.white.length === 0 &&
  state.bar.black.length === 0 &&
  !state.board.some(
    (point, index) =>
      index > 5 &&
      index < 18 &&
      point.some((checker) => checker.player === 'white') &&
      point.some((checker) => checker.player === 'black'),
  );

const scoreSequence = (state: GameState, player: Player, sequence: MoveSequence): number => {
  const opponent = player === 'white' ? 'black' : 'white';
  let working = state;
  let hitValue = 0;
  let bearOffValue = 0;
  let makePointValue = 0;

  for (const step of sequence.steps) {
    const before = working;
    working = applyMove(working, step);

    if (step.to === 'off') {
      bearOffValue += 20;
    }
    if (working.bar[opponent].length > before.bar[opponent].length) {
      hitValue += estimateRaceState(state) ? 8 : 20;
    }
    if (step.to !== 'off' && working.board[step.to].filter((checker) => checker.player === player).length >= 2) {
      makePointValue += 10;
    }
  }

  const pipSwing = getPipCount(working, opponent) - getPipCount(working, player);
  const blotPenalty =
    working.board.filter((point) => point.filter((checker) => checker.player === player).length === 1).length * 8;
  const primePotential =
    working.board.filter((point) => point.filter((checker) => checker.player === player).length >= 2).length * 2.5;

  return (
    evaluatePosition(working, player) +
    pipSwing * 1.2 +
    hitValue +
    bearOffValue +
    makePointValue +
    primePotential -
    blotPenalty
  );
};

export const chooseHardAiSequence = (state: GameState, player: Player): MoveSequence | null => {
  const sequences = getAllLegalSequences(state, player);
  if (sequences.length === 0) {
    return null;
  }

  let best = sequences[0];
  let bestScore = scoreSequence(state, player, best);

  for (const sequence of sequences.slice(1)) {
    const score = scoreSequence(state, player, sequence);
    if (score > bestScore) {
      best = sequence;
      bestScore = score;
    }
  }

  return best;
};
