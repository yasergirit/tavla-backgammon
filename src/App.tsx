import { useEffect, useRef, useState } from 'react';
import { Armchair, Bot, BookOpen, CheckCircle2, Home, Play, Settings2, Swords, Trophy } from 'lucide-react';
import Board from './components/game/Board';
import GameControls from './components/game/GameControls';
import PlayerPanel from './components/game/PlayerPanel';
import { MATCH_TARGETS, THEMES } from './game/constants';
import type { GameState } from './game/types';
import { isSupabaseConfigured } from './lib/supabaseClient';
import {
  createOnlineGame,
  fetchOnlineGameState,
  fetchOnlineRooms,
  leaveOnlineSeat,
  removeChannel,
  setOnlineSeatReady,
  sitOnlineSeat,
  subscribeOnlineGame,
  subscribeOnlineRooms,
  updateOnlineGameState,
  type OnlineRoom,
} from './services/onlineRooms';
import { createInitialGameState, useGameStore } from './store/gameStore';
import { useSettingsStore } from './store/settingsStore';
import { getDiceDebugLog } from './utils/dice';
import { getPlayerId, getPlayerName } from './utils/playerIdentity';
import mainBackground from '../gpt-images/Ana Arkaplan.jpeg';

type Screen = 'home' | 'setup' | 'rooms' | 'game' | 'settings' | 'rules';
type SeatColor = 'white' | 'black';

interface RoomSeat {
  occupant: string | null;
  ready: boolean;
}

interface PlayRoom {
  id: string;
  name: string;
  stakes: string;
  locked: boolean;
  seats: Record<SeatColor, RoomSeat>;
}

interface ActiveOnlineGame {
  gameId: string;
  seat: SeatColor;
}

const appCard =
  'rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.15)] backdrop-blur';

const createRooms = (): PlayRoom[] =>
  ['Olive Table', 'Walnut Table', 'Harbor Table', 'Evening Table'].map((name, index) => ({
    id: `room-${index + 1}`,
    name,
    stakes: index < 2 ? '5 point match' : '3 point match',
    locked: false,
    seats: {
      white: { occupant: null, ready: false },
      black: { occupant: null, ready: false },
    },
  }));

const localRoomToOnlineShape = (room: PlayRoom): OnlineRoom => ({
  id: room.id,
  name: room.name,
  matchTarget: room.stakes.startsWith('3') ? 3 : 5,
  status: room.locked ? 'playing' : 'open',
  gameId: null,
  seats: {
    white: {
      roomId: room.id,
      seat: 'white',
      playerId: room.seats.white.occupant,
      playerName: room.seats.white.occupant,
      ready: room.seats.white.ready,
    },
    black: {
      roomId: room.id,
      seat: 'black',
      playerId: room.seats.black.occupant,
      playerName: room.seats.black.occupant,
      ready: room.seats.black.ready,
    },
  },
});

const getCleanGameState = (state: GameState): GameState => ({
  ...state,
  onlinePlayer: null,
  onlineGameId: null,
  aiThinking: false,
  turnHistory: [],
});

