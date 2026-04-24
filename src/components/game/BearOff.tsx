import clsx from 'clsx';
import type { Checker as CheckerType } from '../../game/types';

interface BearOffProps {
  white: CheckerType[];
  black: CheckerType[];
  highlighted: boolean;
  onClick: () => void;
}

const Stack = ({ color, count }: { color: 'white' | 'black'; count: number }) => (
  <div className="flex flex-col gap-1">
    {Array.from({ length: Math.min(count, 6) }).map((_, index) => (
      <span
        key={`${color}-${index}`}
        className={clsx(
          'h-3.5 w-10 rounded-full border shadow-sm',
          color === 'white'
            ? 'border-stone-200 bg-stone-50'
            : 'border-slate-700 bg-slate-900',
        )}
      />
    ))}
    {count > 6 && (
      <span className="rounded-full bg-slate-950/70 px-2 py-0.5 text-[10px] font-bold text-white">
        +{count - 6}
      </span>
    )}
  </div>
);

const BearOff = ({ white, black, highlighted, onClick }: BearOffProps) => (
  <button
    type="button"
    onClick={onClick}
    className={clsx(
      'flex w-14 flex-col justify-between rounded-[1.6rem] border border-amber-200/30 bg-[linear-gradient(180deg,#8b5a2b,#6f431b)] p-2 text-amber-50 shadow-[inset_0_2px_6px_rgba(255,255,255,0.1)] transition',
      highlighted && 'border-sky-200 shadow-[0_0_0_2px_rgba(125,211,252,0.35),inset_0_2px_6px_rgba(255,255,255,0.1)]',
    )}
    aria-label="Bear off tray"
  >
    <Stack color="black" count={black.length} />
    <span className="my-2 rounded-full bg-black/20 py-1 text-[9px] font-bold uppercase tracking-[0.28em]">
      Off
    </span>
    <Stack color="white" count={white.length} />
  </button>
);

export default BearOff;
