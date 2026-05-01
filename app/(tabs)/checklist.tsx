import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  Animated, Modal, FlatList, Alert, Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius, FontSize, glassStyle } from '@/constants/theme';
import { useChecklist } from '@/hooks/useChecklist';
import { useAuth } from '@/hooks/useAuth';
import { CHECKLIST_ADULT, CHECKLIST_CHILD, ChecklistItem, ScoreOption, CRITICAL_ERRORS_ADULT, CRITICAL_ERRORS_CHILD } from '@/constants/data';
import { loadExaminers } from '@/constants/examiners';
import { addSession } from '@/services/sessionStorage';
import { useAlert } from '@/contexts/AlertContext';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';

type Phase = 'setup' | 'exam' | 'critical' | 'result';
const TOTAL_SECONDS = 10 * 60;

const ADULT_IMAGE = 'https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?w=600&q=80';
const CHILD_IMAGE = 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=600&q=80';

// ── AED Sound ────────────────────────────────────────────────────────────────
// Short beep: 440Hz sine, ~0.15s, encoded as WAV base64
const AED_BEEP_URI = 'https://www.soundjay.com/buttons/sounds/beep-07.mp3';

async function playBeep() {
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync(
      { uri: AED_BEEP_URI },
      { shouldPlay: true, volume: 0.7 }
    );
    sound.setOnPlaybackStatusUpdate(status => {
      if (status.isLoaded && status.didJustFinish) sound.unloadAsync();
    });
  } catch (_) {}
}

async function playAEDAnalysis() {
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    // Play 3 beeps for AED sequence
    for (let i = 0; i < 3; i++) {
      const { sound } = await Audio.Sound.createAsync(
        { uri: AED_BEEP_URI },
        { shouldPlay: true, volume: 0.8 }
      );
      await new Promise(r => setTimeout(r, 400));
      sound.unloadAsync();
    }
  } catch (_) {}
}

// ── Push notification ─────────────────────────────────────────────────────────
async function sendLocalNotif(title: string, body: string) {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') await Notifications.requestPermissionsAsync();
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null,
    });
  } catch (_) {}
}

