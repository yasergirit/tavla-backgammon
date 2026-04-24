import type { GameState, MoveStep, Player, TurnSnapshot } from './types';
import { cloneState, getOpponent } from './rules';

export const createTurnSnapshot = (state: GameState): TurnSnapshot => ({
  board: state.board.map((point) => point.map((checker) => ({ ...checker }))),
  bar: {
    white: state.bar.white.map((checker) => ({ ...checker })),
    black: state.bar.black.map((checker) => ({ ...checker })),
  },
  borneOff: {
    white: state.borneOff.white.map((checker) => ({ ...checker })),
    black: state.borneOff.black.map((checker) => ({ ...checker })),
  },
  dice: {
    current: [...state.dice.current],
    original: [...state.dice.original],
  },
  currentTurnMoves: state.currentTurnMoves.map((move) => ({ ...move })),
});

export const applyMove = (state: GameState, step: Omit<MoveStep, 'player' | 'hit'>): GameState => {
  const nextState = cloneState(state);
  const player = nextState.turn as Player;
  const opponent = getOpponent(player);

  let movingChecker;
  if (step.from === 'bar') {
    movingChecker = nextState.bar[player].pop();
  } else {
    movingChecker = nextState.board[step.from].pop();
  }

  if (!movingChecker) {
    throw new Error('Attempted to move a missing checker');
  }

  let hit = false;
  if (step.to === 'off') {
    nextState.borneOff[player].push(movingChecker);
  } else {
    const destination = nextState.board[step.to];
    if (destination.length === 1 && destination[0].player === opponent) {
      const hitChecker = destination.pop();
      if (hitChecker) {
        nextState.bar[opponent].push(hitChecker);
        hit = true;
      }
    }
    destination.push(movingChecker);
  }

  const dieIndex = nextState.dice.current.findIndex((die) => die === step.die);
  if (dieIndex >= 0) {
    nextState.dice.current.splice(dieIndex, 1);
  }

  nextState.currentTurnMoves.push({
    ...step,
    player,
    hit,
  });

  return nextState;
};

export const restoreSnapshot = (state: GameState, snapshot: TurnSnapshot): GameState => ({
  ...state,
  board: snapshot.board.map((point) => point.map((checker) => ({ ...checker }))),
  bar: {
    white: snapshot.bar.white.map((checker) => ({ ...checker })),
    black: snapshot.bar.black.map((checker) => ({ ...checker })),
  },
  borneOff: {
    white: snapshot.borneOff.white.map((checker) => ({ ...checker })),
    black: snapshot.borneOff.black.map((checker) => ({ ...checker })),
  },
  dice: {
    current: [...snapshot.dice.current],
    original: [...snapshot.dice.original],
  },
  currentTurnMoves: snapshot.currentTurnMoves.map((move) => ({ ...move })),
});
