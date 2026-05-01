import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SessionRecord {
  id: string;
  date: string;
  scenario: 'adult' | 'child';
  candidateName: string;
  candidateNumber: string;
  examinerName: string;
  totalScore: number;
  passed: boolean;
  hasCriticalError: boolean;
  sectionScores: { title: string; earned: number; max: number }[];
  criticalErrors: string[];
  ownerUsername?: string;
}

const GLOBAL_KEY = 'bls_sessions';

function getUserKey(username?: string) {
  if (!username) return GLOBAL_KEY;
  return `bls_sessions_${username.toLowerCase()}`;
}

export async function saveSessions(sessions: SessionRecord[], username?: string): Promise<void> {
  await AsyncStorage.setItem(getUserKey(username), JSON.stringify(sessions));
}

export async function loadSessions(username?: string): Promise<SessionRecord[]> {
  const raw = await AsyncStorage.getItem(getUserKey(username));
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export async function addSession(session: SessionRecord, username?: string): Promise<void> {
  const existing = await loadSessions(username);
  const updated = [{ ...session, ownerUsername: username }, ...existing].slice(0, 200);
  await saveSessions(updated, username);
}

export async function deleteSession(id: string, username?: string): Promise<void> {
  const existing = await loadSessions(username);
  await saveSessions(existing.filter(s => s.id !== id), username);
}

export async function clearSessions(username?: string): Promise<void> {
  await AsyncStorage.removeItem(getUserKey(username));
}

export function formatSessionAsText(session: SessionRecord): string {
  const verdict = session.passed ? 'СДАЛ' : 'НЕ СДАЛ';
  const scenario = session.scenario === 'adult' ? 'Сценарий 001 · Взрослый пациент' : 'Сценарий 002 · Ребёнок';
  return [
    '═══════════════════════════════════════',
    'ПАСПОРТ ЭКЗАМЕНАЦИОННОЙ СТАНЦИИ',
    'Базовая СЛР у взрослых и детей',
    'ERC Guidelines 2025',
    '═══════════════════════════════════════',
    '',
    `Дата: ${session.date}`,
    `Сценарий: ${scenario}`,
    `Кандидат: ${session.candidateName || '—'} (№ ${session.candidateNumber || '—'})`,
    `Экзаменатор: ${session.examinerName || '—'}`,
    '',
    '───────────────────────────────────────',
    'РЕЗУЛЬТАТЫ ПО РАЗДЕЛАМ',
    '───────────────────────────────────────',
    ...session.sectionScores.map(s => `${s.title}: ${s.earned} / ${s.max}`),
    '',
    '───────────────────────────────────────',
    `ИТОГОВЫЙ БАЛЛ: ${session.totalScore} / 100`,
    `Критическая ошибка: ${session.hasCriticalError ? 'ДА' : 'НЕТ'}`,
    session.criticalErrors.length > 0 ? `Ошибки: ${session.criticalErrors.join('; ')}` : '',
    '',
    `▶ ИТОГОВОЕ РЕШЕНИЕ: ${verdict}`,
    '═══════════════════════════════════════',
  ].filter(Boolean).join('\n');
}
