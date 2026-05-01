import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Dimensions, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius, FontSize, glassStyle } from '@/constants/theme';
import { ADULT_ALGORITHM_STEPS, CHILD_ALGORITHM_STEPS, NEW_MODES_DATA } from '@/constants/data';

type StudyMode = 'menu' | 'algorithm' | 'quiz' | 'flashcard' | 'clinical' | 'mnemonics' | 'aed' | 'choking' | 'recovery' | 'emergency';
type Scenario = 'adult' | 'child';

const QUIZ_QUESTIONS = {
  adult: [
    { q: 'Соотношение компрессий и вдохов у взрослого?', options: ['30:2', '15:2', '5:1', '20:2'], answer: 0, explanation: 'ERC 2025: 30 компрессий : 2 вдоха для взрослых. Не прерывать CPR более 10 сек.' },
    { q: 'Оптимальная частота компрессий грудной клетки?', options: ['80–100/мин', '100–120/мин', '60–80/мин', '120–140/мин'], answer: 1, explanation: '100–120 компрессий в минуту — доказано снижает выживаемость при выходе за пределы.' },
    { q: 'Глубина компрессий у взрослого?', options: ['3–4 см', '5–6 см', '7–8 см', '2–3 см'], answer: 1, explanation: '5–6 см. Избегать > 6 см — это увеличивает риск повреждений.' },
    { q: 'Максимальное время оценки дыхания?', options: ['5 сек', '15 сек', '10 сек', '20 сек'], answer: 2, explanation: 'Не более 10 секунд. Агональное дыхание = начать CPR немедленно.' },
    { q: 'Что делать после каждой компрессии?', options: ['Делать вдох', 'Полный recoil грудной клетки', 'Менять руки', 'Проверять пульс'], answer: 1, explanation: 'Полное расправление грудной клетки обеспечивает венозный возврат к сердцу.' },
    { q: 'Что сделать сразу после доставки AED?', options: ['Продолжать CPR', 'Включить AED немедленно', 'Вызвать ещё помощь', 'Проверить зрачки'], answer: 1, explanation: 'Включить AED немедленно. Алгоритм AED имеет приоритет над ручным CPR.' },
    { q: 'Как проверить реакцию пациента?', options: ['Ущипнуть', 'Неврологический осмотр', 'Встряхнуть за плечи и позвать', 'Измерить давление'], answer: 2, explanation: 'Встряхнуть за оба плеча, громко спросить «Вы в порядке?»' },
    { q: 'Кто должен отойти перед разрядом AED?', options: ['Только кандидат', 'Все присутствующие', 'Никто', 'Только персонал'], answer: 1, explanation: 'ВСЕ должны отойти и не касаться пациента перед разрядом — риск электротравмы.' },
    { q: 'Место наложения рук при компрессиях?', options: ['Левая половина грудной клетки', 'Центр грудной клетки', 'Верхняя треть грудины', 'Мечевидный отросток'], answer: 1, explanation: 'Центр грудной клетки — основание ладони доминирующей руки.' },
    { q: 'Когда прекратить CPR при применении AED?', options: ['Никогда до разряда', 'Только на время анализа ритма', 'Когда AED готов к разряду', 'После 2 минут CPR'], answer: 1, explanation: 'Прерывать CPR только на минимальное время для анализа ритма и разряда.' },
  ],
  child: [
    { q: 'Соотношение у ребёнка (медработник)?', options: ['30:2', '15:2', '5:1', '10:2'], answer: 1, explanation: 'ERC 2025 PBLS: 15:2 для медицинских работников. 30:2 — если спасатель один.' },
    { q: 'Количество начальных спасательных вдохов ребёнку?', options: ['2', '3', '5', '10'], answer: 2, explanation: '5 начальных вдохов — критически важны, т.к. остановка часто из-за гипоксии.' },
    { q: 'Глубина компрессий у ребёнка?', options: ['5–6 см', '~1/3 грудной клетки', '2–3 см', '7–8 см'], answer: 1, explanation: 'Примерно 1/3 переднезаднего диаметра грудной клетки.' },
    { q: 'Что предпочтительно у ребёнка при AED?', options: ['Взрослые электроды', 'Педиатрические электроды/режим', 'Не использовать', 'Любые'], answer: 1, explanation: 'Педиатрические электроды снижают энергию. При их отсутствии — взрослые.' },
    { q: 'Почему у детей важна вентиляция?', options: ['Дети не реагируют на компрессии', 'Остановка часто из-за гипоксии', 'AED не работает у детей', 'Алгоритм проще'], answer: 1, explanation: 'У детей остановка сердца чаще вторична по отношению к дыхательной недостаточности.' },
    { q: 'Как открыть дыхательные пути ребёнка?', options: ['Максимальное запрокидывание', 'Нейтральное/с учётом возраста', 'Только тройной приём', 'Не открывать'], answer: 1, explanation: 'Нейтральное положение для грудных детей, лёгкое запрокидывание — для старших.' },
    { q: 'Когда начать компрессии после 5 вдохов?', options: ['Всегда', 'Если нет признаков жизни', 'Через 1 минуту', 'После AED'], answer: 1, explanation: 'Оценить признаки жизни. При их отсутствии — немедленно начать компрессии 15:2.' },
    { q: 'Электроды AED у ребёнка должны?', options: ['Соприкасаться', 'НЕ соприкасаться', 'Любое расположение', 'Только у детей до 1 года'], answer: 1, explanation: 'Электроды НЕ должны соприкасаться. Используется передне-заднее расположение при необходимости.' },
  ],
};

