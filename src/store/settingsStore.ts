import { create } from 'zustand';
import type { SettingsState, ThemeName } from '../game/types';
import { loadSettings, saveSettings } from '../utils/persistence';

interface SettingsStore extends SettingsState {
  setTheme: (theme: ThemeName) => void;
  patchSettings: (updates: Partial<SettingsState>) => void;
}

const defaultSettings: SettingsState = {
  soundEnabled: true,
  highlightLegalMoves: true,
  autoConfirmForcedMoves: false,
  boardFlipped: false,
  whiteAtBottom: true,
  animationSpeed: 'normal',
  theme: 'classic',
  aiDelayMs: 700,
  showDiceDebug: false,
};

const persist = (state: SettingsState) => saveSettings(state);

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...defaultSettings,
  ...loadSettings(),
  setTheme: (theme) =>
    set((state) => {
      const next = { ...state, theme };
      persist(next);
      return next;
    }),
  patchSettings: (updates) =>
    set((state) => {
      const next = { ...state, ...updates };
      persist(next);
      return next;
    }),
}));
