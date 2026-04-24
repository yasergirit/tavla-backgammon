import clsx from 'clsx';
import { Dice4, Flag, Redo2, Sparkles } from 'lucide-react';
import { getValidFirstSteps } from '../../game/moveValidator';
import { canOfferDouble } from '../../game/rules';
import { useGameStore } from '../../store/gameStore';

const Die = ({ value, faded = false }: { value: number; faded?: boolean }) => (
  <div
    className={clsx(
      'flex h-12 w-12 items-center justify-center rounded-xl border text-xl font-black shadow-lg transition',
      faded
        ? 'border-white/20 bg-white/10 text-white/70'
        : 'border-white/50 bg-white text-slate-900',
    )}
  >
    {value}
  </div>
);

const GameControls = () => {
  const game = useGameStore();
  const isMyOnlineTurn = !game.onlinePlayer || !game.turn || game.onlinePlayer === game.turn;
  const canUndo = game.turnHistory.length > 1 && !game.aiThinking && isMyOnlineTurn;
  const canConfirm =
    Boolean(game.turn) &&
    isMyOnlineTurn &&
    !game.aiThinking &&
    !game.doublingCube.offeredBy &&
    (game.dice.current.length === 0 || getValidFirstSteps(game, game.turn!).length === 0);
  const canRoll =
    Boolean(game.turn) &&
    isMyOnlineTurn &&
    game.dice.current.length === 0 &&
    game.dice.original.length === 0 &&
    !game.isGameOver &&
    !game.aiThinking;

  if (!game.turn && !game.isGameOver) {
    return (
      <section className="flex h-full min-h-[20rem] flex-col justify-between rounded-[1.25rem] bg-slate-950 p-4 text-white shadow-[0_18px_48px_rgba(15,23,42,0.28)]">
        <div className="grid gap-4">
          <div>
            <div className="text-xs font-bold uppercase text-slate-400">Opening Roll</div>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              Each player rolls one die. Higher die starts and keeps both opening dice.
            </p>
          </div>
          <button
            type="button"
            onClick={game.rollForOpening}
            disabled={!isMyOnlineTurn}
            className="rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Roll to Start
          </button>
        </div>

        {game.openingRoll && (
          <div className="mt-5 flex items-center gap-3">
            <Die value={game.openingRoll.white ?? 1} />
            <span className="text-sm uppercase tracking-[0.28em] text-slate-400">vs</span>
            <Die value={game.openingRoll.black ?? 1} />
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-col rounded-[1.25rem] bg-slate-950 p-4 text-white shadow-[0_18px_48px_rgba(15,23,42,0.28)]">
      <div>
        <div className="text-xs font-bold uppercase text-slate-400">Turn Controls</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {game.dice.original.length > 0 ? (
            game.dice.original.map((value, index) => (
              <Die key={`${value}-${index}`} value={value} faded={!game.dice.current.includes(value) && game.dice.current.length !== game.dice.original.length} />
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-white/20 px-3 py-3 text-sm text-slate-400">
              Dice not rolled yet
            </div>
          )}
        </div>

        <div className="mt-3 text-sm leading-6 text-slate-300">
          {game.currentTurnMoves.length > 0
            ? `${game.currentTurnMoves.length} move(s) played this turn`
            : 'No moves committed in this turn yet.'}
        </div>

        {game.doublingCube.offeredBy && (
          <div className="mt-4 rounded-2xl border border-amber-300/40 bg-amber-300/10 px-4 py-3">
            <div className="text-sm font-semibold capitalize">
              {game.doublingCube.offeredBy} offered a double to {game.turn === 'white' ? 'black' : 'white'}.
            </div>
            <div className="mt-3 flex gap-3">
              <button type="button" onClick={game.acceptDouble} className="rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-white">
                Accept
              </button>
              <button type="button" onClick={game.declineDouble} className="rounded-xl bg-rose-500 px-4 py-2 font-semibold text-white">
                Decline
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto grid gap-2 pt-4">
        <button
          type="button"
          onClick={game.rollTurnDice}
          disabled={!canRoll || Boolean(game.doublingCube.offeredBy)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white shadow-lg transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Dice4 className="h-5 w-5" />
          Roll
        </button>
        <button
          type="button"
          onClick={game.autoPlayForcedMoves}
          disabled={game.dice.current.length === 0 || game.aiThinking || !isMyOnlineTurn}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Sparkles className="h-5 w-5" />
          Auto Move
        </button>
        <button
          type="button"
          onClick={game.undoMove}
          disabled={!canUndo}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Redo2 className="h-5 w-5" />
          Undo
        </button>
        <button
          type="button"
          onClick={game.confirmTurn}
          disabled={!canConfirm}
          className="h-11 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Confirm Move
        </button>
        <button
          type="button"
          onClick={game.offerDouble}
          disabled={!game.turn || !isMyOnlineTurn || !canOfferDouble(game, game.turn)}
          className="h-11 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Offer Double
        </button>
        <button
          type="button"
          onClick={() => game.turn && game.resignGame(game.turn)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-rose-500/90 px-4 text-sm font-semibold text-white shadow-lg transition hover:bg-rose-400"
        >
          <Flag className="h-5 w-5" />
          Resign
        </button>
      </div>
    </section>
  );
};

export default GameControls;
