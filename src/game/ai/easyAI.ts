import { applyMove } from '../engine';
import { getAllLegalSequences, type MoveSequence } from '../moveValidator';
import type { GameState, Player } from '../types';

const sequenceScore = (state: GameState, player: Player, sequence: MoveSequence): number => {
  let score = Math.random();
  let working = state;
  for (const step of sequence.steps) {
    const next = applyMove(working, step);
    if (step.to === 'off') {
      score += 5;
    }
    if (next.bar[player === 'white' ? 'black' : 'white'].length > working.bar[player === 'white' ? 'black' : 'white'].length) {
      score += 8;
    }
    working = next;
  }
  return score;
};

export const chooseEasyAiSequence = (state: GameState, player: Player): MoveSequence | null => {
  const sequences = getAllLegalSequences(state, player);
  if (sequences.length === 0) {
    return null;
  }

  return [...sequences].sort((a, b) => sequenceScore(state, player, b) - sequenceScore(state, player, a))[0];
};
