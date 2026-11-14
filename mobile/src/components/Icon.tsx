import { View } from 'react-native';
import { colors } from '@/theme';

export type IconName = 'home' | 'idCard' | 'close' | 'check' | 'warning' | 'clock' | 'hourglass' | 'money' | 'file' | 'volume' | 'repeat' | 'return' | 'keyboard' | 'mic' | 'share' | 'map';
type Line = [number, number, number, number];

const lines: Record<IconName, Line[]> = {
  home: [[2, 11, 12, 3], [12, 3, 22, 11], [5, 9, 5, 21], [5, 21, 10, 21], [10, 21, 10, 14], [10, 14, 14, 14], [14, 14, 14, 21], [14, 21, 19, 21], [19, 21, 19, 9]],
  idCard: [[5, 17, 5, 16], [5, 16, 7, 14], [7, 14, 9, 14], [9, 14, 11, 16], [11, 16, 11, 17], [14, 9, 19, 9], [14, 13, 19, 13], [14, 17, 17, 17]],
  close: [[5, 5, 19, 19], [19, 5, 5, 19]],
  check: [[4, 12, 9, 17], [9, 17, 20, 6]],
  warning: [[12, 3, 22, 21], [22, 21, 2, 21], [2, 21, 12, 3], [12, 9, 12, 14], [12, 17, 12, 18]],
  clock: [[12, 6, 12, 12], [12, 12, 16, 14]],
  hourglass: [[5, 3, 19, 3], [5, 21, 19, 21], [7, 3, 7, 7], [7, 7, 17, 17], [17, 17, 17, 21], [17, 3, 17, 7], [17, 7, 7, 17], [7, 17, 7, 21]],
  money: [[5, 7, 5, 8], [19, 16, 19, 17]],
  file: [[5, 3, 14, 3], [14, 3, 20, 9], [20, 9, 20, 21], [20, 21, 5, 21], [5, 21, 5, 3], [14, 3, 14, 9], [14, 9, 20, 9], [9, 13, 16, 13], [9, 17, 16, 17]],
  volume: [[3, 9, 7, 9], [7, 9, 12, 5], [12, 5, 12, 19], [12, 19, 7, 15], [7, 15, 3, 15], [3, 15, 3, 9], [16, 8, 18, 10], [18, 10, 18, 14], [18, 14, 16, 16], [19, 5, 22, 9], [22, 9, 22, 15], [22, 15, 19, 19]],
  repeat: [[19, 8, 16, 4], [16, 4, 8, 4], [8, 4, 4, 8], [4, 8, 4, 12], [19, 3, 19, 8], [19, 8, 14, 8], [5, 16, 8, 20], [8, 20, 16, 20], [16, 20, 20, 16], [20, 16, 20, 12], [5, 21, 5, 16], [5, 16, 10, 16]],
  return: [[9, 5, 4, 10], [4, 10, 9, 15], [4, 10, 15, 10], [15, 10, 20, 14], [20, 14, 20, 19]],
  keyboard: [[5, 8, 6, 8], [9, 8, 10, 8], [14, 8, 15, 8], [18, 8, 19, 8], [5, 12, 6, 12], [9, 12, 10, 12], [14, 12, 15, 12], [18, 12, 19, 12], [7, 16, 17, 16]],
  mic: [[5, 11, 5, 14], [5, 14, 8, 18], [8, 18, 16, 18], [16, 18, 19, 14], [19, 14, 19, 11], [12, 18, 12, 22], [8, 22, 16, 22]],
  share: [[12, 16, 12, 3], [12, 3, 7, 8], [12, 3, 17, 8], [5, 12, 3, 12], [3, 12, 3, 21], [3, 21, 21, 21], [21, 21, 21, 12], [21, 12, 19, 12]],
  map: [[12, 22, 5, 12], [5, 12, 5, 7], [5, 7, 8, 3], [8, 3, 16, 3], [16, 3, 19, 7], [19, 7, 19, 12], [19, 12, 12, 22], [10, 8, 14, 8], [14, 8, 14, 12], [14, 12, 10, 12], [10, 12, 10, 8]],
};

/** Icon nét vẽ bằng View native, dùng được trên web và điện thoại, không cần font icon. */
export function Icon({ name, size = 26, color = colors.text }: { name: IconName; size?: number; color?: string }) {
  const unit = size / 24;
  const stroke = 1.8 * unit;
  const frame = name === 'clock' ? [2, 2, 20, 20, 10]
    : name === 'money' ? [2, 5, 20, 14, 2]
      : name === 'keyboard' || name === 'idCard' ? [2, 4, 20, 16, 2]
        : name === 'mic' ? [8, 2, 8, 13, 4] : null;
  return (
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size, flexShrink: 0 }}>
      {frame ? <View style={{ position: 'absolute', left: frame[0] * unit, top: frame[1] * unit, width: frame[2] * unit, height: frame[3] * unit, borderRadius: frame[4] * unit, borderWidth: stroke, borderColor: color }} /> : null}
      {name === 'money' ? <View style={{ position: 'absolute', left: 9 * unit, top: 8 * unit, width: 6 * unit, height: 8 * unit, borderRadius: 4 * unit, borderWidth: stroke, borderColor: color }} /> : null}
      {name === 'idCard' ? <View style={{ position: 'absolute', left: 6 * unit, top: 7 * unit, width: 4 * unit, height: 4 * unit, borderRadius: 2 * unit, borderWidth: stroke, borderColor: color }} /> : null}
      {lines[name].map(([x1, y1, x2, y2], index) => (
        <View key={index} style={{ position: 'absolute', left: (x1 + x2) / 2 * unit - Math.hypot(x2 - x1, y2 - y1) * unit / 2, top: (y1 + y2) / 2 * unit - stroke / 2, width: Math.hypot(x2 - x1, y2 - y1) * unit, height: stroke, borderRadius: stroke / 2, backgroundColor: color, transform: [{ rotate: `${Math.atan2(y2 - y1, x2 - x1)}rad` }] }} />
      ))}
    </View>
  );
}
