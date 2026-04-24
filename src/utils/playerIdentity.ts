const PLAYER_ID_KEY = 'tavla.player-id';
const PLAYER_NAME_KEY = 'tavla.player-name';

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `player-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const getPlayerId = (): string => {
  const existing = localStorage.getItem(PLAYER_ID_KEY);
  if (existing) {
    return existing;
  }

  const id = createId();
  localStorage.setItem(PLAYER_ID_KEY, id);
  return id;
};

export const getPlayerName = (): string => {
  const existing = localStorage.getItem(PLAYER_NAME_KEY);
  if (existing) {
    return existing;
  }

  const name = `Guest ${getPlayerId().slice(0, 4).toUpperCase()}`;
  localStorage.setItem(PLAYER_NAME_KEY, name);
  return name;
};
