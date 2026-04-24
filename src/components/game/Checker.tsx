import clsx from 'clsx';
import type { Player } from '../../game/types';

interface CheckerProps {
  player: Player;
  isSelected?: boolean;
  compact?: boolean;
}

const Checker = ({ player, isSelected = false, compact = false }: CheckerProps) => {
  const white = player === 'white';

  return (
    <div
      className={clsx(
        'relative rounded-full border shadow-[0_12px_22px_rgba(15,23,42,0.18),inset_0_2px_4px_rgba(255,255,255,0.45)] transition-transform duration-200',
        compact ? 'h-5 w-5' : 'h-[clamp(1.65rem,2.55vw,2.65rem)] w-[clamp(1.65rem,2.55vw,2.65rem)]',
        white
          ? 'border-stone-200 bg-[radial-gradient(circle_at_30%_30%,#ffffff,#eef2f7_55%,#c9d2df)]'
          : 'border-slate-700 bg-[radial-gradient(circle_at_30%_30%,#334155,#111827_55%,#020617)]',
        isSelected && 'scale-105 ring-4 ring-sky-300/80',
      )}
    >
      <span
        className={clsx(
          'absolute inset-2 rounded-full border opacity-55',
          white ? 'border-slate-300' : 'border-slate-600',
        )}
      />
    </div>
  );
};

export default Checker;
