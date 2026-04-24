import clsx from 'clsx';
import { Crown, Sparkles } from 'lucide-react';
import { getPipCount } from '../../game/rules';
import { useGameStore } from '../../store/gameStore';

const PlayerLine = ({
  active,
  name,
  player,
  score,
  pips,
  off,
}: {
  active: boolean;
  name: string;
  player: 'white' | 'black';
  score: number;
  pips: number;
  off: number;
}) => (
  <div
    className={clsx(
      'rounded-xl border px-3 py-2',
      active ? 'border-sky-300 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-900',
    )}
  >
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <div
          className={clsx(
            'h-8 w-8 shrink-0 rounded-full border shadow-inner',
            player === 'white' ? 'border-stone-200 bg-stone-50' : 'border-slate-700 bg-slate-900',
          )}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-sm font-bold">
            {active && <Sparkles className="h-3.5 w-3.5 shrink-0 text-sky-300" />}
            <span className="truncate">{name}</span>
          </div>
          <div className={clsx('text-[10px] uppercase', active ? 'text-slate-300' : 'text-slate-500')}>
            {player}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-right">
        <div>
          <div className={clsx('text-[10px] uppercase', active ? 'text-slate-400' : 'text-slate-500')}>Score</div>
          <div className="text-base font-black">{score}</div>
        </div>
        <div>
          <div className={clsx('text-[10px] uppercase', active ? 'text-slate-400' : 'text-slate-500')}>Pips</div>
          <div className="text-base font-black">{pips}</div>
        </div>
        <div>
          <div className={clsx('text-[10px] uppercase', active ? 'text-slate-400' : 'text-slate-500')}>Off</div>
          <div className="text-base font-black">{off}</div>
        </div>
      </div>
    </div>
  </div>
);

const PlayerPanel = () => {
  const state = useGameStore();

  return (
    <section className="rounded-[1.25rem] border border-white/70 bg-white/85 p-3 shadow-[0_14px_36px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="grid gap-2">
        <PlayerLine
          active={state.turn === 'white'}
          name={state.options.mode === 'ai' ? 'You' : 'White'}
          player="white"
          score={state.match.score.white}
          pips={getPipCount(state, 'white')}
          off={state.borneOff.white.length}
        />
        <PlayerLine
          active={state.turn === 'black'}
          name={state.options.mode === 'ai' ? 'AI' : 'Black'}
          player="black"
          score={state.match.score.black}
          pips={getPipCount(state, 'black')}
          off={state.borneOff.black.length}
        />
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase text-slate-500">
              <Crown className="h-3.5 w-3.5 text-amber-500" />
              Match
            </div>
            <div className="text-xl font-black text-slate-950">
              {state.match.score.white} - {state.match.score.black}
            </div>
          </div>
          <div className="rounded-lg bg-slate-900 px-3 py-2 text-right text-white">
            <div className="text-[10px] uppercase text-slate-400">Cube</div>
            <div className="text-lg font-black">{state.doublingCube.value}</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PlayerPanel;