const FLASHCARDS = {
  adult: [
    { front: 'Где располагать руки при компрессиях?', back: 'Центр грудной клетки — основание ладони доминирующей руки, вторая рука сверху, пальцы не касаются грудной клетки.' },
    { front: 'Что такое recoil и зачем он нужен?', back: 'Полное расправление грудной клетки после каждой компрессии. Обеспечивает венозный возврат крови к сердцу. Руки не снимать, давление снимать полностью.' },
    { front: 'Когда вызывать помощь?', back: 'Немедленно при отсутствии реакции — параллельно с оценкой дыхания. Послать за AED и вызвать СНМП.' },
    { front: 'Агональное дыхание — что это?', back: 'Редкие, нерегулярные, шумные вздохи у пациента в клинической смерти. НЕ является нормальным дыханием. → Начать CPR немедленно!' },
    { front: 'Порядок действий после разряда AED?', back: 'Немедленно продолжить CPR 30:2 в течение 2 минут. Не ждать анализа ритма. Минимизировать паузы.' },
    { front: 'Почему нельзя долго искать пульс?', back: 'Задержка начала CPR резко снижает выживаемость. Отсутствие нормального дыхания = начать CPR без промедления.' },
    { front: 'Частота и глубина компрессий?', back: '100–120 в минуту, 5–6 см глубины. Избегать гипервентиляции — 10 вдохов в минуту при продвинутых дыхательных путях.' },
    { front: 'Максимальный перерыв в CPR?', back: 'Не более 10 секунд. Даже для установки продвинутых дыхательных путей и проведения разряда AED.' },
  ],
  child: [
    { front: 'Чем PBLS отличается от BLS?', back: '5 начальных спасательных вдохов, соотношение 15:2 (медработники), нейтральное положение головы у грудных детей, педиатрические электроды AED.' },
    { front: 'Зачем 5 начальных вдохов ребёнку?', back: 'У детей остановка чаще вторична из-за гипоксии. Ранняя вентиляция устраняет причину. Критически важно перед началом компрессий.' },
    { front: 'Техника компрессий ребёнку 6 лет?', back: 'Основание одной или двух рук, центр грудной клетки, ~1/3 глубины переднезаднего диаметра, 100–120/мин.' },
    { front: 'AED у ребёнка — электроды?', back: 'Педиатрические электроды или режим (< 8 лет / < 25 кг). НЕ должны соприкасаться. Передне-заднее при необходимости.' },
    { front: 'Когда начинать компрессии у ребёнка?', back: 'После 5 начальных вдохов при отсутствии признаков жизни (движений, кашля, нормального дыхания).' },
    { front: 'Техника вентиляции у грудного ребёнка?', back: 'Рот-в-рот-нос. Нейтральное положение головы. Объём — видимый подъём грудной клетки.' },
  ],
};

// ── Clinical Cases ─────────────────────────────────────────────────────────────
const CLINICAL_CASES = [
  {
    title: 'Случай 1: Внезапный коллапс в офисе',
    scenario: 'Коллега 42 лет внезапно упал со стула. На оклик не реагирует. Дыхание агональное (редкие вздохи). AED доставят через 3 минуты.',
    question: 'Каков правильный порядок действий?',
    options: [
      'Ждать AED, не начинать CPR',
      'Убедиться в безопасности → оценить реакцию → вызвать помощь → начать CPR 30:2 немедленно',
      'Сделать 2 вдоха, затем ждать',
      'Положить в стабильное боковое положение',
    ],
    answer: 1,
    explanation: 'Агональное дыхание = клиническая смерть. CPR начать немедленно, не ждать AED. Каждые 30 компрессий : 2 вдоха. При появлении AED — применить без задержки.',
    protocol: 'ERC BLS 2025, Раздел 3.2',
  },
  {
    title: 'Случай 2: AED сообщает «Разряд не показан»',
    scenario: 'После анализа ритма AED говорит «Шок не показан». Пациент без сознания, дыхания нет.',
    question: 'Что следует сделать?',
    options: [
      'Прекратить реанимацию',
      'Ожидать следующего анализа',
      'Немедленно продолжить CPR 2 минуты',
      'Повторно наложить электроды',
    ],
    answer: 2,
    explanation: '«Шок не показан» означает неуплотняемый ритм (асистолия, ЭМД). Немедленно продолжить CPR — это единственное эффективное вмешательство при этих ритмах.',
    protocol: 'ERC ALS 2025, Алгоритм асистолии',
  },
  {
    title: 'Случай 3: Ребёнок в бассейне',
    scenario: 'Ребёнок 5 лет поднят со дна бассейна. Без сознания, дыхания нет. AED недоступен.',
    question: 'Первый приоритет?',
    options: [
      'Ждать AED',
      'Начать с 30 компрессий',
      'Провести 5 начальных спасательных вдохов, затем CPR 15:2',
      'Вызвать помощь и ждать',
    ],
    answer: 2,
    explanation: 'PBLS: при утоплении — 5 начальных вдохов ОБЯЗАТЕЛЬНЫ (устранение гипоксии как причины). Затем CPR 15:2. При необходимости — можно начать CPR на воде.',
    protocol: 'ERC PBLS 2025, Утопление',
  },
  {
    title: 'Случай 4: Один спасатель и ребёнок',
    scenario: 'Вы один. Ребёнок 4 лет без сознания, дыхания нет. Телефон есть.',
    question: 'Последовательность?',
    options: [
      'Сначала вызвать СНМП, затем CPR',
      'CPR 1 минуту → вызвать СНМП → продолжать CPR',
      'Ждать кого-то, кто вызовет СНМП',
      'Только вдохи без компрессий',
    ],
    answer: 1,
    explanation: 'При одном спасателе у ребёнка: 1 минута CPR (5 вдохов + 15:2 или 30:2), затем вызов СНМП (телефон рядом — можно параллельно). Это отличие от взрослых (сначала вызов СНМП).',
    protocol: 'ERC PBLS 2025, Одиночный спасатель',
  },
  {
    title: 'Случай 5: CPR и усталость',
    scenario: 'Вы проводите CPR уже 2 минуты. Прибыл коллега. AED анализирует ритм.',
    question: 'Что делать с компрессиями во время анализа AED?',
    options: [
      'Продолжать компрессии во время анализа',
      'Остановить все CPR на время анализа',
      'Передать компрессии коллеге и минимально прервать CPR',
      'Остановить и дождаться решения AED',
    ],
    answer: 2,
    explanation: 'Передать компрессии коллеге (смена каждые 2 мин предотвращает усталость). Остановить CPR ТОЛЬКО для анализа AED и разряда. Минимизировать паузы < 5 сек.',
    protocol: 'ERC BLS 2025, Командная работа',
  },
];

