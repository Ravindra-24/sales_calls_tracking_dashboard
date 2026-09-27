import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import type {} from '@mui/x-date-pickers/themeAugmentation';
import { useTheme } from '../context/theme';

// MUI palette helpers need concrete colours, so these mirror the index.css
// tokens; field surfaces still read the CSS variables directly.
const palettes = {
  dark: { primary: '#4f8cff', paper: '#111a2e', text: '#f8fafc', secondaryText: '#94a3b8' },
  light: { primary: '#2563eb', paper: '#ffffff', text: '#0f172a', secondaryText: '#64748b' },
};

/** Scopes MUI fields and date pickers to the dashboard's light/dark theme. */
export const MuiFieldProvider = ({ children }: { children: ReactNode }) => {
  const { resolvedTheme } = useTheme();
  const theme = useMemo(() => {
    const colors = palettes[resolvedTheme];
    return createTheme({
      palette: {
        mode: resolvedTheme,
        primary: { main: colors.primary },
        background: { paper: colors.paper, default: colors.paper },
        text: { primary: colors.text, secondary: colors.secondaryText },
      },
      shape: { borderRadius: 8 },
      typography: { fontFamily: 'inherit' },
      components: {
        MuiOutlinedInput: {
          styleOverrides: { root: { background: 'var(--bg-control)' }, notchedOutline: { borderColor: 'var(--border)' } },
        },
        MuiPickersOutlinedInput: {
          styleOverrides: { root: { background: 'var(--bg-control)' }, notchedOutline: { borderColor: 'var(--border)' } },
        },
      },
    });
  }, [resolvedTheme]);

  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>{children}</LocalizationProvider>
    </ThemeProvider>
  );
};
