import { createContext, useContext } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  resolvedTheme: 'dark',
  setMode: () => undefined,
});

export const useTheme = () => useContext(ThemeContext);