function App() {
  const game = useGameStore();
  const settings = useSettingsStore();
  const [screen, setScreen] = useState<Screen>('home');
  const [setupMode, setSetupMode] = useState<'ai' | 'local'>('ai');
  const [setupTarget, setSetupTarget] = useState(5);
  const [setupDifficulty, setSetupDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [setupCube, setSetupCube] = useState(true);
  const [setupCrawford, setSetupCrawford] = useState(true);
  const [rooms, setRooms] = useState<PlayRoom[]>(() => createRooms());
  const [onlineRooms, setOnlineRooms] = useState<OnlineRoom[]>([]);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [activeOnlineGame, setActiveOnlineGame] = useState<ActiveOnlineGame | null>(null);
  const playerId = useRef(getPlayerId());
  const playerName = useRef(getPlayerName());
  const applyingRemoteState = useRef(false);
  const lastSyncedState = useRef('');

  useEffect(() => {
    if (game.options.mode === 'ai' && game.turn === 'black' && !game.isGameOver && !game.aiThinking) {
      void game.performAiTurn();
    }
  }, [game.aiThinking, game.isGameOver, game.options.mode, game.performAiTurn, game.turn]);

  useEffect(() => {
    if (!isSupabaseConfigured || screen !== 'rooms') {
      return;
    }

    let mounted = true;
    const loadRooms = async () => {
      try {
        const nextRooms = await fetchOnlineRooms();
        if (mounted) {
          setOnlineRooms(nextRooms);
          setRoomsError(null);
        }
      } catch (error) {
        if (mounted) {
          setRoomsError(error instanceof Error ? error.message : 'Could not load online rooms.');
        }
      }
    };

    void loadRooms();
    const channel = subscribeOnlineRooms(() => {
      void loadRooms();
    });

    return () => {
      mounted = false;
      removeChannel(channel);
    };
  }, [screen]);

  useEffect(() => {
    if (screen !== 'rooms' || isSupabaseConfigured) {
      return;
    }

    const readyRoom = rooms.find(
      (room) =>
        !room.locked &&
        room.seats.white.occupant &&
        room.seats.black.occupant &&
        room.seats.white.ready &&
        room.seats.black.ready,
    );

    if (!readyRoom) {
      return;
    }

    setRooms((currentRooms) =>
      currentRooms.map((room) =>
        room.id === readyRoom.id ? { ...room, locked: true } : room,
      ),
    );
    game.initializeGame({
      mode: 'local',
      aiDifficulty: 'medium',
      matchTarget: readyRoom.stakes.startsWith('3') ? 3 : 5,
      doublingCubeEnabled: setupCube,
      crawfordRuleEnabled: setupCrawford,
    });
    setScreen('game');
  }, [game.initializeGame, rooms, screen, setupCrawford, setupCube]);

  useEffect(() => {
    if (screen !== 'rooms' || !isSupabaseConfigured) {
      return;
    }

    const seatedReadyRoom = onlineRooms.find((room) => {
      const white = room.seats.white;
      const black = room.seats.black;
      const playerIsSeated = white.playerId === playerId.current || black.playerId === playerId.current;

      return (
        room.status === 'open' &&
        playerIsSeated &&
        white.playerId &&
        black.playerId &&
        white.ready &&
        black.ready
      );
    });

    if (!seatedReadyRoom) {
      return;
    }

    const startOnlineGame = async () => {
      try {
        const seat = seatedReadyRoom.seats.white.playerId === playerId.current ? 'white' : 'black';
        if (seat === 'white' && !seatedReadyRoom.gameId) {
          const initialState = createInitialGameState({
            mode: 'local',
            aiDifficulty: 'medium',
            matchTarget: seatedReadyRoom.matchTarget,
            doublingCubeEnabled: setupCube,
            crawfordRuleEnabled: setupCrawford,
          });
          await createOnlineGame(seatedReadyRoom, initialState);
        }
      } catch (error) {
        setRoomsError(error instanceof Error ? error.message : 'Could not start online game.');
      }
    };

    void startOnlineGame();
  }, [onlineRooms, screen, setupCrawford, setupCube]);

  useEffect(() => {
    if (screen !== 'rooms' || !isSupabaseConfigured) {
      return;
    }

    const playingRoom = onlineRooms.find((room) => {
      const white = room.seats.white;
      const black = room.seats.black;
      return (
        room.status === 'playing' &&
        room.gameId &&
        (white.playerId === playerId.current || black.playerId === playerId.current)
      );
    });

    if (!playingRoom?.gameId) {
      return;
    }

    const seat = playingRoom.seats.white.playerId === playerId.current ? 'white' : 'black';
    setActiveOnlineGame({ gameId: playingRoom.gameId, seat });

    const loadGame = async () => {
      try {
        const nextState = await fetchOnlineGameState(playingRoom.gameId!);
        if (nextState) {
          applyingRemoteState.current = true;
          game.hydrateFromOnline(nextState, seat, playingRoom.gameId!);
          window.setTimeout(() => {
            applyingRemoteState.current = false;
          }, 0);
          setScreen('game');
        }
      } catch (error) {
        setRoomsError(error instanceof Error ? error.message : 'Could not open online game.');
      }
    };

    void loadGame();
  }, [game.hydrateFromOnline, onlineRooms, screen]);

  useEffect(() => {
    if (!activeOnlineGame) {
      return;
    }

    const channel = subscribeOnlineGame(activeOnlineGame.gameId, (state) => {
      applyingRemoteState.current = true;
      game.hydrateFromOnline(state, activeOnlineGame.seat, activeOnlineGame.gameId);
      window.setTimeout(() => {
        applyingRemoteState.current = false;
      }, 0);
    });

    return () => removeChannel(channel);
  }, [activeOnlineGame, game.hydrateFromOnline]);

  useEffect(() => {
    if (!activeOnlineGame) {
      return;
    }

    return useGameStore.subscribe((state) => {
      if (applyingRemoteState.current || state.onlineGameId !== activeOnlineGame.gameId) {
        return;
      }

      const cleanState = getCleanGameState(state);
      const serialized = JSON.stringify(cleanState);
      if (serialized === lastSyncedState.current) {
        return;
      }

      lastSyncedState.current = serialized;
      void updateOnlineGameState(activeOnlineGame.gameId, cleanState).catch((error) => {
        setRoomsError(error instanceof Error ? error.message : 'Could not sync online game.');
      });
    });
  }, [activeOnlineGame]);

  const startGame = () => {
    game.initializeGame({
      mode: setupMode,
      aiDifficulty: setupDifficulty,
      matchTarget: setupTarget,
      doublingCubeEnabled: setupCube,
      crawfordRuleEnabled: setupCrawford,
    });
    setScreen('game');
  };

  const sitAtRoom = (roomId: string, seat: SeatColor) => {
    if (isSupabaseConfigured) {
      void (async () => {
        try {
          await sitOnlineSeat(roomId, seat, playerId.current, playerName.current);
          setOnlineRooms(await fetchOnlineRooms());
          setRoomsError(null);
        } catch (error) {
          setRoomsError(error instanceof Error ? error.message : 'Could not sit at this table.');
        }
      })();
      return;
    }

    setRooms((currentRooms) =>
      currentRooms.map((room) => {
        if (room.id !== roomId || room.locked || room.seats[seat].occupant) {
          return room;
        }

        return {
          ...room,
          seats: {
            ...room.seats,
            [seat]: {
              occupant: seat === 'white' ? 'Player 1' : 'Player 2',
              ready: false,
            },
          },
        };
      }),
    );
  };

  const leaveRoomSeat = (roomId: string, seat: SeatColor) => {
    if (isSupabaseConfigured) {
      void (async () => {
        try {
          await leaveOnlineSeat(roomId, seat, playerId.current);
          setOnlineRooms(await fetchOnlineRooms());
          setRoomsError(null);
        } catch (error) {
          setRoomsError(error instanceof Error ? error.message : 'Could not leave this seat.');
        }
      })();
      return;
    }

    setRooms((currentRooms) =>
      currentRooms.map((room) =>
        room.id === roomId
          ? {
              ...room,
              seats: {
                ...room.seats,
                [seat]: { occupant: null, ready: false },
              },
            }
          : room,
      ),
    );
  };

  const toggleRoomReady = (roomId: string, seat: SeatColor) => {
    if (isSupabaseConfigured) {
      const room = onlineRooms.find((onlineRoom) => onlineRoom.id === roomId);
      const nextReady = !room?.seats[seat].ready;
      void (async () => {
        try {
          await setOnlineSeatReady(roomId, seat, playerId.current, nextReady);
          setOnlineRooms(await fetchOnlineRooms());
          setRoomsError(null);
        } catch (error) {
          setRoomsError(error instanceof Error ? error.message : 'Could not update ready state.');
        }
      })();
      return;
    }

    setRooms((currentRooms) =>
      currentRooms.map((room) => {
        if (room.id !== roomId || !room.seats[seat].occupant || room.locked) {
          return room;
        }

        return {
          ...room,
          seats: {
            ...room.seats,
            [seat]: {
              ...room.seats[seat],
              ready: !room.seats[seat].ready,
            },
          },
        };
      }),
    );
  };

  const gameStatus = game.isGameOver
    ? `${game.winner} wins ${game.lastScoredPoints} point${game.lastScoredPoints === 1 ? '' : 's'}`
    : game.turn
      ? `${game.turn} turn`
      : 'Opening roll decides the first move';
  const displayedRooms = isSupabaseConfigured ? onlineRooms : rooms.map(localRoomToOnlineShape);

  return (
    <div
      className={`${screen === 'game' ? 'h-screen overflow-hidden' : 'min-h-screen'} bg-cover bg-center bg-no-repeat px-4 text-slate-900 md:px-6 ${screen === 'game' ? 'py-3' : 'py-5'}`}
      style={{ backgroundImage: `linear-gradient(rgba(255, 247, 237, 0.18), rgba(226, 232, 240, 0.22)), url(${mainBackground})` }}
    >
      <div className={`mx-auto ${screen !== 'game' ? 'flex min-h-[calc(100vh-2.5rem)] max-w-[1600px] flex-col' : 'max-w-[1560px]'}`}>
        <header className={screen === 'game' ? 'mb-6 flex items-center justify-between gap-3' : 'mb-5 flex flex-wrap items-center justify-between gap-3'}>
          <div>
            <div className={screen === 'game' ? 'hidden' : 'text-sm font-bold uppercase tracking-[0.34em] text-sky-700'}>Premium Casual Tavla</div>
            <h1 className={screen === 'game' ? 'text-3xl font-black' : 'mt-1 text-4xl font-black md:text-5xl'}>Backgammon</h1>
          </div>
          <div className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-lg">
            {gameStatus}
          </div>
        </header>

        {screen === 'home' && (
          <div className="flex flex-1 items-center justify-center pb-8">
            <section className={`${appCard} relative w-full max-w-[1260px] overflow-hidden p-8 md:p-10`}>
              <div className="relative z-10 grid items-stretch gap-8 lg:grid-cols-[1.15fr_0.85fr]">
                <div>
                  <div className="inline-flex rounded-full bg-amber-100 px-5 py-2.5 text-base font-semibold text-amber-800">
                    Wooden board, AI, undo, match scoring
                  </div>
                  <h2 className="mt-6 max-w-2xl text-4xl font-black leading-tight text-slate-950 md:text-5xl">
                    A polished local backgammon game built for the browser.
                  </h2>
                  <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                    Play against AI, share the same device for a local match, join table-style play rooms, and test
                    classic backgammon movement with clear dice and move rules.
                  </p>
                  <div className="mt-10 grid max-w-2xl gap-4 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSetupMode('ai');
                        setScreen('setup');
                      }}
                      className="flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-6 py-5 text-lg font-semibold text-white shadow-lg transition hover:bg-sky-500"
                    >
                      <Bot className="h-5 w-5" />
                      Play vs AI
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSetupMode('local');
                        setScreen('setup');
                      }}
                      className="flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-5 text-lg font-semibold text-white shadow-lg transition hover:bg-slate-800"
                    >
                      <Swords className="h-5 w-5" />
                      Local 2 Players
                    </button>
                    <button
                      type="button"
                      onClick={() => setScreen('rooms')}
                      className="flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-amber-400 px-6 py-5 text-lg font-semibold text-slate-950 shadow-lg transition hover:bg-amber-300"
                    >
                      <Armchair className="h-5 w-5" />
                      Play Rooms
                    </button>
                    <button
                      type="button"
                      onClick={() => setScreen('settings')}
                      className="flex min-h-16 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-5 text-lg font-semibold text-slate-900 shadow-sm transition hover:border-sky-200 hover:bg-sky-50"
                    >
                      <Settings2 className="h-5 w-5" />
                      Settings
                    </button>
                  </div>
                </div>

                <div className="flex flex-col rounded-[1.75rem] bg-[linear-gradient(145deg,#f8fafc,#dbeafe)] p-6">
                  <div className="rounded-[1.4rem] bg-slate-950 px-6 py-6 text-white shadow-xl">
                    <div className="flex items-center gap-2 text-base font-semibold uppercase tracking-[0.3em] text-slate-400">
                      <Trophy className="h-4 w-4 text-amber-300" />
                      Included
                    </div>
                    <ul className="mt-5 space-y-4 text-base leading-7 text-slate-200">
                      <li>Complete move validation, bar entry, forced moves, bearing off</li>
                      <li>Easy, medium, hard AI with small thinking delay</li>
                      <li>Doubling cube, Crawford rule and local match scoreboard</li>
                      <li>Responsive board with legal move highlights and undo</li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScreen('rules')}
                    className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-4 text-lg font-semibold text-slate-900 shadow-sm"
                  >
                    <BookOpen className="h-5 w-5" />
                    How to Play
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {screen === 'rooms' && (
          <div className="flex flex-1 items-center justify-center pb-8">
            <section className={`${appCard} w-full max-w-[1260px] p-8 md:p-10`}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold uppercase tracking-[0.32em] text-sky-700">Play Rooms</div>
                  <h2 className="mt-2 text-3xl font-black text-slate-950">Game Rooms</h2>
                </div>
                <button type="button" onClick={() => setScreen('home')} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                  Back
                </button>
              </div>

              <div className="mt-8 grid gap-5 lg:grid-cols-2">
                {roomsError && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 lg:col-span-2">
                    {roomsError}
                  </div>
                )}
                {isSupabaseConfigured && displayedRooms.length === 0 && !roomsError && (
                  <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-6 text-center font-semibold text-slate-600 lg:col-span-2">
                    No online rooms found. Run the Supabase schema setup first.
                  </div>
                )}
                {displayedRooms.map((room) => {
                  const occupiedCount = Number(Boolean(room.seats.white.playerId)) + Number(Boolean(room.seats.black.playerId));
                  const readyCount = Number(room.seats.white.ready) + Number(room.seats.black.ready);

                  return (
                    <article key={room.id} className="rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-black text-slate-950">{room.name}</h3>
                          <div className="mt-1 text-sm font-semibold text-slate-500">
                            {room.matchTarget} point match · {occupiedCount}/2 seated · {readyCount}/2 ready
                          </div>
                        </div>
                        <div className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${room.status !== 'open' ? 'bg-slate-900 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                          {room.status !== 'open' ? 'Closed' : 'Open'}
                        </div>
                      </div>

                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        {(['white', 'black'] as SeatColor[]).map((seat) => {
                          const seatState = room.seats[seat];
                          const occupied = Boolean(seatState.playerId);
                          const isMine = !isSupabaseConfigured || seatState.playerId === playerId.current;

                          return (
                            <div key={seat} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <div className="flex items-center gap-3">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-full border shadow-inner ${seat === 'white' ? 'border-stone-200 bg-white' : 'border-slate-700 bg-slate-950'}`}>
                                  <Armchair className={`h-5 w-5 ${seat === 'white' ? 'text-slate-500' : 'text-white'}`} />
                                </div>
                                <div>
                                  <div className="text-sm font-black capitalize text-slate-950">{seat} seat</div>
                                  <div className="text-xs font-semibold text-slate-500">
                                    {seatState.playerName ?? 'Empty chair'}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 grid gap-2">
                                {!occupied ? (
                                  <button
                                    type="button"
                                    onClick={() => sitAtRoom(room.id, seat)}
                                    disabled={room.status !== 'open'}
                                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <Armchair className="h-4 w-4" />
                                    Sit
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => toggleRoomReady(room.id, seat)}
                                      disabled={room.status !== 'open' || !isMine}
                                      className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${seatState.ready ? 'bg-emerald-500 text-white hover:bg-emerald-400' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                                    >
                                      <CheckCircle2 className="h-4 w-4" />
                                      {seatState.ready ? 'Ready' : 'Ready Up'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => leaveRoomSeat(room.id, seat)}
                                      disabled={room.status !== 'open' || !isMine}
                                      className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      Leave Seat
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {screen === 'setup' && (
          <div className="flex flex-1 items-center justify-center pb-8">
          <section className={`${appCard} w-full max-w-[1260px] p-8 md:p-10`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-bold uppercase tracking-[0.32em] text-sky-700">Mode Setup</div>
                <h2 className="mt-2 text-3xl font-black">New Match Setup</h2>
              </div>
              <button type="button" onClick={() => setScreen('home')} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                Back
              </button>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <label className="rounded-[1.5rem] border border-slate-200 p-4">
                <div className="text-sm font-bold uppercase tracking-[0.28em] text-slate-500">Mode</div>
                <select
                  value={setupMode}
                  onChange={(event) => setSetupMode(event.target.value as 'ai' | 'local')}
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold"
                >
                  <option value="ai">Play vs AI</option>
                  <option value="local">Local 2 Players</option>
                </select>
              </label>

              <label className="rounded-[1.5rem] border border-slate-200 p-4">
                <div className="text-sm font-bold uppercase tracking-[0.28em] text-slate-500">AI Difficulty</div>
                <select
                  value={setupDifficulty}
                  onChange={(event) => setSetupDifficulty(event.target.value as 'easy' | 'medium' | 'hard')}
                  disabled={setupMode !== 'ai'}
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold disabled:opacity-50"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>

              <label className="rounded-[1.5rem] border border-slate-200 p-4">
                <div className="text-sm font-bold uppercase tracking-[0.28em] text-slate-500">Match Target</div>
                <select
                  value={setupTarget}
                  onChange={(event) => setSetupTarget(Number(event.target.value))}
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold"
                >
                  {MATCH_TARGETS.map((value) => (
                    <option key={value} value={value}>
                      {value} points
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-[1.5rem] border border-slate-200 p-4">
                <div className="text-sm font-bold uppercase tracking-[0.28em] text-slate-500">Rules</div>
                <div className="mt-3 space-y-3">
                  <label className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="font-semibold">Doubling cube</span>
                    <input type="checkbox" checked={setupCube} onChange={(event) => setSetupCube(event.target.checked)} />
                  </label>
                  <label className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="font-semibold">Crawford rule</span>
                    <input type="checkbox" checked={setupCrawford} onChange={(event) => setSetupCrawford(event.target.checked)} />
                  </label>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={startGame}
              className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-6 py-4 text-base font-semibold text-white shadow-lg transition hover:bg-sky-500"
            >
              <Play className="h-5 w-5" />
              Start Match
            </button>
          </section>
          </div>
        )}

        {screen === 'settings' && (
          <div className="flex flex-1 items-center justify-center pb-8">
          <section className={`${appCard} w-full max-w-[1260px] p-8 md:p-10`}>
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black">Settings</h2>
              <button type="button" onClick={() => setScreen('home')} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                Back
              </button>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <label className="flex items-center justify-between rounded-[1.4rem] border border-slate-200 p-4">
                <span className="font-semibold">Sound</span>
                <input type="checkbox" checked={settings.soundEnabled} onChange={(event) => settings.patchSettings({ soundEnabled: event.target.checked })} />
              </label>
              <label className="flex items-center justify-between rounded-[1.4rem] border border-slate-200 p-4">
                <span className="font-semibold">Highlight legal moves</span>
                <input type="checkbox" checked={settings.highlightLegalMoves} onChange={(event) => settings.patchSettings({ highlightLegalMoves: event.target.checked })} />
              </label>
              <label className="flex items-center justify-between rounded-[1.4rem] border border-slate-200 p-4">
                <span className="font-semibold">Auto-confirm forced turns</span>
                <input type="checkbox" checked={settings.autoConfirmForcedMoves} onChange={(event) => settings.patchSettings({ autoConfirmForcedMoves: event.target.checked })} />
              </label>
              <label className="flex items-center justify-between rounded-[1.4rem] border border-slate-200 p-4">
                <span className="font-semibold">Flip board</span>
                <input type="checkbox" checked={settings.boardFlipped} onChange={(event) => settings.patchSettings({ boardFlipped: event.target.checked })} />
              </label>
              <label className="rounded-[1.4rem] border border-slate-200 p-4">
                <div className="font-semibold">Theme</div>
                <select
                  value={settings.theme}
                  onChange={(event) => settings.setTheme(event.target.value as (typeof THEMES)[number])}
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold"
                >
                  {THEMES.map((theme) => (
                    <option key={theme} value={theme}>
                      {theme}
                    </option>
                  ))}
                </select>
              </label>
              <label className="rounded-[1.4rem] border border-slate-200 p-4">
                <div className="font-semibold">AI delay</div>
                <input
                  type="range"
                  min={300}
                  max={1200}
                  step={50}
                  value={settings.aiDelayMs}
                  onChange={(event) => settings.patchSettings({ aiDelayMs: Number(event.target.value) })}
                  className="mt-4 w-full"
                />
                <div className="mt-2 text-sm text-slate-500">{settings.aiDelayMs} ms</div>
              </label>
            </div>

            {import.meta.env.DEV && (
              <div className="mt-8 rounded-[1.5rem] bg-slate-950 p-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold uppercase tracking-[0.3em] text-slate-400">Dice Debug</div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={settings.showDiceDebug} onChange={(event) => settings.patchSettings({ showDiceDebug: event.target.checked })} />
                    Show log
                  </label>
                </div>
                {settings.showDiceDebug && (
                  <div className="mt-3 text-sm text-slate-300">{getDiceDebugLog().map((roll) => `[${roll.join(', ')}]`).join(' ') || 'No rolls yet.'}</div>
                )}
              </div>
            )}
          </section>
          </div>
        )}

        {screen === 'rules' && (
          <div className="flex flex-1 items-center justify-center pb-8">
          <section className={`${appCard} w-full max-w-[1260px] p-8 md:p-10`}>
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black">How to Play</h2>
              <button type="button" onClick={() => setScreen('home')} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                Back
              </button>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {[
                ['Movement', 'White moves 24 to 1, black moves 1 to 24. Dice are separate moves and both must be used whenever legally possible.'],
                ['Blocked points', 'Two or more opposing checkers block a point. A single opposing checker is a blot and can be hit.'],
                ['Bar entry', 'If you have any checker on the bar, you must enter it before moving any other checker.'],
                ['Bearing off', 'You can bear off only after all 15 active checkers are in your home board. Oversized dice remove from the farthest occupied home point only when no checker is farther away.'],
                ['Doubling cube', 'Offer a double before rolling. Accepting doubles the cube and transfers ownership; declining resigns the current game.'],
                ['Scoring', 'Normal win: 1 point. Gammon: 2. Backgammon: 3. Cube multiplies the score.'],
              ].map(([title, copy]) => (
                <article key={title} className="rounded-[1.4rem] border border-slate-200 p-5">
                  <h3 className="text-lg font-bold">{title}</h3>
                  <p className="mt-2 leading-7 text-slate-600">{copy}</p>
                </article>
              ))}
            </div>
          </section>
          </div>
        )}

        {screen === 'game' && (
          <div className="grid h-[calc(100vh-4.75rem)] min-h-[540px] grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden">
            <div className="flex h-12 items-center justify-between gap-2">
              <div className="flex gap-3">
                <button type="button" onClick={() => setScreen('home')} className="inline-flex h-12 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white shadow-lg">
                  <Home className="h-4 w-4" />
                  Home
                </button>
                <button type="button" onClick={() => setScreen('settings')} className="inline-flex h-12 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm">
                  <Settings2 className="h-4 w-4" />
                  Settings
                </button>
              </div>
              <div className="flex h-12 items-center rounded-lg bg-white/80 px-4 text-sm font-semibold text-slate-700 shadow-sm">
                {game.currentTurnMoves.length > 0
                  ? `${game.currentTurnMoves.length} move(s) this turn`
                  : 'Roll to start the turn'}
              </div>
            </div>

            <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_19rem]">
              <div className="relative flex min-h-0 items-start justify-center">
                <Board />
                {game.isGameOver && (
                  <div className="absolute inset-0 z-40 flex items-center justify-center rounded-[1.25rem] bg-slate-950/45 p-6 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-2xl border border-white/60 bg-white p-6 text-center shadow-[0_24px_80px_rgba(15,23,42,0.35)]">
                      <div className="text-xs font-bold uppercase text-sky-700">Game Over</div>
                      <h2 className="mt-3 text-3xl font-black capitalize text-slate-950">{game.winner} wins</h2>
                      <p className="mt-2 text-base text-slate-600 capitalize">
                        {game.winType} for {game.lastScoredPoints} point{game.lastScoredPoints === 1 ? '' : 's'}
                      </p>
                      <div className="mt-6 grid gap-3">
                        {!game.matchWinner && (
                          <button type="button" onClick={game.startNextGame} className="rounded-xl bg-sky-600 px-5 py-3 font-semibold text-white shadow-lg">
                            Next Game
                          </button>
                        )}
                        <button type="button" onClick={() => setScreen('setup')} className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-900 shadow-sm">
                          Rematch Setup
                        </button>
                      </div>
                      {game.matchWinner && (
                        <div className="mt-5 rounded-xl bg-amber-100 px-4 py-3 font-semibold text-amber-900">
                          Match winner: {game.matchWinner}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
                <PlayerPanel />
                <GameControls />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
