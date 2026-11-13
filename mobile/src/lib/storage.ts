// Lưu phiên đang làm để đóng hẳn app rồi mở lại vẫn còn.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@/types';

const KEY = 'tro-ly-thu-tuc/session/v1';

export async function loadSession(): Promise<Session | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export async function saveSession(s: Session | null): Promise<void> {
  try {
    if (s) await AsyncStorage.setItem(KEY, JSON.stringify(s));
    else await AsyncStorage.removeItem(KEY);
  } catch {
    // Lưu lỗi không được làm hỏng luồng chính
  }
}
