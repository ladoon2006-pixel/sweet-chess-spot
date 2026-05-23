import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface BoardTheme {
  name: string;
  light: string;
  dark: string;
}

export interface PieceTheme {
  name: string;
  white: string;
  black: string;
}

export const BOARD_THEMES: BoardTheme[] = [
  { name: "کلاسیک", light: "#f0d9b5", dark: "#b58863" },
  { name: "زمردی", light: "#eeeed2", dark: "#769656" },
  { name: "اقیانوس", light: "#dee3e6", dark: "#8ca2ad" },
  { name: "شب", light: "#3a3a3a", dark: "#1c1c1c" },
  { name: "گل سرخ", light: "#fbe9e7", dark: "#c2185b" },
  { name: "بنفش رویایی", light: "#ede7f6", dark: "#673ab7" },
];

export const PIECE_THEMES: PieceTheme[] = [
  { name: "سفید و سیاه", white: "#ffffff", black: "#1a1a1a" },
  { name: "کرم و قهوه‌ای", white: "#fff8e1", black: "#3e2723" },
  { name: "طلایی و مشکی", white: "#ffd54f", black: "#212121" },
  { name: "آبی و قرمز", white: "#42a5f5", black: "#e53935" },
];

interface SettingsState {
  boardThemeIdx: number;
  pieceThemeIdx: number;
  soundEnabled: boolean;
  aiDifficulty: 1 | 2 | 3;
  setBoardTheme: (i: number) => void;
  setPieceTheme: (i: number) => void;
  setSoundEnabled: (v: boolean) => void;
  setAiDifficulty: (v: 1 | 2 | 3) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      boardThemeIdx: 0,
      pieceThemeIdx: 0,
      soundEnabled: true,
      aiDifficulty: 2,
      setBoardTheme: (i) => set({ boardThemeIdx: i }),
      setPieceTheme: (i) => set({ pieceThemeIdx: i }),
      setSoundEnabled: (v) => set({ soundEnabled: v }),
      setAiDifficulty: (v) => set({ aiDifficulty: v }),
    }),
    { name: "chess-settings" },
  ),
);