// ── Compact top timer ─────────────────────────────────────────────────────────
function CompactTimer({ onWarning, onEnd }: { onWarning: () => void; onEnd: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const warnedRef = useRef(false);
  const endedRef = useRef(false);

  const remaining = Math.max(0, TOTAL_SECONDS - elapsed);
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const isWarning = remaining <= 60 && remaining > 0;
  const isDone = remaining === 0;
  const accentColor = isDone ? Colors.danger : isWarning ? Colors.warning : Colors.accent;

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setElapsed(p => {
        const next = p + 1;
        if (next >= TOTAL_SECONDS - 60 && !warnedRef.current) {
          warnedRef.current = true;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          playBeep();
          onWarning();
        }
        if (next >= TOTAL_SECONDS && !endedRef.current) {
          endedRef.current = true;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          playAEDAnalysis();
          onEnd();
        }
        return next;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const progress = Math.min(1, elapsed / TOTAL_SECONDS);

  return (
    <View style={cTimerStyles.wrap}>
      <View style={cTimerStyles.timeRow}>
        <View style={[cTimerStyles.dot, { backgroundColor: accentColor }]} />
        <Text style={[cTimerStyles.time, { color: accentColor }]}>
          {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
        </Text>
        <Text style={cTimerStyles.label}>
          {isDone ? 'Завершено' : elapsed < 30 ? 'Ознакомление' : 'Работа'}
        </Text>
      </View>
      <View style={cTimerStyles.barBg}>
        <View style={[cTimerStyles.barFill, { width: `${progress * 100}%` as any, backgroundColor: accentColor }]} />
      </View>
    </View>
  );
}

const cTimerStyles = StyleSheet.create({
  wrap: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  time: { fontSize: FontSize.lg, fontWeight: '700', letterSpacing: -0.5 },
  label: { color: Colors.textMuted, fontSize: FontSize.xs, marginLeft: 'auto' },
  barBg: { height: 2, backgroundColor: Colors.surfaceHigh, borderRadius: 1, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 1 },
});

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? current / total : 0;
  return (
    <View style={progStyles.wrap}>
      <View style={progStyles.bar}>
        <View style={[progStyles.fill, { width: `${pct * 100}%` as any }]} />
      </View>
      <Text style={progStyles.label}>{current}/{total}</Text>
    </View>
  );
}

function ScoreBtn({ label, value, selected, color, onPress }: {
  label: string; value: ScoreOption; selected: boolean; color: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[btnStyles.btn, selected && { borderColor: color, backgroundColor: color + '18' }]}
      onPress={onPress} activeOpacity={0.75}
    >
      {selected && <MaterialIcons name="check" size={13} color={color} />}
      <Text style={[btnStyles.label, { color: selected ? color : Colors.textMuted }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ExaminerPicker({ visible, selected, examiners, onSelect, onClose }: {
  visible: boolean; selected: string; examiners: string[]; onSelect: (name: string) => void; onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={pickerStyles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={[pickerStyles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={pickerStyles.header}>
            <Text style={pickerStyles.title}>Экзаменатор</Text>
            <TouchableOpacity style={pickerStyles.circularClose} onPress={onClose} activeOpacity={0.7}>
              <MaterialIcons name="close" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={examiners}
            keyExtractor={i => i}
            contentContainerStyle={{ paddingVertical: 8 }}
            renderItem={({ item }) => {
              const isSelected = item === selected;
              return (
                <TouchableOpacity
                  style={[pickerStyles.item, isSelected && { backgroundColor: 'rgba(255,255,255,0.08)' }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelect(item); onClose(); }}
                  activeOpacity={0.75}
                >
                  <Text style={[pickerStyles.itemText, isSelected && { color: '#fff', fontWeight: '700' }]}>{item}</Text>
                  {isSelected && <MaterialIcons name="check" size={18} color="#fff" />}
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={pickerStyles.sep} />}
          />
        </View>
      </View>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  sheet: { 
    width: '100%', 
    backgroundColor: '#1C1C1E', 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    maxHeight: '45%', 
    overflow: 'hidden'
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 20, paddingBottom: 12, paddingHorizontal: 20, position: 'relative' },
  title: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: '800', 
    letterSpacing: -0.5
  },
  circularClose: { 
    position: 'absolute', 
    right: 20, 
    top: 16, 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: 'rgba(255,255,255,0.08)', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 18 },
  itemText: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '500' },
  sep: { height: 0.5, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 24 },
});

function ResultBadge({ passed }: { passed: boolean }) {
  return (
    <View style={[illStyles.wrap, { backgroundColor: passed ? Colors.successDim : Colors.dangerDim, borderColor: passed ? Colors.success + '50' : Colors.danger + '50' }]}>
      <MaterialIcons name={passed ? 'check-circle' : 'cancel'} size={40} color={passed ? Colors.success : Colors.danger} />
      <Text style={[illStyles.text, { color: passed ? Colors.success : Colors.danger }]}>
        {passed ? 'СДАЛ' : 'НЕ СДАЛ'}
      </Text>
    </View>
  );
}

const illStyles = StyleSheet.create({
  wrap: { width: 120, height: 120, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, gap: 6 },
  text: { fontSize: FontSize.sm, fontWeight: '800', letterSpacing: 0.5 },
});

// ── PDF Generator ─────────────────────────────────────────────────────────────
function buildPDF(opts: {
  scenario: 'adult' | 'child';
  candidateName: string;
  candidateNumber: string;
  examinerName: string;
  totalScore: number;
  passed: boolean;
  critErr: boolean;
  cprStarted: boolean;
  sectionRows: string;
}) {
  const {
    scenario, candidateName, candidateNumber, examinerName,
    totalScore, passed, critErr, cprStarted, sectionRows,
  } = opts;
  const verdictColor = passed ? '#16a34a' : '#dc2626';
  const verdictLabel = passed ? 'СДАЛ' : 'НЕ СДАЛ';
  const verdictIcon = passed ? '✓' : '✗';
  const date = new Date().toLocaleDateString('ru-RU');

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
    color: #1a1a1a;
    background: #ffffff;
    padding: 36px 40px;
    font-size: 13px;
    line-height: 1.5;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 28px;
    padding-bottom: 16px;
    border-bottom: 2px solid #1a1a1a;
  }
  .header-left h1 { font-size: 17px; font-weight: 800; color: #1a1a1a; margin-bottom: 3px; }
  .header-left p { font-size: 11px; color: #666; }
  .verdict-box {
    text-align: center;
    background: ${verdictColor}10;
    border: 2px solid ${verdictColor};
    border-radius: 10px;
    padding: 10px 20px;
  }
  .verdict-icon { font-size: 20px; color: ${verdictColor}; font-weight: 900; }
  .verdict-text { font-size: 13px; color: ${verdictColor}; font-weight: 800; letter-spacing: 0.5px; }
  .score-label { font-size: 11px; color: #888; margin-top: 2px; }
  
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 20px;
    margin-bottom: 24px;
    background: #f8f9fa;
    border-radius: 8px;
    padding: 16px;
    border: 1px solid #e5e7eb;
  }
  .info-row { display: flex; flex-direction: column; }
  .info-row .lbl { font-size: 10px; color: #888; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-row .val { font-size: 13px; color: #1a1a1a; font-weight: 600; margin-top: 2px; }

  .score-hero {
    text-align: center;
    margin-bottom: 24px;
    padding: 20px;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    background: #f8f9fa;
  }
  .score-num { font-size: 56px; font-weight: 900; color: ${verdictColor}; line-height: 1; }
  .score-denom { font-size: 18px; color: #888; }
  .score-grade { font-size: 14px; font-weight: 700; color: ${verdictColor}; margin-top: 6px; }

  .section-title { font-size: 11px; font-weight: 800; color: #888; text-transform: uppercase; letter-spacing: 1px; margin: 20px 0 8px; }
  
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #f1f5f9; font-weight: 700; text-align: left; padding: 9px 12px; border: 1px solid #e2e8f0; color: #374151; font-size: 11px; }
  td { padding: 9px 12px; border: 1px solid #e2e8f0; color: #374151; }
  tr:nth-child(even) td { background: #f9fafb; }
  .total-row td { font-weight: 700; background: #f1f5f9; }
  .ok { color: #16a34a; font-weight: 700; }
  .fail { color: #dc2626; font-weight: 700; }
  .tag-ok { background: #dcfce7; color: #16a34a; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 11px; }
  .tag-fail { background: #fee2e2; color: #dc2626; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 11px; }

  .criteria-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 24px;
  }
  .crit-item {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8f9fa;
  }
  .crit-label { font-size: 12px; color: #374151; }

  .sign-section {
    margin-top: 36px;
    display: flex;
    justify-content: space-between;
    gap: 40px;
  }
  .sign-block { flex: 1; text-align: center; }
  .sign-line { height: 1px; background: #374151; margin: 0 0 8px; }
  .sign-name { font-size: 12px; font-weight: 600; color: #1a1a1a; }
  .sign-label { font-size: 10px; color: #888; margin-top: 2px; }
  .footer-bar { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #aaa; }
</style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <h1>Экзаменационная станция · БСЛ / BLS</h1>
      <p>Базовая сердечно-лёгочная реанимация у взрослых и детей · ERC Guidelines 2025</p>
    </div>
    <div class="verdict-box">
      <div class="verdict-icon">${verdictIcon}</div>
      <div class="verdict-text">${verdictLabel}</div>
      <div class="score-label">${totalScore} / 100 баллов</div>
    </div>
  </div>

  <!-- Info grid -->
  <div class="info-grid">
    <div class="info-row"><span class="lbl">Сценарий</span><span class="val">${scenario === 'adult' ? '001 — Взрослый пациент (≈50 лет)' : '002 — Педиатрический PBLS (≈6 лет)'}</span></div>
    <div class="info-row"><span class="lbl">Дата</span><span class="val">${date}</span></div>
    <div class="info-row"><span class="lbl">Ф.И.О. кандидата</span><span class="val">${candidateName || '—'}</span></div>
    <div class="info-row"><span class="lbl">Номер кандидата</span><span class="val">${candidateNumber || '—'}</span></div>
    <div class="info-row"><span class="lbl">Ф.И.О. экзаменатора</span><span class="val">${examinerName || '—'}</span></div>
    <div class="info-row"><span class="lbl">Рекомендации</span><span class="val">ERC 2025 / ILCOR CoSTR 2025</span></div>
  </div>

  <!-- Score hero -->
  <div class="score-hero">
    <div><span class="score-num">${totalScore}</span><span class="score-denom"> / 100</span></div>
    <div class="score-grade">${totalScore >= 90 ? 'Отлично' : totalScore >= 80 ? 'Хорошо' : totalScore >= 70 ? 'Удовлетворительно' : 'Неудовлетворительно'}</div>
  </div>

  <!-- Section scores -->
  <div class="section-title">Результаты по разделам</div>
  <table>
    <thead><tr><th>Раздел</th><th style="text-align:center;width:120px">Баллы</th></tr></thead>
    <tbody>${sectionRows}<tr class="total-row"><td>ИТОГО</td><td style="text-align:center">${totalScore} / 100</td></tr></tbody>
  </table>

  <!-- Criteria -->
  <div class="section-title">Критерии прохождения</div>
  <div class="criteria-grid">
    <div class="crit-item"><span class="crit-label">Балл ≥ 70</span><span class="${totalScore >= 70 ? 'tag-ok' : 'tag-fail'}">${totalScore >= 70 ? 'Да' : 'Нет'}</span></div>
    <div class="crit-item"><span class="crit-label">Критическая ошибка</span><span class="${critErr ? 'tag-fail' : 'tag-ok'}">${critErr ? 'Есть' : 'Нет'}</span></div>
    <div class="crit-item"><span class="crit-label">CPR начата</span><span class="${cprStarted ? 'tag-ok' : 'tag-fail'}">${cprStarted ? 'Да' : 'Нет'}</span></div>
    <div class="crit-item"><span class="crit-label">Итоговое решение</span><span class="${passed ? 'tag-ok' : 'tag-fail'}">${verdictLabel}</span></div>
  </div>

  <!-- Signature -->
  <div class="sign-section">
    <div class="sign-block">
      <div class="sign-line"></div>
      <div class="sign-name">${examinerName || 'Экзаменатор'}</div>
      <div class="sign-label">Подпись экзаменатора / Дата: ${date}</div>
    </div>
    <div class="sign-block">
      <div class="sign-line"></div>
      <div class="sign-name">${candidateName || 'Кандидат'}</div>
      <div class="sign-label">Подпись кандидата</div>
    </div>
  </div>

  <div class="footer-bar">BLS Station · ERC Guidelines 2025 · Ташкент 2026</div>
</body>
</html>`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ChecklistScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const {
    activeScenario, setActiveScenario, adultScores, childScores, setScore, getScore,
    getTotalScore, hasCriticalError, getCriticalErrors, setCriticalError, resetChecklist,
    sessionMeta, updateSessionMeta,
  } = useChecklist();
  const { profileName, currentUser } = useAuth();
  const { showAlert } = useAlert();

  const [phase, setPhase] = useState<Phase>('setup');
  const [itemIndex, setItemIndex] = useState(0);
  const [showExaminer, setShowExaminer] = useState(false);
  const [showExaminerPicker, setShowExaminerPicker] = useState(false);
  const [examiners, setExaminers] = useState<string[]>([]);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  const checklist = activeScenario === 'adult' ? CHECKLIST_ADULT : CHECKLIST_CHILD;
  const critErrors = activeScenario === 'adult' ? CRITICAL_ERRORS_ADULT : CRITICAL_ERRORS_CHILD;

  useEffect(() => {
    loadExaminers().then(list => setExaminers([...list].sort((a, b) => a.localeCompare(b))));
  }, []);

  // Hide tab bar completely for the Checklist section, as it's an immersive experience
  useEffect(() => {
    navigation.setOptions({ tabBarStyle: { display: 'none' } });
    return () => { 
      navigation.setOptions({ 
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? (insets.bottom > 0 ? insets.bottom : 16) : 16,
          left: 12,
          right: 12,
          height: 68,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          borderWidth: 0,
          shadowColor: 'transparent',
          shadowOpacity: 0,
        } 
      }); 
    };
  }, [navigation, insets.bottom]);

  const confirmExit = () => {
    Alert.alert(
      'Выход',
      'Вы уверены, что хотите выйти из режима экзамена?',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Выйти', 
          style: 'destructive', 
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.replace('/');
          }
        }
      ]
    );
  };

  const allItems: (ChecklistItem & { sectionTitle: string })[] = [];
  for (const section of checklist) {
    for (const item of section.items) {
      allItems.push({ ...item, sectionTitle: section.title });
    }
  }

  const currentItem = allItems[itemIndex];
  const currentScore = currentItem ? getScore(currentItem.id) : null;

  const animNext = useCallback(() => {
    slideAnim.setValue(40);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 120, friction: 14 }).start();
  }, [slideAnim]);

  const handleScore = (val: ScoreOption) => {
    if (!currentItem) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScore(currentItem.id, val);
    if (val === 'yes') playBeep();
  };

  const handleNext = () => {
    if (!currentScore) return;
    if (itemIndex < allItems.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      animNext();
      setItemIndex(i => i + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPhase('critical');
    }
  };

  const handlePrev = () => {
    if (itemIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setItemIndex(i => i - 1);
    }
  };

  const handleReset = () => {
    Alert.alert('Выйти из экзамена?', 'Все данные текущей сессии будут потеряны.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти', style: 'destructive', onPress: () => {
          resetChecklist(); setItemIndex(0); setPhase('setup');
        },
      },
    ]);
  };

  const handleFinishCritical = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const score = getTotalScore();
    const critErr = hasCriticalError();
    const critErrMap = getCriticalErrors();
    const critErrTexts = critErrors.filter(e => critErrMap[String(e.id)]).map(e => e.text);
    const sectionScores = checklist.map(section => {
      const scores = activeScenario === 'adult' ? adultScores : childScores;
      let earned = 0;
      for (const item of section.items) {
        const s = scores[item.id];
        if (s === 'yes') earned += item.maxScore;
        else if (s === 'partial') earned += Math.round(item.maxScore * 0.5);
      }
      return { title: section.title, earned, max: section.maxScore };
    });
    const cprStarted = activeScenario === 'adult'
      ? (getScore('c13') === 'yes' || getScore('c13') === 'partial')
      : (getScore('cd18') === 'yes' || getScore('cd18') === 'partial');
    const passed = score >= 70 && !critErr && cprStarted;
    const now = new Date();
    const dateStr = now.toLocaleDateString('ru-RU') + ' ' + now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    await addSession({
      id: Date.now().toString(), date: dateStr,
      scenario: activeScenario,
      candidateName: sessionMeta.candidateName,
      candidateNumber: sessionMeta.candidateNumber,
      examinerName: sessionMeta.examinerName || profileName,
      totalScore: score, passed, hasCriticalError: critErr,
      sectionScores, criticalErrors: critErrTexts,
    }, currentUser?.username);
    await sendLocalNotif(
      passed ? '✅ Экзамен завершён — Сдал' : '❌ Экзамен завершён — Не сдал',
      `${sessionMeta.candidateName || 'Кандидат'} · ${score}/100 баллов`
    );
    if (passed) await playBeep();
    setPhase('result');
  };

  const handleExport = async () => {
    const score = getTotalScore();
    const critErr = hasCriticalError();
    const cprStarted = activeScenario === 'adult'
      ? (getScore('c13') === 'yes' || getScore('c13') === 'partial')
      : (getScore('cd18') === 'yes' || getScore('cd18') === 'partial');
    const passed = score >= 70 && !critErr && cprStarted;
    const sectionRows = checklist.map(section => {
      const scores = activeScenario === 'adult' ? adultScores : childScores;
      let earned = 0;
      for (const item of section.items) {
        const s = scores[item.id];
        if (s === 'yes') earned += item.maxScore;
        else if (s === 'partial') earned += Math.round(item.maxScore * 0.5);
      }
      return `<tr><td>${section.title}</td><td style="text-align:center">${earned}/${section.maxScore}</td></tr>`;
    }).join('');
    const html = buildPDF({
      scenario: activeScenario,
      candidateName: sessionMeta.candidateName,
      candidateNumber: sessionMeta.candidateNumber,
      examinerName: sessionMeta.examinerName || profileName || '—',
      totalScore: score, passed, critErr, cprStarted, sectionRows,
    });
    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const dest = (FileSystem.documentDirectory ?? '') + `BLS_${(sessionMeta.candidateName || 'Result').replace(/\s/g, '_')}_${Date.now()}.pdf`;
      await FileSystem.moveAsync({ from: uri, to: dest });
      await Sharing.shareAsync(dest, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
    } catch (e) {
      showAlert('Ошибка', 'Не удалось создать PDF.');
    }
  };

  // ── RESULT ────────────────────────────────────────────────────────────────
  if (phase === 'result') {
    const score = getTotalScore();
    const critErr = hasCriticalError();
    const cprStarted = activeScenario === 'adult'
      ? (getScore('c13') === 'yes' || getScore('c13') === 'partial')
      : (getScore('cd18') === 'yes' || getScore('cd18') === 'partial');
    const passed = score >= 70 && !critErr && cprStarted;
    const grade = score >= 90 ? 'Отлично' : score >= 80 ? 'Хорошо' : score >= 70 ? 'Удовлетворительно' : 'Неудовлетворительно';
    const gradeColor = score >= 90 ? Colors.success : score >= 80 ? Colors.accent : score >= 70 ? Colors.warning : Colors.danger;

    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <View style={styles.resultTopBar}>
          <TouchableOpacity style={styles.smallIconBtn} onPress={() => { resetChecklist(); setItemIndex(0); setPhase('setup'); }} activeOpacity={0.7}>
            <MaterialIcons name="close" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
          <Text style={styles.resultTopTitle}>Результаты</Text>
          <TouchableOpacity style={styles.exportTopBtn} onPress={handleExport} activeOpacity={0.75}>
            <MaterialIcons name="file-download" size={16} color={Colors.accent} />
            <Text style={styles.exportTopText}>PDF</Text>
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.resultHero}>
            <ResultBadge passed={passed} />
            <View style={styles.resultScoreCol}>
              <Text style={[styles.resultScoreNum, { color: gradeColor }]}>{score}</Text>
              <Text style={styles.resultScoreMax}>/100</Text>
              <Text style={[styles.resultGrade, { color: gradeColor }]}>{grade}</Text>
              {sessionMeta.candidateName ? <Text style={styles.resultCandidate}>{sessionMeta.candidateName}</Text> : null}
            </View>
          </View>

          <Text style={styles.sectionLabel}>КРИТЕРИИ ПРОХОЖДЕНИЯ</Text>
          <View style={styles.criteriaCard}>
            {[
              { label: 'Балл ≥ 70', ok: score >= 70, val: `${score} баллов` },
              { label: 'Нет критической ошибки', ok: !critErr, val: critErr ? 'Есть ошибка' : 'Нет' },
              { label: 'CPR начата', ok: cprStarted, val: cprStarted ? 'Да' : 'Нет' },
            ].map((c, i) => (
              <View key={i} style={[styles.criteriaRow, i < 2 && { borderBottomWidth: 0.5, borderBottomColor: Colors.border }]}>
                <MaterialIcons name={c.ok ? 'check-circle' : 'cancel'} size={16} color={c.ok ? Colors.success : Colors.danger} />
                <Text style={styles.criteriaLabel}>{c.label}</Text>
                <Text style={[styles.criteriaVal, { color: c.ok ? Colors.success : Colors.danger }]}>{c.val}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionLabel}>ПО РАЗДЕЛАМ</Text>
          {checklist.map(section => {
            const scores = activeScenario === 'adult' ? adultScores : childScores;
            let earned = 0;
            for (const item of section.items) {
              const s = scores[item.id];
              if (s === 'yes') earned += item.maxScore;
              else if (s === 'partial') earned += Math.round(item.maxScore * 0.5);
            }
            const pct = section.maxScore > 0 ? earned / section.maxScore : 0;
            const c = pct >= 0.7 ? Colors.success : pct >= 0.5 ? Colors.warning : Colors.danger;
            return (
              <View key={section.id} style={styles.breakRow}>
                <View style={styles.breakLeft}>
                  <Text style={styles.breakTitle}>{section.title}</Text>
                  <View style={styles.breakBarBg}>
                    <View style={[styles.breakBarFill, { width: `${pct * 100}%` as any, backgroundColor: c }]} />
                  </View>
                </View>
                <Text style={[styles.breakScore, { color: c }]}>{earned}/{section.maxScore}</Text>
              </View>
            );
          })}

          <TouchableOpacity style={styles.newExamBtn} onPress={() => { resetChecklist(); setItemIndex(0); setPhase('setup'); }} activeOpacity={0.8}>
            <MaterialIcons name="refresh" size={18} color="#fff" />
            <Text style={styles.newExamBtnText}>Новый экзамен</Text>
          </TouchableOpacity>
          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    );
  }

  // ── CRITICAL ───────────────────────────────────────────────────────────────
  if (phase === 'critical') {
    const critErrMap = getCriticalErrors();
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <View style={styles.phaseHeader}>
          <TouchableOpacity style={styles.smallIconBtn} onPress={handleReset} activeOpacity={0.7}>
            <MaterialIcons name="close" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.phaseTitle}>Критические ошибки</Text>
            <Text style={styles.phaseSub}>Отметьте допущенные нарушения</Text>
          </View>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.critWarn}>
            <MaterialIcons name="warning" size={16} color={Colors.danger} />
            <Text style={styles.critWarnText}>Любая отмеченная ошибка — автоматически «Не сдал»</Text>
          </View>
          {critErrors.map(err => {
            const checked = critErrMap[String(err.id)] === true;
            const c = err.consequence === 'Автоматически не сдал' ? Colors.danger : Colors.warning;
            return (
              <TouchableOpacity
                key={err.id}
                style={[styles.critCard, checked && { borderColor: c + '60', backgroundColor: c + '10' }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCriticalError(String(err.id), !checked); }}
                activeOpacity={0.8}
              >
                <View style={[styles.critNum, checked && { backgroundColor: c }]}>
                  <Text style={styles.critNumText}>{err.id}</Text>
                </View>
                <View style={styles.critContent}>
                  <Text style={styles.critText}>{err.text}</Text>
                  <Text style={[styles.critConseq, { color: c }]}>{err.consequence}</Text>
                </View>
                <MaterialIcons name={checked ? 'check-box' : 'check-box-outline-blank'} size={22} color={checked ? c : Colors.textMuted} />
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 16 }} />
        </ScrollView>
        <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleFinishCritical} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Показать результаты</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── EXAM ──────────────────────────────────────────────────────────────────
  if (phase === 'exam') {
    if (!currentItem) return null;
    const section = checklist.find(s => s.items.some(i => i.id === currentItem.id));
    const PROMPTS = [
      'Опасности нет.', 'Пациент не реагирует.', 'Нормального дыхания нет.',
      'Пульсация не определяется.', 'Помощь вызвана.', 'AED доставлен.',
    ];
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <CompactTimer
          onWarning={() => showAlert('⚠️ Внимание', 'У кандидата осталась одна минута!')}
          onEnd={() => showAlert('⏱ Время', 'Испытание завершено.')}
        />
        <View style={styles.examHeader}>
          <View style={styles.examTopRow}>
            <TouchableOpacity style={styles.smallIconBtn} onPress={handleReset} activeOpacity={0.7}>
              <MaterialIcons name="close" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
            <ProgressBar current={itemIndex + 1} total={allItems.length} />
            <TouchableOpacity
              style={[styles.smallIconBtn, showExaminer && { backgroundColor: Colors.accentDim }]}
              onPress={() => setShowExaminer(p => !p)} activeOpacity={0.7}
            >
              <MaterialIcons name="record-voice-over" size={18} color={showExaminer ? Colors.accent : Colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionTag}>{section?.title}</Text>
        </View>
        {showExaminer && (
          <View style={styles.examinerBar}>
            <Text style={styles.examinerBarTitle}>Вводные</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
              {PROMPTS.map((p, i) => (
                <TouchableOpacity key={i} style={styles.promptPill} activeOpacity={0.8}>
                  <Text style={styles.promptText}>«{p}»</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        <View style={styles.examContent}>
          <Animated.View style={[styles.itemCard, { transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.itemTopRow}>
              <View style={styles.itemNum}>
                <Text style={styles.itemNumText}>{currentItem.number}</Text>
              </View>
              {currentItem.isCritical && (
                <View style={styles.criticalTag}>
                  <MaterialIcons name="warning" size={10} color={Colors.warning} />
                  <Text style={styles.criticalTagText}>Критический</Text>
                </View>
              )}
              <Text style={styles.itemScore}>{currentItem.maxScore} б.</Text>
            </View>
            <Text style={styles.itemAction}>{currentItem.action}</Text>
          </Animated.View>
          <View style={styles.scoreRow}>
            <ScoreBtn label="Да" value="yes" selected={currentScore === 'yes'} color={Colors.success} onPress={() => handleScore('yes')} />
            <ScoreBtn label="Частично" value="partial" selected={currentScore === 'partial'} color={Colors.warning} onPress={() => handleScore('partial')} />
            <ScoreBtn label="Нет" value="no" selected={currentScore === 'no'} color={Colors.danger} onPress={() => handleScore('no')} />
          </View>
        </View>
        <View style={[styles.examBottomNav, { paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity style={[styles.prevBtn, itemIndex === 0 && { opacity: 0.3 }]} onPress={handlePrev} disabled={itemIndex === 0} activeOpacity={0.75}>
            <MaterialIcons name="arrow-back-ios" size={16} color={Colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.nextBtn, !currentScore && { opacity: 0.35 }]} onPress={handleNext} disabled={!currentScore} activeOpacity={0.85}>
            <Text style={styles.nextBtnText}>{itemIndex === allItems.length - 1 ? 'Завершить' : 'Далее'}</Text>
            {itemIndex < allItems.length - 1 && <MaterialIcons name="arrow-forward" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── SETUP ──────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <ExaminerPicker
        visible={showExaminerPicker}
        selected={sessionMeta.examinerName}
        examiners={examiners}
        onSelect={name => updateSessionMeta({ examinerName: name })}
        onClose={() => setShowExaminerPicker(false)}
      />
      <View style={styles.phaseHeaderRow}>
        <Text style={styles.phaseTitle}>Экзамен</Text>
        <TouchableOpacity 
          style={styles.exitBtnTopRight} 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            confirmExit();
          }} 
          activeOpacity={0.6}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="close" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionLabel}>СЦЕНАРИЙ</Text>
        <View style={styles.scenarioRow}>
          {(['adult', 'child'] as const).map(sc => (
            <TouchableOpacity
              key={sc}
              style={[styles.scenarioCard, activeScenario === sc && { borderColor: '#fff', borderWidth: 2 }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveScenario(sc); }}
              activeOpacity={0.8}
            >
              <Image source={{ uri: sc === 'adult' ? ADULT_IMAGE : CHILD_IMAGE }} style={styles.scenarioImg} contentFit="cover" />
              <LinearGradient 
                colors={['transparent', 'rgba(0,0,0,0.85)']} 
                style={styles.scenarioOverlay}
              >
                <View style={styles.scenarioInfo}>
                  <MaterialIcons name={sc === 'adult' ? 'person' : 'child-care'} size={20} color="#fff" />
                  <Text style={styles.scenarioLabel}>{sc === 'adult' ? 'Взрослый' : 'Ребёнок'}</Text>
                </View>
                <Text style={styles.scenarioNum}>{sc === 'adult' ? 'БАЗОВЫЙ КУРС' : 'ПЕДИАТРИЯ'}</Text>
              </LinearGradient>
              {activeScenario === sc && (
                <View style={styles.scenarioCheckBadge}>
                  <MaterialIcons name="check" size={12} color="#000" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.sectionLabel}>ДАННЫЕ СЕССИИ</Text>
        {[
          { key: 'candidateName', label: 'Ф.И.О. кандидата', placeholder: 'Введите Ф.И.О.', icon: 'person-outline' as const },
          { key: 'candidateNumber', label: 'Номер кандидата', placeholder: 'Введите номер', icon: 'badge' as const },
        ].map(f => (
          <View key={f.key} style={styles.modernInputContainer}>
            <View style={styles.modernInputIconBox}>
              <MaterialIcons name={f.icon} size={20} color={Colors.textMuted} />
            </View>
            <View style={styles.modernInputContent}>
              <Text style={styles.modernInputLabel}>{f.label}</Text>
              <TextInput
                style={styles.modernInputActual}
                value={(sessionMeta as any)[f.key] || ''}
                onChangeText={v => {
                  let cleaned = v;
                  if (f.key === 'candidateNumber') cleaned = v.replace(/[^0-9]/g, '');
                  updateSessionMeta({ [f.key]: cleaned });
                }}
                placeholder={f.placeholder}
                placeholderTextColor="rgba(255,255,255,0.2)"
                selectionColor="#FBBF24"
                keyboardType={f.key === 'candidateNumber' ? 'number-pad' : 'default'}
                maxLength={f.key === 'candidateNumber' ? 5 : 50}
              />
            </View>
          </View>
        ))}
        <TouchableOpacity 
          style={styles.modernInputContainer} 
          onPress={() => setShowExaminerPicker(true)} 
          activeOpacity={0.8}
        >
          <View style={styles.modernInputIconBox}>
            <MaterialIcons name="assignment-ind" size={20} color={Colors.textMuted} />
          </View>
          <View style={styles.modernInputContent}>
            <Text style={styles.modernInputLabel}>Экзаменатор</Text>
            <Text style={[styles.modernInputActual, !sessionMeta.examinerName && { color: 'rgba(255,255,255,0.2)' }]}>
              {sessionMeta.examinerName || 'Нажмите, чтобы выбрать'}
            </Text>
          </View>
          <MaterialIcons name="unfold-more" size={20} color={Colors.textMuted} style={{ marginRight: 12 }} />
        </TouchableOpacity>
        <View style={styles.infoHint}>
          <MaterialIcons name="info-outline" size={14} color="rgba(255,255,255,0.4)" style={{ marginTop: 2 }} />
          <Text style={styles.infoHintText}>Чек-лист проходится пошагово. Таймер запустится автоматически при старте экзамена.</Text>
        </View>
        <View style={{ height: 160 }} />
      </ScrollView>
      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={[styles.primaryBtn, (!sessionMeta.candidateName || sessionMeta.candidateName.length < 2 || !sessionMeta.candidateNumber || !sessionMeta.examinerName) && { opacity: 0.3 }]}
          onPress={() => { 
            if (!sessionMeta.candidateName || sessionMeta.candidateName.length < 2 || !sessionMeta.candidateNumber || !sessionMeta.examinerName) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              return;
            }
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); 
            setPhase('exam'); 
          }}
          activeOpacity={0.85}
        >
          <MaterialIcons name="play-arrow" size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>Начать экзамен</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: 120 },
  phaseHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  phaseHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, zIndex: 10, position: 'relative' },
  phaseTitle: { color: Colors.textPrimary, fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  phaseSub: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  exitBtnTopRight: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  sectionLabel: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1.2, marginBottom: Spacing.sm, marginTop: Spacing.xs, textTransform: 'uppercase' },
  scenarioRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  scenarioCard: { flex: 1, height: 160, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', position: 'relative' },
  scenarioImg: { width: '100%', height: '100%', position: 'absolute' },
  scenarioOverlay: { flex: 1, justifyContent: 'flex-end', padding: 12, gap: 2 },
  scenarioInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scenarioLabel: { color: '#fff', fontSize: 17, fontWeight: '800' },
  scenarioNum: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  scenarioCheckBadge: { position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  modernInputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#1C1C1E', 
    borderRadius: 14, 
    marginBottom: 12
  },
  modernInputIconBox: { width: 46, alignItems: 'center', justifyContent: 'center' },
  modernInputContent: { flex: 1, paddingVertical: 10, paddingRight: 16 },
  modernInputLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2, letterSpacing: 0.5 },
  modernInputActual: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '500', 
    padding: 0, 
    height: 24,
    // @ts-ignore: web only
    outlineStyle: 'none' 
  },
  infoHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 16, paddingHorizontal: 4 },
  infoHintText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 18, flex: 1 },
  bottomNav: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0,
    backgroundColor: '#000000',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
  },
  primaryBtn: { 
    backgroundColor: Colors.accent, 
    borderRadius: Radius.lg, 
    paddingVertical: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  examHeader: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.sm, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  examTopRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 6 },
  smallIconBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: Colors.surfaceGlass, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.borderGlass },
  sectionTag: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600' },
  examinerBar: { backgroundColor: Colors.surface, borderBottomWidth: 0.5, borderBottomColor: Colors.border, paddingVertical: Spacing.sm },
  examinerBarTitle: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700', paddingHorizontal: Spacing.md, marginBottom: 6 },
  promptPill: { backgroundColor: Colors.surfaceGlass, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.borderGlass },
  promptText: { color: Colors.textSecondary, fontSize: FontSize.xs },
  examContent: { flex: 1, paddingHorizontal: Spacing.md, paddingTop: Spacing.lg },
  itemCard: { ...glassStyle, borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, minHeight: 150 },
  itemTopRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  itemNum: { width: 30, height: 30, borderRadius: 10, backgroundColor: Colors.accentDim, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.accent + '40' },
  itemNumText: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: '800' },
  criticalTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.warningDim, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  criticalTagText: { color: Colors.warning, fontSize: 9, fontWeight: '800' },
  itemScore: { marginLeft: 'auto', color: Colors.textMuted, fontSize: FontSize.xs },
  itemAction: { color: Colors.textPrimary, fontSize: FontSize.lg, lineHeight: 26, fontWeight: '500' },
  scoreRow: { flexDirection: 'row', gap: Spacing.sm },
  examBottomNav: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 0.5, borderTopColor: Colors.border, backgroundColor: Colors.bg },
  prevBtn: { width: 48, height: 52, borderRadius: Radius.md, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  nextBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.accent, borderRadius: Radius.md, height: 52 },
  nextBtnText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '700' },
  critWarn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.dangerDim, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.danger + '40' },
  critWarnText: { color: Colors.danger, fontSize: FontSize.sm, flex: 1, lineHeight: 18 },
  critCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, ...glassStyle, borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.sm },
  critNum: { width: 28, height: 28, borderRadius: 9, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  critNumText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '700' },
  critContent: { flex: 1 },
  critText: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 18, marginBottom: 2 },
  critConseq: { fontSize: FontSize.xs, fontWeight: '700' },
  resultTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  resultTopTitle: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700' },
  exportTopBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.accentDim, borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: Colors.accent + '50' },
  exportTopText: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: '700' },
  resultHero: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xl, paddingVertical: Spacing.lg },
  resultScoreCol: { flex: 1 },
  resultScoreNum: { fontSize: 52, fontWeight: '900', lineHeight: 56 },
  resultScoreMax: { color: Colors.textMuted, fontSize: FontSize.lg, marginBottom: 4 },
  resultGrade: { fontSize: FontSize.md, fontWeight: '700', marginBottom: 4 },
  resultCandidate: { color: Colors.textMuted, fontSize: FontSize.sm },
  criteriaCard: { backgroundColor: Colors.surface, borderRadius: Radius.md, overflow: 'hidden', borderWidth: 0.5, borderColor: Colors.border, marginBottom: Spacing.md },
  criteriaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: 13 },
  criteriaLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, flex: 1 },
  criteriaVal: { fontSize: FontSize.sm, fontWeight: '700' },
  breakRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, ...glassStyle, borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.xs },
  breakLeft: { flex: 1 },
  breakTitle: { color: Colors.textMuted, fontSize: FontSize.xs, marginBottom: 4 },
  breakBarBg: { height: 3, backgroundColor: Colors.surfaceHigh, borderRadius: 2, overflow: 'hidden' },
  breakBarFill: { height: '100%', borderRadius: 2 },
  breakScore: { fontSize: FontSize.sm, fontWeight: '700', minWidth: 44, textAlign: 'right' },
  newExamBtn: { backgroundColor: Colors.accent, borderRadius: Radius.md, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: Spacing.md },
  newExamBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
});

const progStyles = StyleSheet.create({
  wrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  bar: { flex: 1, height: 4, backgroundColor: Colors.surfaceElevated, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: Colors.accent, borderRadius: 2 },
  label: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600', minWidth: 36, textAlign: 'right' },
});

const btnStyles = StyleSheet.create({
  btn: { flex: 1, paddingVertical: 15, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.borderGlass, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4, backgroundColor: Colors.surfaceGlass },
  label: { fontSize: FontSize.sm, fontWeight: '700' },
});
