// Token thiết kế cho người lớn tuổi: chữ to, tương phản cao, vùng bấm lớn.
// 👤 C sở hữu file này.

export const palette = {
  white: '#FFFFFF',
  charcoal: '#222222',
  red: '#D71920',
  deepRed: '#980A08',
  gold: '#E7C899',
};

export const colors = {
  bg: palette.white,
  surface: palette.white,
  text: palette.charcoal,
  textMuted: '#595959',
  border: '#E9C9CA',
  primary: palette.red,
  primaryPressed: '#B8141A',
  primarySoft: '#FBE8E8',
  onPrimary: palette.white,
  secondary: palette.white,
  secondaryPressed: '#FBE8E8',
  onSecondary: palette.red,
  header: palette.deepRed,
  onHeader: palette.white,
  accent: palette.gold,
  recordHalo: palette.gold,
  recordHaloSoft: '#F8EFDF',
  important: palette.red,
  importantPressed: '#B8141A',
  onImportant: palette.white,
  record: palette.red,
  recordPressed: '#B8141A',
  onRecord: palette.white,
  success: palette.charcoal,
  successBg: '#F8EFDF',
  warningBg: palette.white,
  danger: palette.red,
  scrim: 'rgba(34, 34, 34, 0.35)',
};

export const font = {
  xxl: 30,
  xl: 26,
  lg: 22,
  md: 20,
  sm: 20,
};

export const fontFamily = 'BeVietnamPro';

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
};

export const radius = 22;

/** Header gọn hơn khoảng 20%, giữ chữ tối thiểu 20px. */
export const headerFont = {
  title: Math.max(font.sm, Math.round(font.xl * 0.8)),
  subtitle: font.sm,
};

/** Chiều cao tối thiểu cho mọi nút bấm */
export const touch = 72;

export const layout = { pageWidth: 520 };

/** Giới hạn phóng chữ hệ thống để layout không vỡ (vẫn cho phép phóng to 1.3x) */
export const maxFontScale = 1.3;

/** Tỉ lệ bộ thu âm ở trang chủ, thu nhỏ theo chiều rộng điện thoại. */
export const recorderDesign = {
  diameter: 168,
  compactDiameter: 136,
  compactHeight: 850,
  innerRingRatio: 0.88,
  buttonRatio: 0.72,
  iconRatio: 0.34,
  stroke: 3,
  pageWidth: layout.pageWidth,
};
