import { PERSISTENCE_VERSION } from '../game/constants';
import type { PersistedGame, SettingsState } from '../game/types';

const GAME_KEY = 'tavla.saved-game';
const SETTINGS_KEY = 'tavla.settings';

export const saveGame = (state: PersistedGame['state']): void => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  const payload: PersistedGame = {
    version: PERSISTENCE_VERSION,
    savedAt: new Date().toISOString(),
    state,
  };

  localStorage.setItem(GAME_KEY, JSON.stringify(payload));
};

export const loadGame = (): PersistedGame | null => {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(GAME_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PersistedGame;
    if (parsed.version !== PERSISTENCE_VERSION) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const clearGame = (): void => {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.removeItem(GAME_KEY);
};

export const saveSettings = (settings: SettingsState): void => {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const loadSettings = (): SettingsState | null => {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as SettingsState;
  } catch {
    return null;
  }
};
