export type ThemeId =
  | 'burgundy'
  | 'plum'
  | 'emerald'
  | 'rose'
  | 'terracotta'
  | 'ivory';

export type AppearanceMode = 'light' | 'dark';

export interface ThemeTokens {
  primary: string;
  primaryHover: string;
  secondary: string;
  accent: string;
  bg: string;
  surface: string;
  surfaceElevated: string;
  headerBg: string;
  footerBg: string;
  footerText: string;
  textMain: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  inputBg: string;
  btnText: string;
  focusRing: string;
  successBg: string;
  successText: string;
  successBorder: string;
  warningBg: string;
  warningText: string;
  warningBorder: string;
  errorBg: string;
  errorText: string;
  errorBorder: string;
  overlay: string;
}

export interface CoordinatedTheme {
  id: ThemeId;
  name: string;
  description: string;
  swatches: {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
  };
  light: ThemeTokens;
  dark: ThemeTokens;
}

export const COORDINATED_THEMES: CoordinatedTheme[] = [
  {
    id: 'burgundy',
    name: 'Elegant Burgundy',
    description: 'Deep heritage burgundy paired with warm gold and ivory',
    swatches: {
      primary: '#70283b',
      secondary: '#f3dfe0',
      accent: '#b78a4b',
      bg: '#fbf7f0',
    },
    light: {
      primary: '#70283b',
      primaryHover: '#541a29',
      secondary: '#f5e6e8',
      accent: '#b78a4b',
      bg: '#fbf7f0',
      surface: '#ffffff',
      surfaceElevated: '#f6efe6',
      headerBg: 'rgba(251, 247, 240, 0.92)',
      footerBg: '#240c13',
      footerText: '#f7ebe8',
      textMain: '#231c1c',
      textSecondary: '#4e4242',
      textMuted: '#786a69',
      border: '#e6dad4',
      inputBg: '#ffffff',
      btnText: '#ffffff',
      focusRing: '#b78a4b',
      successBg: '#ecfdf5',
      successText: '#065f46',
      successBorder: '#a7f3d0',
      warningBg: '#fffbeb',
      warningText: '#92400e',
      warningBorder: '#fde68a',
      errorBg: '#fef2f2',
      errorText: '#991b1b',
      errorBorder: '#fecaca',
      overlay: 'rgba(20, 10, 14, 0.62)',
    },
    dark: {
      primary: '#d86c86',
      primaryHover: '#e5859c',
      secondary: '#28171c',
      accent: '#d8ab69',
      bg: '#120d0f',
      surface: '#1b1417',
      surfaceElevated: '#241a1e',
      headerBg: 'rgba(18, 13, 15, 0.92)',
      footerBg: '#0c080a',
      footerText: '#f2e6e8',
      textMain: '#f5ecee',
      textSecondary: '#d5c5c8',
      textMuted: '#9e8c90',
      border: '#332429',
      inputBg: '#161013',
      btnText: '#140b0e',
      focusRing: '#d8ab69',
      successBg: 'rgba(6, 95, 70, 0.25)',
      successText: '#6ee7b7',
      successBorder: 'rgba(52, 211, 153, 0.35)',
      warningBg: 'rgba(146, 64, 14, 0.25)',
      warningText: '#fcd34d',
      warningBorder: 'rgba(251, 191, 36, 0.35)',
      errorBg: 'rgba(153, 27, 27, 0.28)',
      errorText: '#fca5a5',
      errorBorder: 'rgba(248, 113, 113, 0.35)',
      overlay: 'rgba(5, 3, 4, 0.78)',
    },
  },
  {
    id: 'plum',
    name: 'Royal Plum',
    description: 'Rich regal plum with muted lavender and soft champagne',
    swatches: {
      primary: '#4e2354',
      secondary: '#ede4f0',
      accent: '#b89762',
      bg: '#faf8fb',
    },
    light: {
      primary: '#4e2354',
      primaryHover: '#38163d',
      secondary: '#efe7f2',
      accent: '#b89762',
      bg: '#faf8fb',
      surface: '#ffffff',
      surfaceElevated: '#f3eef5',
      headerBg: 'rgba(250, 248, 251, 0.92)',
      footerBg: '#1c0d20',
      footerText: '#f2eaf5',
      textMain: '#211b24',
      textSecondary: '#4a404f',
      textMuted: '#75687a',
      border: '#e2dae6',
      inputBg: '#ffffff',
      btnText: '#ffffff',
      focusRing: '#b89762',
      successBg: '#ecfdf5',
      successText: '#065f46',
      successBorder: '#a7f3d0',
      warningBg: '#fffbeb',
      warningText: '#92400e',
      warningBorder: '#fde68a',
      errorBg: '#fef2f2',
      errorText: '#991b1b',
      errorBorder: '#fecaca',
      overlay: 'rgba(18, 10, 22, 0.62)',
    },
    dark: {
      primary: '#c485d1',
      primaryHover: '#d39ce0',
      secondary: '#231729',
      accent: '#dbb984',
      bg: '#100c13',
      surface: '#19131e',
      surfaceElevated: '#231b2a',
      headerBg: 'rgba(16, 12, 19, 0.92)',
      footerBg: '#0b080e',
      footerText: '#ede4f2',
      textMain: '#f3edf7',
      textSecondary: '#cfc3d6',
      textMuted: '#998aa3',
      border: '#302438',
      inputBg: '#151019',
      btnText: '#140c18',
      focusRing: '#dbb984',
      successBg: 'rgba(6, 95, 70, 0.25)',
      successText: '#6ee7b7',
      successBorder: 'rgba(52, 211, 153, 0.35)',
      warningBg: 'rgba(146, 64, 14, 0.25)',
      warningText: '#fcd34d',
      warningBorder: 'rgba(251, 191, 36, 0.35)',
      errorBg: 'rgba(153, 27, 27, 0.28)',
      errorText: '#fca5a5',
      errorBorder: 'rgba(248, 113, 113, 0.35)',
      overlay: 'rgba(6, 4, 8, 0.78)',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald Green',
    description: 'Deep jewel emerald with tranquil sage and warm gold',
    swatches: {
      primary: '#144d43',
      secondary: '#e2efec',
      accent: '#b88b3a',
      bg: '#f7faf8',
    },
    light: {
      primary: '#144d43',
      primaryHover: '#0d362f',
      secondary: '#e3f0ed',
      accent: '#b88b3a',
      bg: '#f7faf8',
      surface: '#ffffff',
      surfaceElevated: '#edf4f1',
      headerBg: 'rgba(247, 250, 248, 0.92)',
      footerBg: '#09221e',
      footerText: '#e6f2ef',
      textMain: '#182421',
      textSecondary: '#3b4d48',
      textMuted: '#647872',
      border: '#d6e3de',
      inputBg: '#ffffff',
      btnText: '#ffffff',
      focusRing: '#b88b3a',
      successBg: '#ecfdf5',
      successText: '#065f46',
      successBorder: '#a7f3d0',
      warningBg: '#fffbeb',
      warningText: '#92400e',
      warningBorder: '#fde68a',
      errorBg: '#fef2f2',
      errorText: '#991b1b',
      errorBorder: '#fecaca',
      overlay: 'rgba(8, 22, 19, 0.62)',
    },
    dark: {
      primary: '#4fd1b5',
      primaryHover: '#6ee0c7',
      secondary: '#122622',
      accent: '#deb15d',
      bg: '#0b1210',
      surface: '#131e1b',
      surfaceElevated: '#1a2925',
      headerBg: 'rgba(11, 18, 16, 0.92)',
      footerBg: '#070c0b',
      footerText: '#e2f0ec',
      textMain: '#eaf4f1',
      textSecondary: '#bdd1cb',
      textMuted: '#849e97',
      border: '#233631',
      inputBg: '#0f1816',
      btnText: '#081714',
      focusRing: '#deb15d',
      successBg: 'rgba(6, 95, 70, 0.25)',
      successText: '#6ee7b7',
      successBorder: 'rgba(52, 211, 153, 0.35)',
      warningBg: 'rgba(146, 64, 14, 0.25)',
      warningText: '#fcd34d',
      warningBorder: 'rgba(251, 191, 36, 0.35)',
      errorBg: 'rgba(153, 27, 27, 0.28)',
      errorText: '#fca5a5',
      errorBorder: 'rgba(248, 113, 113, 0.35)',
      overlay: 'rgba(3, 8, 7, 0.78)',
    },
  },
  {
    id: 'rose',
    name: 'Rose Pink',
    description: 'Sophisticated rose with dusty blush and muted berry',
    swatches: {
      primary: '#942953',
      secondary: '#f9e6ed',
      accent: '#7a1c40',
      bg: '#fffafb',
    },
    light: {
      primary: '#942953',
      primaryHover: '#731d3f',
      secondary: '#f9e6ed',
      accent: '#b57c4a',
      bg: '#fffafb',
      surface: '#ffffff',
      surfaceElevated: '#faeff3',
      headerBg: 'rgba(255, 250, 251, 0.92)',
      footerBg: '#2b0d19',
      footerText: '#faeaf0',
      textMain: '#261b20',
      textSecondary: '#543f47',
      textMuted: '#826a73',
      border: '#ead6de',
      inputBg: '#ffffff',
      btnText: '#ffffff',
      focusRing: '#942953',
      successBg: '#ecfdf5',
      successText: '#065f46',
      successBorder: '#a7f3d0',
      warningBg: '#fffbeb',
      warningText: '#92400e',
      warningBorder: '#fde68a',
      errorBg: '#fef2f2',
      errorText: '#991b1b',
      errorBorder: '#fecaca',
      overlay: 'rgba(28, 10, 18, 0.62)',
    },
    dark: {
      primary: '#eb75a0',
      primaryHover: '#f291b5',
      secondary: '#29151e',
      accent: '#e0ab7b',
      bg: '#130c10',
      surface: '#1d1318',
      surfaceElevated: '#281a21',
      headerBg: 'rgba(19, 12, 16, 0.92)',
      footerBg: '#0d070a',
      footerText: '#f5e4eb',
      textMain: '#f7ecf0',
      textSecondary: '#d9c3cb',
      textMuted: '#a38993',
      border: '#38232c',
      inputBg: '#170f13',
      btnText: '#1a0b11',
      focusRing: '#eb75a0',
      successBg: 'rgba(6, 95, 70, 0.25)',
      successText: '#6ee7b7',
      successBorder: 'rgba(52, 211, 153, 0.35)',
      warningBg: 'rgba(146, 64, 14, 0.25)',
      warningText: '#fcd34d',
      warningBorder: 'rgba(251, 191, 36, 0.35)',
      errorBg: 'rgba(153, 27, 27, 0.28)',
      errorText: '#fca5a5',
      errorBorder: 'rgba(248, 113, 113, 0.35)',
      overlay: 'rgba(7, 3, 5, 0.78)',
    },
  },
  {
    id: 'terracotta',
    name: 'Warm Terracotta',
    description: 'Artisanal Jaipur terracotta with muted clay and soft beige',
    swatches: {
      primary: '#9c4221',
      secondary: '#f5e6df',
      accent: '#b47844',
      bg: '#fcf8f4',
    },
    light: {
      primary: '#9c4221',
      primaryHover: '#7b3116',
      secondary: '#f5e6df',
      accent: '#b47844',
      bg: '#fcf8f4',
      surface: '#ffffff',
      surfaceElevated: '#f6ede6',
      headerBg: 'rgba(252, 248, 244, 0.92)',
      footerBg: '#261109',
      footerText: '#f7eae4',
      textMain: '#261e1a',
      textSecondary: '#54433b',
      textMuted: '#806b61',
      border: '#e8d9cf',
      inputBg: '#ffffff',
      btnText: '#ffffff',
      focusRing: '#b47844',
      successBg: '#ecfdf5',
      successText: '#065f46',
      successBorder: '#a7f3d0',
      warningBg: '#fffbeb',
      warningText: '#92400e',
      warningBorder: '#fde68a',
      errorBg: '#fef2f2',
      errorText: '#991b1b',
      errorBorder: '#fecaca',
      overlay: 'rgba(26, 14, 9, 0.62)',
    },
    dark: {
      primary: '#eb8258',
      primaryHover: '#f39874',
      secondary: '#291913',
      accent: '#dfa671',
      bg: '#130e0b',
      surface: '#1d1511',
      surfaceElevated: '#281d18',
      headerBg: 'rgba(19, 14, 11, 0.92)',
      footerBg: '#0d0907',
      footerText: '#f5e8e2',
      textMain: '#f7eee9',
      textSecondary: '#d9c7be',
      textMuted: '#a38e84',
      border: '#382820',
      inputBg: '#17110e',
      btnText: '#1a0e09',
      focusRing: '#dfa671',
      successBg: 'rgba(6, 95, 70, 0.25)',
      successText: '#6ee7b7',
      successBorder: 'rgba(52, 211, 153, 0.35)',
      warningBg: 'rgba(146, 64, 14, 0.25)',
      warningText: '#fcd34d',
      warningBorder: 'rgba(251, 191, 36, 0.35)',
      errorBg: 'rgba(153, 27, 27, 0.28)',
      errorText: '#fca5a5',
      errorBorder: 'rgba(248, 113, 113, 0.35)',
      overlay: 'rgba(8, 5, 3, 0.78)',
    },
  },
  {
    id: 'ivory',
    name: 'Classic Ivory',
    description: 'Editorial dark charcoal with warm taupe and muted gold on ivory',
    swatches: {
      primary: '#292524',
      secondary: '#ede8e1',
      accent: '#a37f46',
      bg: '#fdfbf7',
    },
    light: {
      primary: '#292524',
      primaryHover: '#141211',
      secondary: '#ede8e1',
      accent: '#a37f46',
      bg: '#fdfbf7',
      surface: '#ffffff',
      surfaceElevated: '#f5f1ea',
      headerBg: 'rgba(253, 251, 247, 0.92)',
      footerBg: '#171413',
      footerText: '#f2eee9',
      textMain: '#1c1917',
      textSecondary: '#44403c',
      textMuted: '#78716c',
      border: '#e5e0d8',
      inputBg: '#ffffff',
      btnText: '#ffffff',
      focusRing: '#a37f46',
      successBg: '#ecfdf5',
      successText: '#065f46',
      successBorder: '#a7f3d0',
      warningBg: '#fffbeb',
      warningText: '#92400e',
      warningBorder: '#fde68a',
      errorBg: '#fef2f2',
      errorText: '#991b1b',
      errorBorder: '#fecaca',
      overlay: 'rgba(18, 16, 15, 0.62)',
    },
    dark: {
      primary: '#e7e2da',
      primaryHover: '#ffffff',
      secondary: '#24211f',
      accent: '#cfb078',
      bg: '#0f0e0d',
      surface: '#171614',
      surfaceElevated: '#211f1c',
      headerBg: 'rgba(15, 14, 13, 0.92)',
      footerBg: '#090808',
      footerText: '#ede9e4',
      textMain: '#f5f2ed',
      textSecondary: '#d1cbc3',
      textMuted: '#968f87',
      border: '#2e2b28',
      inputBg: '#131210',
      btnText: '#141311',
      focusRing: '#cfb078',
      successBg: 'rgba(6, 95, 70, 0.25)',
      successText: '#6ee7b7',
      successBorder: 'rgba(52, 211, 153, 0.35)',
      warningBg: 'rgba(146, 64, 14, 0.25)',
      warningText: '#fcd34d',
      warningBorder: 'rgba(251, 191, 36, 0.35)',
      errorBg: 'rgba(153, 27, 27, 0.28)',
      errorText: '#fca5a5',
      errorBorder: 'rgba(248, 113, 113, 0.35)',
      overlay: 'rgba(4, 4, 3, 0.78)',
    },
  },
];

export const THEME_STORAGE_KEY = 'ishq_theme_id';
export const LEGACY_THEME_STORAGE_KEY = 'ishq_theme';
export const APPEARANCE_MANUAL_KEY = 'ishq_appearance_manual';

/**
 * Resolves a ThemeId from stored values, supporting legacy theme names if present.
 */
export function resolveThemeById(savedIdOrJson?: string | null): CoordinatedTheme {
  if (!savedIdOrJson) return COORDINATED_THEMES[0];

  const trimmed = savedIdOrJson.trim();
  const direct = COORDINATED_THEMES.find((t) => t.id === trimmed || t.name === trimmed);
  if (direct) return direct;

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') {
      if (parsed.id) {
        const byId = COORDINATED_THEMES.find((t) => t.id === parsed.id);
        if (byId) return byId;
      }
      if (parsed.name) {
        const nameLower = String(parsed.name).toLowerCase();
        if (nameLower.includes('emerald')) return COORDINATED_THEMES.find((t) => t.id === 'emerald')!;
        if (nameLower.includes('plum') || nameLower.includes('peacock')) return COORDINATED_THEMES.find((t) => t.id === 'plum')!;
        if (nameLower.includes('rose')) return COORDINATED_THEMES.find((t) => t.id === 'rose')!;
        if (nameLower.includes('terracotta') || nameLower.includes('crimson')) return COORDINATED_THEMES.find((t) => t.id === 'terracotta')!;
        if (nameLower.includes('ivory')) return COORDINATED_THEMES.find((t) => t.id === 'ivory')!;
      }
    }
  } catch {}

  return COORDINATED_THEMES[0];
}

