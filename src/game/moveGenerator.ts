import type { GameState, Player } from './types';
import { TOTAL_POINTS } from './constants';
import {
  getDirection,
  getDistanceToBearOff,
  getEntryPoint,
  getFarthestOccupiedHomePoint,
  isBearingOffAllowed,
  isPointBlocked,
} from './rules';

export interface Step {
  from: number | 'bar';
  to: number | 'off';
  die: number;
}

export const getPossibleDestinations = (
  state: GameState,
  from: number | 'bar',
  player: Player,
): Step[] => {
  if (state.bar[player].length > 0 && from !== 'bar') {
    return [];
  }

  const availableDice = [...new Set(state.dice.current)];
  const steps: Step[] = [];
  const direction = getDirection(player);
  const bearingOff = isBearingOffAllowed(state, player);
  const farthestHomePoint = getFarthestOccupiedHomePoint(state, player);

  for (const die of availableDice) {
    if (from === 'bar') {
      const entryPoint = getEntryPoint(player, die);
      if (!isPointBlocked(state, player, entryPoint)) {
        steps.push({ from, to: entryPoint, die });
      }
      continue;
    }

    const destination = from + direction * die;
    if (destination >= 0 && destination < TOTAL_POINTS) {
      if (!isPointBlocked(state, player, destination)) {
        steps.push({ from, to: destination, die });
      }
      continue;
    }

    if (!bearingOff) {
      continue;
    }

    const exactDistance = getDistanceToBearOff(player, from);
    if (die === exactDistance) {
      steps.push({ from, to: 'off', die });
      continue;
    }

    if (die > exactDistance && farthestHomePoint === from) {
      steps.push({ from, to: 'off', die });
    }
  }

  return steps;
};

export const getMovableSources = (state: GameState, player: Player): Array<number | 'bar'> => {
  if (state.bar[player].length > 0) {
    return ['bar'];
  }

  const sources: Array<number | 'bar'> = [];
  for (let point = 0; point < TOTAL_POINTS; point += 1) {
    if (state.board[point].some((checker) => checker.player === player)) {
      sources.push(point);
    }
  }
  return sources;
};
