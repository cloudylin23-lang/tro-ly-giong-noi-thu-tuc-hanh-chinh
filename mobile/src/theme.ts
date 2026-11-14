// Token thiết kế cho người lớn tuổi: chữ to, tương phản cao, vùng bấm lớn.
// 👤 C sở hữu file này.

export const palette = {
  ivory: '#FAFAEB',
  blackRose: '#1B0905',
  scarlet: '#F02300',
  mint: '#AAD7CD',
};

export const colors = {
  bg: palette.ivory,
  surface: palette.ivory,
  text: palette.blackRose,
  textMuted: palette.blackRose,
  border: palette.mint,
  primary: palette.mint,
  primaryPressed: '#91C0B5',
  primarySoft: '#D2E9DC',
  onPrimary: palette.blackRose,
  important: palette.scarlet,
  importantPressed: '#D11E00',
  onImportant: palette.ivory,
  record: palette.scarlet,
  recordPressed: '#D11E00',
  onRecord: palette.ivory,
  success: palette.blackRose,
  successBg: palette.mint,
  warningBg: palette.ivory,
  danger: palette.scarlet,
};

export const font = {
  xxl: 38,
  xl: 32,
  lg: 27,
  md: 23,
  sm: 20,
};

export const space = {
  xs: 6,
  sm: 12,
  md: 18,
  lg: 26,
  xl: 36,
};

export const radius = 22;

/** Chiều cao tối thiểu cho mọi nút bấm */
export const touch = 72;

export const layout = { pageWidth: 520 };

/** Giới hạn phóng chữ hệ thống để layout không vỡ (vẫn cho phép phóng to 1.3x) */
export const maxFontScale = 1.3;

/** Tỉ lệ bộ thu âm ở trang chủ, thu nhỏ theo chiều rộng điện thoại. */
export const recorderDesign = {
  diameter: 296,
  innerRingRatio: 0.88,
  buttonRatio: 0.72,
  iconRatio: 0.34,
  stroke: 3,
  pageWidth: layout.pageWidth,
};
