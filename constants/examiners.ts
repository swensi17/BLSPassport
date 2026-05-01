import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'bls_examiners_v2';

export const DEFAULT_EXAMINERS = [
  'Хайдаров А.Б.',
  'Махмудов О.Р.',
  'Батыров Д.К.',
  'Рашидова З.М.',
  'Усманов Т.Ф.',
  'Назарова Г.Х.',
  'Каримов А.Н.',
  'Юсупова М.Р.',
];

// Built-in fallback for sync access
export const EXAMINERS = DEFAULT_EXAMINERS;

export async function loadExaminers(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_EXAMINERS;
    const list = JSON.parse(raw);
    return Array.isArray(list) && list.length > 0 ? list : DEFAULT_EXAMINERS;
  } catch {
    return DEFAULT_EXAMINERS;
  }
}

export async function saveExaminers(list: string[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
