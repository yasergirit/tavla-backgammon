import { useMemo, useState } from 'react';
import { BOARD_LAYOUT } from '../../game/constants';
import type { Player } from '../../game/types';
import { useGameStore } from '../../store/gameStore';
import { useSettingsStore } from '../../store/settingsStore';
import Bar from './Bar';
import BearOff from './BearOff';
import Point from './Point';

const Board = () => {
  const state = useGameStore();
  const { highlightLegalMoves, boardFlipped, whiteAtBottom } = useSettingsStore();
  const [selectedFrom, setSelectedFrom] = useState<number | 'bar' | null>(null);

  const activeTurn = state.turn;
  const validSteps = useMemo(() => {
    if (!activeTurn || selectedFrom === null) {
      return [];
    }
    return state.getValidStepsForChecker(selectedFrom);
  }, [activeTurn, selectedFrom, state]);

  const validDestinations = new Set(validSteps.map((step) => step.to));
  const interactive =
    Boolean(activeTurn) &&
    !state.isGameOver &&
    !state.aiThinking &&
    !state.doublingCube.offeredBy &&
    (!state.onlinePlayer || state.onlinePlayer === activeTurn);
  const showWhiteBottom = whiteAtBottom !== boardFlipped;

  const topLeft = showWhiteBottom ? BOARD_LAYOUT.topLeft : [...BOARD_LAYOUT.bottomRight].reverse();
  const topRight = showWhiteBottom ? BOARD_LAYOUT.topRight : [...BOARD_LAYOUT.bottomLeft].reverse();
  const bottomLeft = showWhiteBottom ? BOARD_LAYOUT.bottomLeft : [...BOARD_LAYOUT.topRight].reverse();
  const bottomRight = showWhiteBottom ? BOARD_LAYOUT.bottomRight : [...BOARD_LAYOUT.topLeft].reverse();

  const handlePointClick = (point: number) => {
    if (!interactive || !activeTurn) {
      return;
    }

    if (selectedFrom !== null && validDestinations.has(point)) {
      state.moveChecker(selectedFrom, point);
      setSelectedFrom(null);
      return;
    }

    const stack = state.board[point];
    const topChecker = stack[stack.length - 1];
    if (!topChecker || topChecker.player !== activeTurn) {
      setSelectedFrom(null);
      return;
    }

    if (state.bar[activeTurn].length > 0) {
      return;
    }

    const moves = state.getValidStepsForChecker(point);
    setSelectedFrom(moves.length > 0 ? point : null);
  };

  const handleBarClick = (player: Player) => {
    if (!interactive || !activeTurn || player !== activeTurn || state.bar[player].length === 0) {
      return;
    }
    setSelectedFrom((current) => (current === 'bar' ? null : 'bar'));
  };

  const handleBearOffClick = () => {
    if (!interactive || selectedFrom === null || !validDestinations.has('off')) {
      return;
    }
    state.moveChecker(selectedFrom, 'off');
    setSelectedFrom(null);
  };

  const renderHalf = (points: number[], top: boolean) => (
    <div className="grid h-full grid-cols-6 gap-1">
      {points.map((point) => (
        <Point
          key={point}
          point={point}
          checkers={state.board[point]}
          top={top}
          highlighted={highlightLegalMoves && selectedFrom !== null && validDestinations.has(point)}
          selected={selectedFrom === point}
          onClick={() => handlePointClick(point)}
        />
      ))}
    </div>
  );

  return (
    <div data-board-shell className="relative flex aspect-[4/3] w-[min(100%,calc((100vh-11.5rem)*4/3))] max-w-full flex-col rounded-[1.25rem] border border-amber-200/50 bg-[linear-gradient(145deg,#d8a64f,#8f5f25)] p-2 shadow-[0_18px_48px_rgba(15,23,42,0.2)]">
      <div className="absolute inset-2 rounded-[1rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.18),transparent_35%),repeating-linear-gradient(90deg,rgba(255,255,255,0.05)_0,rgba(255,255,255,0.05)_8px,rgba(0,0,0,0.04)_8px,rgba(0,0,0,0.04)_16px)] opacity-70" />
      <div className="relative flex min-h-0 flex-1 gap-2 rounded-[1rem] bg-[linear-gradient(180deg,#ae7838,#744819)] p-2">
        <div className="flex flex-1 flex-col justify-between rounded-xl bg-[#e8c47d] p-1.5 shadow-[inset_0_2px_8px_rgba(255,255,255,0.35)]">
          {renderHalf(topLeft, true)}
          {renderHalf(bottomLeft, false)}
        </div>

        <Bar
          white={state.bar.white}
          black={state.bar.black}
          selectedPlayer={selectedFrom === 'bar' ? activeTurn : null}
          activeTurn={activeTurn}
          onClick={handleBarClick}
        />

        <div className="flex flex-1 flex-col justify-between rounded-xl bg-[#e8c47d] p-1.5 shadow-[inset_0_2px_8px_rgba(255,255,255,0.35)]">
          {renderHalf(topRight, true)}
          {renderHalf(bottomRight, false)}
        </div>

        <BearOff
          white={state.borneOff.white}
          black={state.borneOff.black}
          highlighted={highlightLegalMoves && validDestinations.has('off')}
          onClick={handleBearOffClick}
        />
      </div>

      <div className="relative mt-2 flex h-8 items-center justify-between rounded-xl bg-slate-950/75 px-3 text-[11px] font-semibold uppercase text-amber-50/90">
        <span>{state.turn ? `${state.turn} to play` : 'Opening roll'}</span>
        <span>{state.currentTurnMoves.length > 0 ? `${state.currentTurnMoves.length} move(s)` : 'Fresh turn'}</span>
      </div>
    </div>
  );
};

export default Board;
