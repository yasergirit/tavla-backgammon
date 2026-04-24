import clsx from 'clsx';
import Checker from './Checker';
import type { Checker as CheckerType, Player } from '../../game/types';

interface BarProps {
  white: CheckerType[];
  black: CheckerType[];
  selectedPlayer: Player | null;
  activeTurn: Player | null;
  onClick: (player: Player) => void;
}

const Bar = ({ white, black, selectedPlayer, activeTurn, onClick }: BarProps) => (
  <div className="flex w-12 flex-col justify-between rounded-[1.5rem] bg-[linear-gradient(180deg,#603813,#4a2c11)] px-2 py-4 shadow-[inset_0_2px_6px_rgba(255,255,255,0.1)] md:w-14">
    {(['white', 'black'] as Player[]).map((player) => {
      const checkers = player === 'white' ? white : black;
      const selected = selectedPlayer === player;
      return (
        <button
          key={player}
          type="button"
          onClick={() => onClick(player)}
          className={clsx(
            'flex min-h-28 flex-col items-center justify-start gap-1 rounded-2xl border border-transparent py-2 transition',
            activeTurn === player && 'hover:border-sky-200/50',
            selected && 'border-sky-300 bg-sky-300/10',
          )}
          aria-label={`${player} bar`}
        >
          {checkers.length === 0 ? (
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-100/50">
              Bar
            </span>
          ) : (
            checkers.slice(0, 4).map((checker) => (
              <Checker key={checker.id} player={checker.player} compact />
            ))
          )}
          {checkers.length > 4 && (
            <span className="rounded-full bg-slate-900/70 px-2 py-0.5 text-[10px] font-bold text-white">
              +{checkers.length - 4}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export default Bar;
