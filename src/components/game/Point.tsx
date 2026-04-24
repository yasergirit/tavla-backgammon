import clsx from 'clsx';
import Checker from './Checker';
import type { Checker as CheckerType } from '../../game/types';

interface PointProps {
  point: number;
  checkers: CheckerType[];
  top: boolean;
  highlighted: boolean;
  selected: boolean;
  onClick: () => void;
}

const Point = ({ point, checkers, top, highlighted, selected, onClick }: PointProps) => {
  const color =
    point % 2 === 0
      ? 'border-b-[#8f4d21] border-t-[#8f4d21]'
      : 'border-b-[#f4d6a0] border-t-[#f4d6a0]';

  const stack = top ? checkers : [...checkers].reverse();
  const visible = stack.slice(0, 5);
  const overflow = checkers.length - visible.length;

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'relative flex h-full w-full flex-col items-center overflow-visible px-0.5 outline-none transition-transform',
        top ? 'justify-start pt-1' : 'justify-end pb-1',
        selected && 'scale-[1.02]',
      )}
      aria-label={`Point ${point + 1}${highlighted ? ' legal destination' : ''}`}
    >
      <span
        className={clsx(
          'absolute left-1/2 h-0 w-0 -translate-x-1/2 border-x-[calc(50%-2px)] border-x-transparent',
          top ? 'top-0 border-t-[min(14vw,10.5rem)]' : 'bottom-0 border-b-[min(14vw,10.5rem)]',
          color,
          highlighted && 'drop-shadow-[0_0_12px_rgba(56,189,248,0.65)]',
        )}
      />

      {highlighted && (
        <span
          className={clsx(
            'absolute left-1/2 z-10 h-10 w-10 -translate-x-1/2 rounded-full border-2 border-emerald-100 bg-emerald-300/30 shadow-[0_0_18px_rgba(52,211,153,0.45)]',
            top ? 'top-[6.3rem]' : 'bottom-[6.3rem]',
          )}
        />
      )}

      <span className={clsx('relative z-20 flex w-full items-center', top ? 'flex-col' : 'flex-col-reverse')}>
        {visible.map((checker, index) => (
          <span
            key={checker.id}
            className={clsx(
              'relative flex justify-center',
              top ? index > 0 && '-mt-3' : index > 0 && '-mb-3',
            )}
          >
            <Checker
              player={checker.player}
              isSelected={selected && index === 0}
            />
          </span>
        ))}
        {overflow > 0 && (
          <span className="mt-1 rounded-full bg-slate-950/75 px-2 py-0.5 text-[10px] font-semibold tracking-[0.2em] text-white">
            +{overflow}
          </span>
        )}
      </span>

      <span
        className={clsx(
          'absolute z-30 rounded-full bg-slate-950/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.25em] text-amber-50',
          top ? 'top-1' : 'bottom-1',
        )}
      >
        {point + 1}
      </span>
    </button>
  );
};

export default Point;
