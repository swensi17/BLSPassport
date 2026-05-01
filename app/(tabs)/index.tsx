import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Pressable, Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize, glassStyle } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { loadSessions, SessionRecord } from '@/services/sessionStorage';
import { LinearGradient } from 'expo-linear-gradient';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=900&q=80';
const ADULT_IMAGE = 'https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?w=600&q=80';
const CHILD_IMAGE = 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=600&q=80';
const STUDY_IMAGE = 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&q=80';
const HISTORY_IMAGE = 'https://images.unsplash.com/photo-1504813184591-01572f98c85f?w=600&q=80';

interface Stats {
  total: number;
  passed: number;
  avgScore: number;
  passRate: number;
}

// ── Animated counter ──────────────────────────────────────────────────────────
function AnimatedCounter({ value, color, suffix = '' }: { value: number; color?: string; suffix?: string }) {
  const animVal = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    animVal.setValue(0);
    Animated.timing(animVal, { toValue: value, duration: 1200, useNativeDriver: false }).start();
    const listener = animVal.addListener(({ value: v }) => setDisplay(Math.round(v)));
    return () => animVal.removeListener(listener);
  }, [value]);

  return (
    <Text style={[styles.statVal, color ? { color } : {}]}>
      {display}{suffix}
    </Text>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { profileName, userRole, currentUser } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);

  const firstName = profileName ? profileName.split(' ')[0] : null;
  const roleLabel = userRole === 'admin' ? 'Администратор' : 'Пользователь';
  const roleColor = userRole === 'admin' ? Colors.warning : Colors.accent;

  useEffect(() => {
    loadSessions(currentUser?.username).then((sessions: SessionRecord[]) => {
      if (sessions.length === 0) return;
      const passed = sessions.filter(s => s.passed).length;
      const avg = Math.round(sessions.reduce((a, s) => a + s.totalScore, 0) / sessions.length);
      setStats({
        total: sessions.length,
        passed,
        avgScore: avg,
        passRate: Math.round((passed / sessions.length) * 100),
      });
    });
  }, []);

  const nav = (tab: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(tab as any);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting} numberOfLines={1}>{firstName ? `Привет, ${firstName}` : 'Добро пожаловать'}</Text>
            <Text style={styles.subTitle}>СВГК · BLS Station</Text>
          </View>
        </View>

        {/* Hero */}
        <View style={styles.heroCard}>
          <Image source={{ uri: HERO_IMAGE }} style={styles.heroImage} contentFit="cover" transition={300} />
          <View style={styles.heroOverlay}>
            <View style={styles.heroBadge}>
              <MaterialIcons name="favorite" size={11} color="#fff" />
              <Text style={styles.heroBadgeText}>ERC 2025</Text>
            </View>
            <Text style={styles.heroTitle}>Базовая{'\n'}сердечно-лёгочная{'\n'}реанимация</Text>
            <Text style={styles.heroSub}>у взрослых и детей · OSCE-станция · Ташкент 2026</Text>
          </View>
        </View>

        {/* Animated Stats */}
        {stats && (
          <>
            <Text style={styles.sectionLabel}>ВАША СТАТИСТИКА</Text>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <AnimatedCounter value={stats.total} color={Colors.accent} />
                <Text style={styles.statLabel}>Сессий</Text>
              </View>
              <View style={styles.statCard}>
                <AnimatedCounter value={stats.passRate} color={Colors.success} suffix="%" />
                <Text style={styles.statLabel}>Сдали</Text>
              </View>
              <View style={styles.statCard}>
                <AnimatedCounter
                  value={stats.avgScore}
                  color={stats.avgScore >= 70 ? Colors.success : Colors.danger}
                />
                <Text style={styles.statLabel}>Ср. балл</Text>
              </View>
            </View>
          </>
        )}

        {/* Quick start */}
        <Text style={styles.sectionLabel}>НАЧАТЬ ЭКЗАМЕН</Text>
        <View style={styles.scenarioRow}>
          <Pressable style={({ pressed }) => [styles.scenarioCard, pressed && { scale: 0.98 }]} onPress={() => nav('/(tabs)/checklist')}>
            <Image source={{ uri: ADULT_IMAGE }} style={styles.scenarioImg} contentFit="cover" transition={200} />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.scenarioOverlay}>
              <View style={styles.scenarioNumBadge}><Text style={styles.scenarioNumText}>01</Text></View>
              <Text style={styles.scenarioTitle}>Взрослый</Text>
              <Text style={styles.scenarioSub}>≈50 лет · BLS</Text>
            </LinearGradient>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.scenarioCard, pressed && { scale: 0.98 }]} onPress={() => nav('/(tabs)/checklist')}>
            <Image source={{ uri: CHILD_IMAGE }} style={styles.scenarioImg} contentFit="cover" transition={200} />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.scenarioOverlay}>
              <View style={[styles.scenarioNumBadge, { backgroundColor: '#34D39990' }]}><Text style={styles.scenarioNumText}>02</Text></View>
              <Text style={styles.scenarioTitle}>Ребёнок</Text>
              <Text style={styles.scenarioSub}>≈6 лет · PBLS</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Nav */}
        <Text style={styles.sectionLabel}>РАЗДЕЛЫ</Text>
        {[
          { img: STUDY_IMAGE, icon: 'school', title: 'Режим обучения', sub: 'Алгоритмы · Карточки · Тест', route: '/(tabs)/study', color: Colors.warning },
          { img: ADULT_IMAGE, icon: 'fact-check', title: 'Экзамен', sub: 'Пошаговый чек-лист · Таймер · PDF', route: '/(tabs)/checklist', color: Colors.accent },
          { img: HISTORY_IMAGE, icon: 'history', title: 'История сессий', sub: 'Результаты · Статистика · Экспорт', route: '/(tabs)/history', color: Colors.success },
        ].map((item, i) => (
          <Pressable key={i} style={({ pressed }) => [styles.navCard, pressed && { opacity: 0.85 }]} onPress={() => nav(item.route)}>
            <Image source={{ uri: item.img }} style={styles.navCardImg} contentFit="cover" transition={200} />
            <View style={styles.navCardOverlay}>
              <View style={[styles.navCardIconBox, { backgroundColor: item.color + '25' }]}>
                <MaterialIcons name={item.icon as any} size={20} color={item.color} />
              </View>
              <View style={styles.navCardText}>
                <Text style={styles.navCardTitle}>{item.title}</Text>
                <Text style={styles.navCardSub}>{item.sub}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.5)" />
            </View>
          </Pressable>
        ))}

        {/* Station info */}
        <Text style={styles.sectionLabel}>О СТАНЦИИ</Text>
        <View style={styles.infoCard}>
          {[
            { icon: 'timer', label: 'Длительность', val: '10 минут' },
            { icon: 'play-circle-outline', label: 'Работа кандидата', val: '8 мин 30 сек' },
            { icon: 'bar-chart', label: 'Проходной балл', val: '≥70 / 100' },
            { icon: 'menu-book', label: 'Рекомендации', val: 'ERC 2025' },
          ].map((r, i) => (
            <View key={i} style={[styles.infoRow, i < 3 && { borderBottomWidth: 0.5, borderBottomColor: Colors.border }]}>
              <MaterialIcons name={r.icon as any} size={18} color="rgba(255,255,255,0.5)" />
              <Text style={styles.infoLabel}>{r.label}</Text>
              <Text style={styles.infoVal}>{r.val}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: 110 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: Spacing.xs, paddingVertical: Spacing.sm,
  },
  greeting: { color: Colors.textPrimary, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  subTitle: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2, display: 'none' },
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1,
  },
  roleText: { fontSize: FontSize.xs, fontWeight: '700' },

  heroCard: { borderRadius: Radius.lg, overflow: 'hidden', height: 210, marginBottom: Spacing.md },
  heroImage: { width: '100%', height: '100%', position: 'absolute' },
  heroOverlay: {
    flex: 1, padding: Spacing.md, justifyContent: 'flex-end',
    backgroundColor: 'rgba(10,15,30,0.55)',
  },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.accent, borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 10,
  },
  heroBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  heroTitle: { color: '#fff', fontSize: FontSize.xl, fontWeight: '800', lineHeight: 26 },
  heroSub: { color: 'rgba(255,255,255,0.65)', fontSize: FontSize.xs, marginTop: 4 },

  sectionLabel: {
    color: Colors.textMuted, fontSize: FontSize.xs,
    fontWeight: '700', letterSpacing: 1.2, marginBottom: Spacing.sm,
    marginTop: Spacing.xs, textTransform: 'uppercase',
  },

  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  statCard: {
    flex: 1, ...glassStyle, borderRadius: Radius.md,
    padding: Spacing.md, alignItems: 'center',
  },
  statVal: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },

  scenarioRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  scenarioCard: { flex: 1, borderRadius: Radius.lg, overflow: 'hidden', height: 160 },
  scenarioImg: { width: '100%', height: '100%', position: 'absolute' },
  scenarioOverlay: {
    flex: 1, padding: Spacing.md, justifyContent: 'flex-end',
  },
  scenarioNumBadge: {
    backgroundColor: '#4F8EF790', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 8,
  },
  scenarioNumText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  scenarioTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  scenarioSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },

  navCard: { borderRadius: Radius.md, overflow: 'hidden', height: 76, marginBottom: Spacing.sm },
  navCardImg: { width: '100%', height: '100%', position: 'absolute' },
  navCardOverlay: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    gap: Spacing.sm, paddingHorizontal: Spacing.md,
    backgroundColor: 'rgba(10,15,30,0.72)',
  },
  navCardIconBox: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  navCardText: { flex: 1 },
  navCardTitle: { color: '#fff', fontSize: FontSize.md, fontWeight: '600' },
  navCardSub: { color: 'rgba(255,255,255,0.55)', fontSize: FontSize.xs, marginTop: 2 },

  infoCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    overflow: 'hidden', borderWidth: 0.5, borderColor: Colors.border,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: 13,
  },
  infoLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, flex: 1 },
  infoVal: { color: Colors.textMuted, fontSize: FontSize.sm },
});
