import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { GameState, Player } from '../game/types';

export type SeatColor = Player;

export interface OnlineSeat {
  roomId: string;
  seat: SeatColor;
  playerId: string | null;
  playerName: string | null;
  ready: boolean;
}

export interface OnlineRoom {
  id: string;
  name: string;
  matchTarget: number;
  status: 'open' | 'playing' | 'closed';
  gameId: string | null;
  seats: Record<SeatColor, OnlineSeat>;
}

interface RoomRow {
  id: string;
  name: string;
  match_target: number;
  status: OnlineRoom['status'];
  game_id: string | null;
}

interface SeatRow {
  room_id: string;
  seat: SeatColor;
  player_id: string | null;
  player_name: string | null;
  ready: boolean;
}

const emptySeat = (roomId: string, seat: SeatColor): OnlineSeat => ({
  roomId,
  seat,
  playerId: null,
  playerName: null,
  ready: false,
});

const toRooms = (rooms: RoomRow[], seats: SeatRow[]): OnlineRoom[] =>
  rooms.map((room) => {
    const roomSeats = seats.filter((seat) => seat.room_id === room.id);

    return {
      id: room.id,
      name: room.name,
      matchTarget: room.match_target,
      status: room.status,
      gameId: room.game_id,
      seats: roomSeats.reduce(
        (acc, seat) => ({
          ...acc,
          [seat.seat]: {
            roomId: room.id,
            seat: seat.seat,
            playerId: seat.player_id,
            playerName: seat.player_name,
            ready: seat.ready,
          },
        }),
        {
          white: emptySeat(room.id, 'white'),
          black: emptySeat(room.id, 'black'),
        } as Record<SeatColor, OnlineSeat>,
      ),
    };
  });

export const fetchOnlineRooms = async (): Promise<OnlineRoom[]> => {
  if (!supabase) {
    return [];
  }

  const [{ data: rooms, error: roomsError }, { data: seats, error: seatsError }] = await Promise.all([
    supabase
      .from('play_rooms')
      .select('id,name,match_target,status,game_id')
      .order('created_at', { ascending: true }),
    supabase
      .from('play_room_seats')
      .select('room_id,seat,player_id,player_name,ready'),
  ]);

  if (roomsError) {
    throw roomsError;
  }
  if (seatsError) {
    throw seatsError;
  }

  return toRooms((rooms ?? []) as RoomRow[], (seats ?? []) as SeatRow[]);
};

export const sitOnlineSeat = async (
  roomId: string,
  seat: SeatColor,
  playerId: string,
  playerName: string,
) => {
  if (!supabase) {
    return;
  }

  const { error } = await supabase
    .from('play_room_seats')
    .update({ player_id: playerId, player_name: playerName, ready: false })
    .eq('room_id', roomId)
    .eq('seat', seat)
    .is('player_id', null);

  if (error) {
    throw error;
  }
};

export const leaveOnlineSeat = async (roomId: string, seat: SeatColor, playerId: string) => {
  if (!supabase) {
    return;
  }

  const { error } = await supabase
    .from('play_room_seats')
    .update({ player_id: null, player_name: null, ready: false })
    .eq('room_id', roomId)
    .eq('seat', seat)
    .eq('player_id', playerId);

  if (error) {
    throw error;
  }
};

export const setOnlineSeatReady = async (
  roomId: string,
  seat: SeatColor,
  playerId: string,
  ready: boolean,
) => {
  if (!supabase) {
    return;
  }

  const { error } = await supabase
    .from('play_room_seats')
    .update({ ready })
    .eq('room_id', roomId)
    .eq('seat', seat)
    .eq('player_id', playerId);

  if (error) {
    throw error;
  }
};

export const createOnlineGame = async (
  room: OnlineRoom,
  initialState: GameState,
): Promise<string | null> => {
  if (!supabase) {
    return null;
  }

  const { data: game, error: gameError } = await supabase
    .from('online_games')
    .insert({ room_id: room.id, state: initialState })
    .select('id')
    .single();

  if (gameError) {
    throw gameError;
  }

  const gameId = game.id as string;
  const { error: roomError } = await supabase
    .from('play_rooms')
    .update({ status: 'playing', game_id: gameId })
    .eq('id', room.id)
    .eq('status', 'open');

  if (roomError) {
    throw roomError;
  }

  return gameId;
};

export const fetchOnlineGameState = async (gameId: string): Promise<GameState | null> => {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('online_games')
    .select('state')
    .eq('id', gameId)
    .single();

  if (error) {
    throw error;
  }

  return data.state as GameState;
};

export const updateOnlineGameState = async (gameId: string, state: GameState) => {
  if (!supabase) {
    return;
  }

  const { error } = await supabase
    .from('online_games')
    .update({ state })
    .eq('id', gameId);

  if (error) {
    throw error;
  }
};

export const subscribeOnlineRooms = (onChange: () => void): RealtimeChannel | null => {
  if (!supabase) {
    return null;
  }

  return supabase
    .channel('play-rooms')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'play_rooms' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'play_room_seats' }, onChange)
    .subscribe();
};

export const subscribeOnlineGame = (
  gameId: string,
  onChange: (state: GameState) => void,
): RealtimeChannel | null => {
  if (!supabase) {
    return null;
  }

  return supabase
    .channel(`online-game-${gameId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'online_games', filter: `id=eq.${gameId}` },
      (payload) => {
        const next = payload.new as { state?: GameState };
        if (next.state) {
          onChange(next.state);
        }
      },
    )
    .subscribe();
};

export const removeChannel = (channel: RealtimeChannel | null) => {
  if (supabase && channel) {
    void supabase.removeChannel(channel);
  }
};