// ── ERC Mnemonics ─────────────────────────────────────────────────────────────
const MNEMONICS = [
  {
    title: '«ДАП» — Первичная оценка',
    subtitle: 'Безопасность · Реакция · Помощь',
    items: [
      { letter: 'Д', word: 'Danger (Опасность)', desc: 'Убедитесь в безопасности — вы, пациент, окружающие' },
      { letter: 'А', word: 'Alert (Реакция)', desc: 'Встряхнуть плечи, громко спросить «Вы в порядке?»' },
      { letter: 'П', word: 'Помощь', desc: 'Послать за AED, вызвать 103 / СНМП' },
    ],
    color: Colors.accent,
  },
  {
    title: 'ABC в реанимации',
    subtitle: 'Компрессии → Дыхательные пути → Дыхание',
    items: [
      { letter: 'C', word: 'Compressions', desc: '30 компрессий 5–6 см, 100–120/мин, полный recoil' },
      { letter: 'A', word: 'Airway', desc: 'Запрокидывание головы + подъём подбородка' },
      { letter: 'B', word: 'Breathing', desc: '2 вдоха, каждый 1 сек, видимый подъём грудной клетки' },
    ],
    color: Colors.warning,
  },
  {
    title: 'AED — 4 шага',
    subtitle: 'Включить · Наложить · Анализ · Разряд',
    items: [
      { letter: '1', word: 'Включить AED', desc: 'Нажать кнопку или открыть крышку' },
      { letter: '2', word: 'Наложить электроды', desc: 'По схеме на картинке. Кожа сухая и голая' },
      { letter: '3', word: 'Анализ ритма', desc: 'Все отойти! Не касаться пациента' },
      { letter: '4', word: 'Разряд + CPR', desc: 'Нажать кнопку разряда → немедленно CPR 2 мин' },
    ],
    color: Colors.danger,
  },
  {
    title: 'Критерии СДАЛ',
    subtitle: 'Три условия — все обязательны',
    items: [
      { letter: '≥70', word: 'Балл ≥ 70 / 100', desc: 'Суммарный балл по всем разделам чек-листа' },
      { letter: '✓', word: 'Нет крит. ошибки', desc: 'Ни одна из критических ошибок не допущена' },
      { letter: 'CPR', word: 'CPR начата', desc: 'Компрессии начаты в правильный момент алгоритма' },
    ],
    color: Colors.success,
  },
];

// ── Quiz Result ───────────────────────────────────────────────────────────────
function QuizResult({ correct, total, onBack }: { correct: number; total: number; onBack: () => void }) {
  const pct = Math.round((correct / total) * 100);
  const passed = pct >= 70;
  return (
    <View style={qrStyles.wrap}>
      <View style={[qrStyles.circle, { borderColor: passed ? Colors.success : Colors.danger }]}>
        <MaterialIcons name={passed ? 'emoji-events' : 'menu-book'} size={40} color={passed ? Colors.success : Colors.warning} />
        <Text style={[qrStyles.pct, { color: passed ? Colors.success : Colors.danger }]}>{pct}%</Text>
      </View>
      <Text style={qrStyles.title}>{passed ? 'Отлично!' : 'Нужно повторить'}</Text>
      <Text style={qrStyles.sub}>{correct} из {total} правильных</Text>
      <TouchableOpacity style={[qrStyles.btn, { backgroundColor: Colors.accent }]} onPress={onBack} activeOpacity={0.8}>
        <Text style={qrStyles.btnText}>Вернуться</Text>
      </TouchableOpacity>
    </View>
  );
}
const qrStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl },
  circle: { width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center', borderWidth: 2, gap: 4, backgroundColor: Colors.surface },
  pct: { fontSize: FontSize.lg, fontWeight: '800' },
  title: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700' },
  sub: { color: Colors.textMuted, fontSize: FontSize.md },
  btn: { borderRadius: Radius.lg, paddingHorizontal: 32, paddingVertical: 14, marginTop: Spacing.sm },
  btnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
});

