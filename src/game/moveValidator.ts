import { applyMove } from './engine';
import { getMovableSources, getPossibleDestinations, type Step } from './moveGenerator';
import type { GameState, Player } from './types';

export interface MoveSequence {
  steps: Step[];
  diceUsed: number;
  pipGain: number;
}

const getStepDistance = (player: Player, step: Step): number => {
  if (step.from === 'bar') {
    return step.die;
  }
  if (step.to === 'off') {
    return player === 'white' ? step.from + 1 : 24 - step.from;
  }
  return Math.abs(step.to - step.from);
};

export const getAllLegalSequences = (state: GameState, player: Player): MoveSequence[] => {
  const sequences: MoveSequence[] = [];

  const visit = (workingState: GameState, currentSteps: Step[]) => {
    const sources = getMovableSources(workingState, player);
    const nextSteps = sources.flatMap((source) =>
      getPossibleDestinations(workingState, source, player),
    );

    if (nextSteps.length === 0) {
      sequences.push({
        steps: currentSteps,
        diceUsed: currentSteps.length,
        pipGain: currentSteps.reduce((sum, step) => sum + getStepDistance(player, step), 0),
      });
      return;
    }

    for (const step of nextSteps) {
      visit(applyMove(workingState, step), [...currentSteps, step]);
    }
  };

  visit(state, []);

  if (sequences.length === 0) {
    return [];
  }

  const maxDiceUsed = Math.max(...sequences.map((sequence) => sequence.diceUsed));
  let filtered = sequences.filter((sequence) => sequence.diceUsed === maxDiceUsed);

  if (
    maxDiceUsed === 1 &&
    state.dice.current.length === 2 &&
    state.dice.current[0] !== state.dice.current[1]
  ) {
    const highestDie = Math.max(...state.dice.current);
    if (filtered.some((sequence) => sequence.steps[0]?.die === highestDie)) {
      filtered = filtered.filter((sequence) => sequence.steps[0]?.die === highestDie);
    }
  }

  return filtered;
};

export const getValidFirstSteps = (state: GameState, player: Player): Step[] => {
  const sequences = getAllLegalSequences(state, player);
  const seen = new Set<string>();
  const steps: Step[] = [];

  for (const sequence of sequences) {
    const step = sequence.steps[0];
    if (!step) {
      continue;
    }
    const key = `${step.from}-${step.to}-${step.die}`;
    if (!seen.has(key)) {
      seen.add(key);
      steps.push(step);
    }
  }

  return steps;
};

export const hasAnyLegalMove = (state: GameState, player: Player): boolean =>
  getValidFirstSteps(state, player).length > 0;

export const getLegalDestinations = (
  state: GameState,
  player: Player,
  from: number | 'bar',
): Step[] => getValidFirstSteps(state, player).filter((step) => step.from === from);