/**
 * Resolves the active appearance mode based on priority:
 * 1. Explicit manual user preference ('light' | 'dark')
 * 2. Device system preference via prefers-color-scheme: dark
 * 3. Default 'light'
 */
export function resolveAppearanceMode(
  manualPreference: string | null | undefined,
  systemPrefersDark: boolean
): AppearanceMode {
  if (manualPreference === 'dark' || manualPreference === 'light') {
    return manualPreference;
  }
  return systemPrefersDark ? 'dark' : 'light';
}

/**
 * Applies the active theme tokens and appearance mode to the root HTML element.
 */
export function applyThemeToDocument(theme: CoordinatedTheme, mode: AppearanceMode): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const tokens = mode === 'dark' ? theme.dark : theme.light;

  root.setAttribute('data-theme', theme.id);
  root.setAttribute('data-mode', mode);
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  root.style.setProperty('--primary', tokens.primary);
  root.style.setProperty('--primary-hover', tokens.primaryHover);
  root.style.setProperty('--secondary', tokens.secondary);
  root.style.setProperty('--accent', tokens.accent);
  root.style.setProperty('--bg', tokens.bg);
  root.style.setProperty('--surface', tokens.surface);
  root.style.setProperty('--surface-elevated', tokens.surfaceElevated);
  root.style.setProperty('--header-bg', tokens.headerBg);
  root.style.setProperty('--footer-bg', tokens.footerBg);
  root.style.setProperty('--footer-text', tokens.footerText);
  root.style.setProperty('--text-main', tokens.textMain);
  root.style.setProperty('--text-secondary', tokens.textSecondary);
  root.style.setProperty('--text-muted', tokens.textMuted);
  root.style.setProperty('--border', tokens.border);
  root.style.setProperty('--input-bg', tokens.inputBg);
  root.style.setProperty('--btn-text', tokens.btnText);
  root.style.setProperty('--focus-ring', tokens.focusRing);
  root.style.setProperty('--success-bg', tokens.successBg);
  root.style.setProperty('--success-text', tokens.successText);
  root.style.setProperty('--success-border', tokens.successBorder);
  root.style.setProperty('--warning-bg', tokens.warningBg);
  root.style.setProperty('--warning-text', tokens.warningText);
  root.style.setProperty('--warning-border', tokens.warningBorder);
  root.style.setProperty('--error-bg', tokens.errorBg);
  root.style.setProperty('--error-text', tokens.errorText);
  root.style.setProperty('--error-border', tokens.errorBorder);
  root.style.setProperty('--overlay', tokens.overlay);

  // Legacy CSS variable aliases for full compatibility
  root.style.setProperty('--wine', tokens.primary);
  root.style.setProperty('--wine2', tokens.primaryHover);
  root.style.setProperty('--rose', tokens.secondary);
  root.style.setProperty('--cream', tokens.bg);
  root.style.setProperty('--gold', tokens.accent);
  root.style.setProperty('--ink', tokens.textMain);
  root.style.setProperty('--muted', tokens.textMuted);
  root.style.setProperty('--line', tokens.border);
}