export default function StudyScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const router = useRouter();
  const [mode, setMode] = useState<StudyMode>('menu');
  const [scenario, setScenario] = useState<Scenario>('adult');
  const [algoScenario, setAlgoScenario] = useState<Scenario>('adult');
  const [quizIndex, setQuizIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [caseIndex, setCaseIndex] = useState(0);
  const [caseSelected, setCaseSelected] = useState<number | null>(null);
  const [showCaseExp, setShowCaseExp] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const scenarioAnim = useRef(new Animated.Value(scenario === 'adult' ? 0 : 1)).current;
  const algoScenarioAnim = useRef(new Animated.Value(algoScenario === 'adult' ? 0 : 1)).current;
  
  const confirmExit = () => {
    Alert.alert(
      'Завершить обучение?',
      'Вы уверены, что хотите прервать текущий сеанс обучения?',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Выйти', 
          style: 'destructive', 
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setMode('menu');
          }
        }
      ]
    );
  };

  useEffect(() => {
    Animated.spring(scenarioAnim, { toValue: scenario === 'adult' ? 0 : 1, useNativeDriver: false, bounciness: 8 }).start();
  }, [scenario]);

  useEffect(() => {
    Animated.spring(algoScenarioAnim, { toValue: algoScenario === 'adult' ? 0 : 1, useNativeDriver: false, bounciness: 8 }).start();
  }, [algoScenario]);

  useEffect(() => {
    const isArticle = mode !== 'menu';
    if (isArticle) {
      navigation.setOptions({ tabBarStyle: { display: 'none' } });
    } else {
      // Re-apply the floating styles from the layout to prevent "squeezing" or reverting to default
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
    }
  }, [mode, navigation, insets.bottom]);

  const questions = QUIZ_QUESTIONS[scenario];
  const cards = FLASHCARDS[scenario];
  const algoSteps = algoScenario === 'adult' ? ADULT_ALGORITHM_STEPS : CHILD_ALGORITHM_STEPS;

  const handleAnswer = (idx: number) => {
    if (selected !== null) return;
    const isRight = idx === questions[quizIndex].answer;
    Haptics.notificationAsync(isRight ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    setSelected(idx);
    if (isRight) setCorrect(c => c + 1);
  };

  const nextQuestion = () => {
    if (quizIndex < questions.length - 1) { setQuizIndex(q => q + 1); setSelected(null); }
    else setQuizDone(true);
  };

  const resetQuiz = () => { setQuizIndex(0); setSelected(null); setCorrect(0); setQuizDone(false); setMode('menu'); };
  const flipCard = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFlipped(f => !f); };
  const nextCard = () => { setFlipped(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCardIndex(i => (i + 1) % cards.length); };
  const prevCard = () => { setFlipped(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCardIndex(i => (i - 1 + cards.length) % cards.length); };

  // ── Algorithm ──────────────────────────────────────────────────────────────
  if (mode === 'algorithm') {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <View style={styles.subHeader}>
          <Text style={styles.subTitle}>Алгоритм BLS</Text>
          <TouchableOpacity style={styles.backBtn} onPress={confirmExit} activeOpacity={0.7}>
            <MaterialIcons name="close" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.tabRow}>
          <Animated.View style={[styles.tabBubble, { 
            left: algoScenarioAnim.interpolate({ inputRange: [0, 1], outputRange: [0, Dimensions.get('window').width / 2] }) 
          }]} />
          {(['adult', 'child'] as Scenario[]).map(sc => (
            <TouchableOpacity key={sc} style={styles.tab} onPress={() => setAlgoScenario(sc)} activeOpacity={0.8}>
              <MaterialIcons name={sc === 'adult' ? 'person' : 'child-care'} size={14} color={algoScenario === sc ? '#FBBF24' : Colors.textMuted} />
              <Text style={[styles.tabText, algoScenario === sc && styles.tabTextActive]}>{sc === 'adult' ? 'Взрослый' : 'Ребёнок'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.principleCard}>
            <MaterialIcons name="priority-high" size={16} color={Colors.danger} />
            <Text style={styles.principleText}>
              {algoScenario === 'adult' ? 'Без сознания + нет нормального дыхания → CPR 30:2 немедленно' : 'Без сознания + нет дыхания → 5 вдохов → CPR 15:2'}
            </Text>
          </View>
          {algoSteps.map((step, i) => {
            const isKey = (algoScenario === 'adult' && (i === 7 || i === 9)) || (algoScenario === 'child' && (i === 7 || i === 8));
            return (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepLeft}>
                  <View style={[styles.stepNum, isKey && { backgroundColor: Colors.danger }]}><Text style={styles.stepNumText}>{i + 1}</Text></View>
                  {i < algoSteps.length - 1 && <View style={styles.stepLine} />}
                </View>
                <View style={[styles.stepCard, isKey && { borderColor: Colors.danger + '50', backgroundColor: Colors.dangerDim }]}>
                  <Text style={[styles.stepText, isKey && { color: Colors.textPrimary, fontWeight: '600' }]}>{step}</Text>
                </View>
              </View>
            );
          })}
          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    );
  }

  // ── Quiz ───────────────────────────────────────────────────────────────────
  if (mode === 'quiz') {
    if (quizDone) {
      return (
        <View style={[styles.root, { paddingTop: insets.top }]}>
          <StatusBar style="light" />
          <View style={styles.subHeader}>
            <TouchableOpacity style={styles.backBtn} onPress={resetQuiz} activeOpacity={0.7}>
              <MaterialIcons name="close" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
            <Text style={styles.subTitle}>Тест завершён</Text>
          </View>
          <QuizResult correct={correct} total={questions.length} onBack={resetQuiz} />
        </View>
      );
    }
    const q = questions[quizIndex];
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <View style={styles.subHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={resetQuiz} activeOpacity={0.7}>
            <MaterialIcons name="close" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
          <View style={styles.quizProg}>
            <View style={styles.quizBarBg}>
              <View style={[styles.quizBarFill, { width: `${((quizIndex + 1) / questions.length) * 100}%` as any }]} />
            </View>
            <Text style={styles.quizCount}>{quizIndex + 1}/{questions.length}</Text>
          </View>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.quizScroll}>
          <Text style={styles.quizScenarioLabel}>{scenario === 'adult' ? 'Взрослый BLS' : 'Педиатрический PBLS'}</Text>
          <Text style={styles.quizQuestion}>{q.q}</Text>
          <View style={styles.quizOptions}>
            {q.options.map((opt, i) => {
              const isSelected = selected === i;
              const isCorrect = i === q.answer;
              const show = selected !== null;
              let bg = Colors.surfaceGlass, border = Colors.borderGlass;
              if (show && isCorrect) { bg = Colors.successDim; border = Colors.success; }
              else if (show && isSelected && !isCorrect) { bg = Colors.dangerDim; border = Colors.danger; }
              else if (isSelected && !show) { bg = 'rgba(251,191,36,0.1)'; border = '#FBBF24'; }
              return (
                <TouchableOpacity key={i} style={[styles.quizOpt, { backgroundColor: bg, borderColor: border }]} onPress={() => handleAnswer(i)} disabled={selected !== null} activeOpacity={0.75}>
                  <View style={[styles.quizLetter, { borderColor: show && isCorrect ? Colors.success : Colors.borderGlass }]}>
                    <Text style={styles.quizLetterText}>{['A', 'B', 'C', 'D'][i]}</Text>
                  </View>
                  <Text style={[styles.quizOptText, show && isCorrect && { color: Colors.success }, show && isSelected && !isCorrect && { color: Colors.danger }]}>{opt}</Text>
                  {show && isCorrect && <MaterialIcons name="check-circle" size={18} color={Colors.success} />}
                  {show && isSelected && !isCorrect && <MaterialIcons name="cancel" size={18} color={Colors.danger} />}
                </TouchableOpacity>
              );
            })}
          </View>
          {/* Explanation */}
          {selected !== null && (
            <View style={[styles.explanationBox, { borderColor: selected === q.answer ? Colors.success + '40' : Colors.danger + '40', backgroundColor: selected === q.answer ? Colors.successDim : Colors.dangerDim }]}>
              <MaterialIcons name="info-outline" size={14} color={selected === q.answer ? Colors.success : Colors.danger} />
              <Text style={[styles.explanationText, { color: selected === q.answer ? Colors.success : Colors.danger }]}>{q.explanation}</Text>
            </View>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
        {selected !== null && (
          <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 8 }]}>
            <TouchableOpacity style={styles.nextBtnLarge} onPress={nextQuestion} activeOpacity={0.85}>
              <Text style={styles.nextBtnLargeText}>{quizIndex === questions.length - 1 ? 'Завершить' : 'Далее'}</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // ── Flashcards ─────────────────────────────────────────────────────────────
  if (mode === 'flashcard') {
    const card = cards[cardIndex];
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <View style={styles.subHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => { setMode('menu'); setCardIndex(0); setFlipped(false); }} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back-ios" size={16} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.subTitle}>Карточки · {cardIndex + 1}/{cards.length}</Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardDots}>
            {cards.map((_, i) => <View key={i} style={[styles.dot, i === cardIndex && { backgroundColor: '#FBBF24', width: 20 }]} />)}
          </View>
          <TouchableOpacity style={[styles.flashcard, flipped && { backgroundColor: 'rgba(251,191,36,0.05)' }]} onPress={flipCard} activeOpacity={0.9}>
            <View style={[styles.flashcardSideBadge, { backgroundColor: flipped ? '#FBBF24' : '#2C2C2E' }]}>
              <Text style={[styles.flashcardSide, { color: flipped ? '#000' : '#FBBF24' }]}>{flipped ? 'ОТВЕТ' : 'ВОПРОС'}</Text>
            </View>
            <Text style={styles.flashcardText}>{flipped ? card.back : card.front}</Text>
            {!flipped && <Text style={styles.flashcardHint}>Нажмите, чтобы открыть ответ</Text>}
          </TouchableOpacity>
          <View style={styles.cardNavRow}>
            <TouchableOpacity style={styles.cardNavBtn} onPress={prevCard} activeOpacity={0.75}>
              <MaterialIcons name="arrow-back-ios" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cardNavBtn, { backgroundColor: '#FBBF24', borderColor: '#FBBF24' }]} onPress={nextCard} activeOpacity={0.75}>
              <MaterialIcons name="arrow-forward-ios" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ── Clinical Cases ─────────────────────────────────────────────────────────
  if (mode === 'clinical') {
    const c = CLINICAL_CASES[caseIndex];
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <View style={styles.subHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => { setMode('menu'); setCaseIndex(0); setCaseSelected(null); setShowCaseExp(false); }} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back-ios" size={16} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.quizProg}>
            <View style={styles.quizBarBg}>
              <View style={[styles.quizBarFill, { width: `${((caseIndex + 1) / CLINICAL_CASES.length) * 100}%` as any }]} />
            </View>
            <Text style={styles.quizCount}>{caseIndex + 1}/{CLINICAL_CASES.length}</Text>
          </View>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.quizScroll}>
          <View style={styles.caseCard}>
            <View style={styles.caseTitleRow}>
              <MaterialIcons name="local-hospital" size={16} color={Colors.danger} />
              <Text style={styles.caseTitle}>{c.title}</Text>
            </View>
            <Text style={styles.caseScenario}>{c.scenario}</Text>
          </View>
          <Text style={styles.caseQuestion}>{c.question}</Text>
          {c.options.map((opt, i) => {
            const isSelected = caseSelected === i;
            const isCorrect = i === c.answer;
            const show = caseSelected !== null;
            let bg = Colors.surfaceGlass, border = Colors.borderGlass;
            if (show && isCorrect) { bg = Colors.successDim; border = Colors.success; }
            else if (show && isSelected && !isCorrect) { bg = Colors.dangerDim; border = Colors.danger; }
            return (
              <TouchableOpacity key={i} style={[styles.quizOpt, { backgroundColor: bg, borderColor: border, marginBottom: 8 }]} onPress={() => { if (caseSelected !== null) return; Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCaseSelected(i); setShowCaseExp(true); }} disabled={caseSelected !== null} activeOpacity={0.75}>
                <View style={[styles.quizLetter, { borderColor: show && isCorrect ? Colors.success : Colors.borderGlass }]}>
                  <Text style={styles.quizLetterText}>{['A', 'B', 'C', 'D'][i]}</Text>
                </View>
                <Text style={[styles.quizOptText, show && isCorrect && { color: Colors.success }, show && isSelected && !isCorrect && { color: Colors.danger }]}>{opt}</Text>
                {show && isCorrect && <MaterialIcons name="check-circle" size={18} color={Colors.success} />}
                {show && isSelected && !isCorrect && <MaterialIcons name="cancel" size={18} color={Colors.danger} />}
              </TouchableOpacity>
            );
          })}
          {showCaseExp && (
            <View style={styles.caseExpBox}>
              <Text style={styles.caseExpTitle}>Разбор</Text>
              <Text style={styles.caseExpText}>{c.explanation}</Text>
              <Text style={styles.caseProtocol}>{c.protocol}</Text>
            </View>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
        {caseSelected !== null && (
          <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 8 }]}>
            <TouchableOpacity
              style={styles.nextBtnLarge}
              onPress={() => { if (caseIndex < CLINICAL_CASES.length - 1) { setCaseIndex(i => i + 1); setCaseSelected(null); setShowCaseExp(false); } else { setMode('menu'); setCaseIndex(0); setCaseSelected(null); setShowCaseExp(false); } }}
              activeOpacity={0.85}
            >
              <Text style={styles.nextBtnLargeText}>{caseIndex === CLINICAL_CASES.length - 1 ? 'Завершить' : 'Следующий случай'}</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // ── Mnemonics ──────────────────────────────────────────────────────────────
  if (mode === 'mnemonics') {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <View style={styles.subHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setMode('menu')} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back-ios" size={16} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.subTitle}>Мнемоники ERC 2025</Text>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {MNEMONICS.map((m, mi) => (
            <View key={mi} style={[styles.mnemoCard, { borderColor: m.color + '30' }]}>
              <Text style={[styles.mnemoTitle, { color: m.color }]}>{m.title}</Text>
              <Text style={styles.mnemoSub}>{m.subtitle}</Text>
              {m.items.map((item, ii) => (
                <View key={ii} style={styles.mnemoRow}>
                  <View style={[styles.mnemoLetter, { backgroundColor: m.color + '20', borderColor: m.color + '40' }]}>
                    <Text style={[styles.mnemoLetterText, { color: m.color }]}>{item.letter}</Text>
                  </View>
                  <View style={styles.mnemoContent}>
                    <Text style={styles.mnemoWord}>{item.word}</Text>
                    <Text style={styles.mnemoDesc}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          ))}
          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    );
  }

  // ── New Modes (Articles) ───────────────────────────────────────────────────
  if (['aed', 'choking', 'recovery', 'emergency'].includes(mode)) {
    const data = NEW_MODES_DATA[mode as keyof typeof NEW_MODES_DATA][scenario];
    const iconName = mode === 'aed' ? 'flash-on' : mode === 'choking' ? 'error-outline' : mode === 'recovery' ? 'airline-seat-flat' : 'call';
    
    return (
      <View style={[styles.root, { backgroundColor: '#000' }]}>
        <StatusBar style="light" />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          <LinearGradient colors={[data.color, '#000']} style={[styles.articleHeader, { paddingTop: insets.top + 20 }]}>
            <View style={styles.articleHeaderTop}>
              <View style={styles.articleIconBoxMini}>
                <MaterialIcons name={iconName as any} size={20} color="#fff" />
              </View>
              <TouchableOpacity style={styles.articleCloseMini} onPress={confirmExit} activeOpacity={0.7}>
                <MaterialIcons name="close" size={20} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>
            <Text style={styles.articleCat}>{scenario === 'adult' ? 'БАЗОВЫЙ КУРС' : 'ПЕДИАТРИЧЕСКИЙ КУРС'}</Text>
            <Text style={styles.articleTitle}>{data.title}</Text>
            <Text style={styles.articleSub}>{data.subtitle}</Text>
          </LinearGradient>

          <View style={styles.articleBody}>
            {data.steps.map((item, ii) => (
              <View key={ii} style={styles.articleStepRow}>
                <View style={styles.articleStepLineBox}>
                  <View style={[styles.articleStepDot, { backgroundColor: data.color }]} />
                  {ii < data.steps.length - 1 && <View style={styles.articleStepLine} />}
                </View>
                <View style={styles.articleStepCard}>
                  <Text style={[styles.articleStepNum, { color: data.color }]}>ШАГ {item.letter}</Text>
                  <Text style={styles.articleStepTitle}>{item.title}</Text>
                  <Text style={styles.articleStepDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
        <View style={[styles.articleFooter, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity style={[styles.articleFinishBtn, { backgroundColor: data.color }]} onPress={() => setMode('menu')} activeOpacity={0.8}>
            <Text style={styles.articleFinishText}>Завершить изучение</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Menu ───────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <View style={styles.iosHeader}>
        <Text style={styles.iosTitle}>Обучение</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.sectionLabel}>СЦЕНАРИЙ</Text>
        <View style={styles.scenRow}>
          <Animated.View style={[styles.scenBubble, { 
            left: scenarioAnim.interpolate({ inputRange: [0, 1], outputRange: [4, (Dimensions.get('window').width - 32 - 8) / 2 + 4] }) 
          }]} />
          {(['adult', 'child'] as Scenario[]).map(sc => (
            <TouchableOpacity key={sc} style={styles.scenBtn} onPress={() => setScenario(sc)} activeOpacity={0.8}>
              <MaterialIcons name={sc === 'adult' ? 'person' : 'child-care'} size={18} color={scenario === sc ? '#fff' : Colors.textMuted} />
              <Text style={[styles.scenBtnText, scenario === sc && { color: '#fff' }]}>{sc === 'adult' ? 'Взрослый' : 'Ребёнок'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {([
          { 
            id: 'algorithm', 
            icon: 'account-tree' as const, 
            title: scenario === 'adult' ? 'Алгоритм BLS' : 'Алгоритм PBLS', 
            desc: 'Пошаговый алгоритм ERC 2025', 
            colors: scenario === 'adult' ? ['#A83030', '#2A0A0A'] : ['#2E86AB', '#0B212B'], 
            badge: null 
          },
          { 
            id: 'flashcard', 
            icon: 'style' as const, 
            title: 'Карточки', 
            desc: `${cards.length} карточек с разбором`, 
            colors: scenario === 'adult' ? ['#D97022', '#3D1D04'] : ['#8E44AD', '#24112C'], 
            badge: `${cards.length}` 
          },
          { 
            id: 'quiz', 
            icon: 'quiz' as const, 
            title: 'Тест', 
            desc: `${questions.length} вопросов для проверки`, 
            colors: scenario === 'adult' ? ['#27598C', '#0A1828'] : ['#16A085', '#062922'], 
            badge: `${questions.length}` 
          },
          { 
            id: 'clinical', 
            icon: 'local-hospital' as const, 
            title: 'Клинические случаи', 
            desc: 'Сценарные задачи с разбором', 
            colors: scenario === 'adult' ? ['#186648', '#061A12'] : ['#D35400', '#351500'], 
            badge: 'NEW' 
          },
          { 
            id: 'aed', 
            icon: 'flash-on' as const, 
            title: scenario === 'adult' ? 'АНД и разряды' : 'АНД в педиатрии', 
            desc: 'Работа с дефибриллятором', 
            colors: scenario === 'adult' ? ['#B7950B', '#2E2503'] : ['#2471A3', '#091C29'], 
            badge: null 
          },
          { 
            id: 'choking', 
            icon: 'error-outline' as const, 
            title: scenario === 'adult' ? 'Удушье (Геймлих)' : 'Удушье (Младенцы)', 
            desc: 'Инородное тело в дых. путях', 
            colors: scenario === 'adult' ? ['#7D3C98', '#1F0F26'] : ['#C0392B', '#300E0B'], 
            badge: null 
          },
          { 
            id: 'recovery', 
            icon: 'airline-seat-flat' as const, 
            title: 'Боковое положение', 
            desc: 'Обеспечение проходимости путей', 
            colors: scenario === 'adult' ? ['#2E4053', '#0B1015'] : ['#138D75', '#05231D'], 
            badge: null 
          },
          { 
            id: 'emergency', 
            icon: 'call' as const, 
            title: 'Вызов 103/112', 
            desc: 'Как правильно передать данные', 
            colors: scenario === 'adult' ? ['#2874A6', '#0A1D29'] : ['#7B241C', '#1F0907'], 
            badge: null 
          },
          { 
            id: 'mnemonics', 
            icon: 'psychology' as const, 
            title: 'Мнемоники ERC', 
            desc: 'ДАП, ABC, AED — запомнить легко', 
            colors: ['#4A4A4C', '#121213'], 
            badge: null 
          },
        ] as const).map(m => (
          <TouchableOpacity
            key={m.id}
            style={styles.modeCardWrapper}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMode(m.id as StudyMode); }}
            activeOpacity={0.85}
          >
            <LinearGradient colors={m.colors as [string, string]} style={styles.modeGradient} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
              <View style={styles.modeIconCircle}>
                <MaterialIcons name={m.icon} size={28} color="#fff" />
              </View>
              <View style={styles.modeTextContainer}>
                <View style={styles.modeHeaderRow}>
                  <Text style={styles.modeTitleTextMain}>{m.title}</Text>
                  {m.badge && (
                    <View style={styles.modeBadgeMini}>
                      <Text style={styles.modeBadgeTextMini}>{m.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.modeDescTextMain}>{m.desc}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="rgba(255,255,255,0.5)" />
            </LinearGradient>
          </TouchableOpacity>
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: 110 },
  quizScroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: 110 },

  iosHeader: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  iosTitle: { color: Colors.textPrimary, fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },

  promoCardContainer: { marginBottom: 10 },
  promoCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16 },
  promoIconBox: { width: 40, height: 40, marginRight: 14, alignItems: 'center', justifyContent: 'center' },
  promoTextWrap: { flex: 1, justifyContent: 'center' },
  promoTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700', marginBottom: 2, letterSpacing: -0.3 },
  promoSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500' },

  subHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  backBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: Colors.surfaceGlass, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.borderGlass },
  subTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700' },
  sectionLabel: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: Spacing.sm, marginTop: Spacing.xs },

  scenRow: { flexDirection: 'row', gap: 0, marginBottom: Spacing.lg, backgroundColor: '#1C1C1E', padding: 4, borderRadius: 12, position: 'relative' },
  scenBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 40, borderRadius: 10, zIndex: 1 },
  scenBubble: { position: 'absolute', top: 4, bottom: 4, width: (Dimensions.get('window').width - 32 - 8) / 2, backgroundColor: '#3A3A3C', borderRadius: 9 },
  scenBtnText: { color: Colors.textMuted, fontSize: 14, fontWeight: '700' },

  modeItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#1C1C1E', 
    borderRadius: Radius.lg, 
    padding: Spacing.md, 
    marginBottom: Spacing.sm 
  },
  modeIconContainer: { marginRight: Spacing.md },
  modeIconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modeInfo: { flex: 1 },
  modeTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  modeCardWrapper: { marginBottom: 12, borderRadius: 16, overflow: 'hidden' },
  modeGradient: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  modeIconCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  modeTextContainer: { flex: 1 },
  modeHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  modeTitleTextMain: { color: '#fff', fontSize: 18, fontWeight: '700' },
  modeBadgeMini: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  modeBadgeTextMini: { color: '#fff', fontSize: 10, fontWeight: '800' },
  modeDescTextMain: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500' },

  // Algorithm
  tabRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: Colors.border, backgroundColor: '#000', position: 'relative' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, zIndex: 1 },
  tabBubble: { position: 'absolute', bottom: 0, height: 2, width: '50%', backgroundColor: '#FBBF24' },
  tabText: { color: Colors.textMuted, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#FBBF24' },
  principleCard: { backgroundColor: 'rgba(248,113,113,0.1)', borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(248,113,113,0.2)', flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start', marginBottom: Spacing.md },
  principleText: { color: Colors.textPrimary, fontSize: 14, lineHeight: 20, flex: 1, fontWeight: '600' },
  stepRow: { flexDirection: 'row', marginBottom: 2 },
  stepLeft: { alignItems: 'center', width: 36, marginRight: Spacing.sm },
  stepNum: { width: 26, height: 26, borderRadius: 9, backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700' },
  stepLine: { width: 1.5, flex: 1, backgroundColor: Colors.border, marginTop: 4, marginBottom: 4 },
  stepCard: { flex: 1, backgroundColor: '#1C1C1E', borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 0.5, borderColor: Colors.border },
  stepText: { color: Colors.textSecondary, fontSize: 15, flex: 1, lineHeight: 22 },

  // Quiz
  quizProg: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  quizBarBg: { flex: 1, height: 4, backgroundColor: '#2C2C2E', borderRadius: 2, overflow: 'hidden' },
  quizBarFill: { height: '100%', backgroundColor: '#FBBF24', borderRadius: 2 },
  quizCount: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
  quizScenarioLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },
  quizQuestion: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 28, marginBottom: Spacing.lg },
  quizOptions: { gap: Spacing.sm },
  quizOpt: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1.5 },
  quizLetter: { width: 28, height: 28, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  quizLetterText: { color: Colors.textMuted, fontSize: 14, fontWeight: '700' },
  quizOptText: { color: Colors.textSecondary, fontSize: 16, flex: 1, lineHeight: 22 },
  explanationBox: { borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, marginTop: Spacing.md, flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  explanationText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '500' },
  bottomNav: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: 32, borderTopWidth: 0.5, borderTopColor: Colors.border, backgroundColor: '#000' },
  nextBtnLarge: { backgroundColor: '#FBBF24', borderRadius: Radius.xl, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  nextBtnLargeText: { color: '#000', fontSize: 17, fontWeight: '700' },

  // Flashcards
  cardContent: { flex: 1, paddingHorizontal: Spacing.md, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  cardDots: { flexDirection: 'row', gap: 6, marginBottom: Spacing.lg },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2C2C2E' },
  flashcard: { width: '100%', minHeight: 280, backgroundColor: '#1C1C1E', borderRadius: Radius.xl, padding: Spacing.xl, justifyContent: 'center', alignItems: 'center', gap: Spacing.md, borderWidth: 0.5, borderColor: Colors.border },
  flashcardSideBadge: { borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 8 },
  flashcardSide: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  flashcardText: { color: '#fff', fontSize: 20, textAlign: 'center', lineHeight: 28, fontWeight: '600' },
  flashcardHint: { color: Colors.textMuted, fontSize: 14, marginTop: Spacing.sm },
  cardNavRow: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.xl },
  cardNavBtn: { width: 56, height: 56, borderRadius: 18, backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2C2C2E' },

  // Clinical cases
  caseCard: { backgroundColor: '#1C1C1E', borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 0.5, borderColor: 'rgba(248,113,113,0.2)' },
  caseTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  caseTitle: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1 },
  caseScenario: { color: Colors.textSecondary, fontSize: 15, lineHeight: 22 },
  caseQuestion: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 28, marginBottom: Spacing.md },
  caseExpBox: { backgroundColor: 'rgba(96,165,250,0.1)', borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(96,165,250,0.2)', marginTop: Spacing.md },
  caseExpTitle: { color: '#60A5FA', fontSize: 13, fontWeight: '800', marginBottom: 6, letterSpacing: 0.5 },
  caseExpText: { color: Colors.textPrimary, fontSize: 14, lineHeight: 20, marginBottom: 6 },
  caseProtocol: { color: Colors.textMuted, fontSize: 12, fontStyle: 'italic' },

  // Mnemonics
  mnemoCard: { backgroundColor: '#1C1C1E', borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 0.5, borderColor: Colors.border },
  mnemoTitle: { fontSize: 18, fontWeight: '800', marginBottom: 3 },
  mnemoSub: { color: Colors.textMuted, fontSize: 14, marginBottom: Spacing.md },
  mnemoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.sm },
  mnemoLetter: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0 },
  mnemoLetterText: { fontSize: 16, fontWeight: '900' },
  mnemoContent: { flex: 1 },
  mnemoWord: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  mnemoDesc: { color: Colors.textMuted, fontSize: 13, lineHeight: 18 },

  // Article (New Modes)
  articleHeader: { paddingHorizontal: 24, paddingBottom: 32, gap: 10 },
  articleHeaderTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  articleIconBoxMini: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  articleCloseMini: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  articleCat: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  articleTitle: { color: '#fff', fontSize: 26, fontWeight: '800', lineHeight: 32 },
  articleSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  articleBody: { paddingHorizontal: 24, marginTop: -24, backgroundColor: '#000', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 32 },
  articleStepRow: { flexDirection: 'row', gap: 16, marginBottom: 2 },
  articleStepLineBox: { alignItems: 'center', width: 20 },
  articleStepDot: { width: 10, height: 10, borderRadius: 5, marginTop: 8 },
  articleStepLine: { width: 2, flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 4 },
  articleStepCard: { flex: 1, paddingBottom: 32 },
  articleStepNum: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  articleStepTitle: { color: '#fff', fontSize: 19, fontWeight: '700', marginBottom: 8 },
  articleStepDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 24 },
  articleFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, backgroundColor: 'rgba(0,0,0,0.8)' },
  articleFinishBtn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  articleFinishText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
