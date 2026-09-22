/**
 * Palet Warna Resmi Koperasi Sinar Pagi Sejahtera & Kelompok Tani Minahasa Utara
 *
 * Dirancang khusus dengan estetika agribisnis modern (Harmoni Hijau Hutan Tropis,
 * Kuning Emas Panen Jagung, Cokelat Serat Kelapa/Kopra, serta Netral Bersih).
 */

export const colors = {
  // 1. Forest Green (Warna Utama Pertanian / Daun & Kelapa Subur)
  forest: {
    50: '#f2f8f5',
    100: '#e1efe8',
    200: '#c4e0d2',
    300: '#99c9b3',
    400: '#68ac8f',
    500: '#428f70',
    600: '#1b5a42', // Hijau Utama Koperasi
    700: '#154835', // Hijau Dalam
    800: '#123e2d', // Hijau Daun Tua
    900: '#0c2a1f', // Hijau Pekat
    950: '#061711',
    dark: '#143d2d',
    accent: '#194637',
  },

  // 2. Harvest Gold / Amber (Komoditas Jagung Pipil & Minyak Kelapa / VCO)
  harvest: {
    50: '#fefdf6',
    100: '#fef7e6', // Amber Soft
    200: '#feeec7',
    300: '#fde09b',
    400: '#fbca62',
    500: '#f59e0b', // Emas Jagung Cerah
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // 3. Earth & Coconut Husk (Kopra Putih, Sabut Kelapa & Tanah Vulkanik Minahasa)
  earth: {
    50: '#fbf8f5',
    100: '#f5eee6',
    200: '#ebddcc',
    300: '#ddc6ab',
    400: '#cbab87',
    500: '#b89269',
    600: '#a37c54',
    700: '#836142',
    800: '#6b4f37',
    900: '#58412f',
  },

  // 4. Likupang Coastal Blue (Aksen Air Bersih & Irigasi Ladang)
  coastal: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
  },

  // 5. Neutrals & Canvas (Latar Belakang & Pembatas Bersih)
  slate: {
    25: '#fcfdfb',
    50: '#f8faf7',
    100: '#f1f4f0',
    200: '#e2e7e0',
    300: '#cbd3c8',
    400: '#95a191',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },

  // 6. Semantic Status Colors (Feedback & Notifikasi)
  semantic: {
    success: {
      light: '#ecfdf5',
      border: '#a7f3d0',
      main: '#10b981',
      dark: '#047857',
    },
    warning: {
      light: '#fffbeb',
      border: '#fde68a',
      main: '#f59e0b',
      dark: '#b45309',
    },
    danger: {
      light: '#fef2f2',
      border: '#fecaca',
      main: '#ef4444',
      dark: '#b91c1c',
    },
    info: {
      light: '#eff6ff',
      border: '#bfdbfe',
      main: '#3b82f6',
      dark: '#1d4ed8',
    },
  },
} as const;

/**
 * Pemetaan Token Tema Terpadu untuk UI / Komponen Web
 */
export const themeTokens = {
  brand: {
    primary: colors.forest[700],
    primaryHover: colors.forest[800],
    accent: colors.forest.accent,
    highlight: colors.forest[600],
    surface: colors.forest[50],
  },
  accent: {
    gold: colors.harvest[500],
    goldSoft: colors.harvest[100],
  },
  background: {
    page: '#fafbf9',
    card: '#ffffff',
    subtle: colors.slate[50],
  },
  text: {
    primary: colors.slate[900],
    secondary: colors.slate[600],
    muted: colors.slate[400],
    inverse: '#ffffff',
    accent: colors.forest[700],
  },
  border: {
    subtle: colors.slate[200],
    focused: colors.forest[600],
  },
} as const;

export type ColorPalette = typeof colors;
export type ThemeTokens = typeof themeTokens;

export default colors;
