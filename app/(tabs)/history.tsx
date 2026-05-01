import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl, Share, TextInput, Modal, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Colors, Spacing, Radius, FontSize, glassStyle } from '@/constants/theme';
import {
  loadSessions, deleteSession, clearSessions,
  SessionRecord, formatSessionAsText,
} from '@/services/sessionStorage';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/contexts/AlertContext';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useFocusEffect } from '@react-navigation/native';

function SessionCard({ session, onDelete, onShare }: {
  session: SessionRecord; onDelete: () => void; onShare: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const verdictColor = session.passed ? Colors.success : Colors.danger;

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftWidth: 3, borderLeftColor: verdictColor }]}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setExpanded(e => !e); }}
      activeOpacity={0.88}
    >
      <View style={styles.cardTop}>
        <View style={styles.cardLeft}>
          <Text style={styles.candidateName} numberOfLines={1}>
            {session.candidateName || 'Кандидат'}
          </Text>
          <Text style={styles.cardMeta}>
            {session.scenario === 'adult' ? '001 · Взрослый' : '002 · Ребёнок'}  ·  {session.date}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.scoreNum, { color: verdictColor }]}>{session.totalScore}</Text>
          <View style={[styles.verdictMini, { backgroundColor: verdictColor + '18' }]}>
            <Text style={[styles.verdictMiniText, { color: verdictColor }]}>
              {session.passed ? 'СДАЛ' : 'НЕ СДАЛ'}
            </Text>
          </View>
        </View>
      </View>

      {session.hasCriticalError && (
        <View style={styles.critBadge}>
          <MaterialIcons name="warning" size={10} color={Colors.danger} />
          <Text style={styles.critBadgeText}>Критическая ошибка</Text>
        </View>
      )}

      <MaterialIcons
        name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
        size={16} color={Colors.textMuted}
        style={{ alignSelf: 'center', marginTop: 4 }}
      />

      {expanded && (
        <View style={styles.expandedArea}>
          {session.sectionScores.map((s, i) => {
            const pct = s.max > 0 ? s.earned / s.max : 0;
            const c = pct >= 0.7 ? Colors.success : pct >= 0.5 ? Colors.warning : Colors.danger;
            return (
              <View key={i} style={styles.sectionRow}>
                <Text style={styles.sectionTitle} numberOfLines={1}>{s.title}</Text>
                <View style={styles.sectionBarRow}>
                  <View style={styles.sectionBarBg}>
                    <View style={[styles.sectionBarFill, { width: `${Math.min(100, pct * 100)}%` as any, backgroundColor: c }]} />
                  </View>
                  <Text style={[styles.sectionScore, { color: c }]}>{s.earned}/{s.max}</Text>
                </View>
              </View>
            );
          })}
          {session.criticalErrors?.length > 0 && (
            <View style={styles.critBlock}>
              <Text style={styles.critBlockTitle}>Критические ошибки</Text>
              {session.criticalErrors.map((e, i) => (
                <Text key={i} style={styles.critBlockItem}>· {e}</Text>
              ))}
            </View>
          )}
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={onShare} activeOpacity={0.75}>
              <MaterialIcons name="ios-share" size={14} color={Colors.accent} />
              <Text style={styles.actionBtnText}>Поделиться</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={onDelete} activeOpacity={0.75}>
              <MaterialIcons name="delete-outline" size={14} color={Colors.danger} />
              <Text style={[styles.actionBtnText, { color: Colors.danger }]}>Удалить</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

function StatTile({ val, label, color }: { val: string | number; label: string; color?: string }) {
  return (
    <View style={statStyles.tile}>
      <Text style={[statStyles.val, color ? { color } : {}]}>{val}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  tile: { flex: 1, ...glassStyle, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  val: { color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: '800' },
  label: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2, textAlign: 'center' },
});

// ── Export Modal ──────────────────────────────────────────────────────────────
function ExportModal({ visible, onClose, sessions }: {
  visible: boolean; onClose: () => void; sessions: SessionRecord[];
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<'select' | 'format'>('select');

  useEffect(() => {
    if (visible) { setSelectedIds(new Set(sessions.map(s => s.id))); setMode('select'); }
  }, [visible, sessions]);

  const toggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selected = sessions.filter(s => selectedIds.has(s.id));

  const exportCSV = async () => {
    onClose();
    const header = 'Дата,Сценарий,Кандидат,Номер,Экзаменатор,Балл,Результат,Крит.ошибка\n';
    const rows = selected.map(s =>
      [s.date, s.scenario === 'adult' ? 'Взрослый' : 'Ребёнок', s.candidateName || '', s.candidateNumber || '', s.examinerName || '', s.totalScore, s.passed ? 'Сдал' : 'Не сдал', s.hasCriticalError ? 'Да' : 'Нет']
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const content = header + rows;

    if (Platform.OS === 'web') {
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `BLS_Export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } else {
      const path = (FileSystem.documentDirectory ?? '') + `BLS_Export_${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(path, content, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(path, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
    }
  };

  const exportText = async () => {
    onClose();
    const text = selected.map(s => formatSessionAsText(s)).join('\n\n');
    await Share.share({ message: text });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={exportStyles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={exportStyles.sheet}>
          <View style={exportStyles.handle} />
          <View style={exportStyles.titleRow}>
            <Text style={exportStyles.title}>Экспорт сессий</Text>
            <Text style={exportStyles.selCount}>{selectedIds.size} выбрано</Text>
          </View>
          {/* Toggle all */}
          <TouchableOpacity
            style={exportStyles.toggleAll}
            onPress={() => setSelectedIds(selectedIds.size === sessions.length ? new Set() : new Set(sessions.map(s => s.id)))}
            activeOpacity={0.8}
          >
            <MaterialIcons name={selectedIds.size === sessions.length ? 'check-box' : 'check-box-outline-blank'} size={18} color={Colors.accent} />
            <Text style={exportStyles.toggleAllText}>Выбрать все</Text>
          </TouchableOpacity>
          <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
            {sessions.map(s => (
              <TouchableOpacity key={s.id} style={exportStyles.item} onPress={() => toggle(s.id)} activeOpacity={0.8}>
                <MaterialIcons
                  name={selectedIds.has(s.id) ? 'check-box' : 'check-box-outline-blank'}
                  size={18} color={selectedIds.has(s.id) ? Colors.accent : Colors.textMuted}
                />
                <View style={{ flex: 1 }}>
                  <Text style={exportStyles.itemName}>{s.candidateName || 'Кандидат'}</Text>
                  <Text style={exportStyles.itemMeta}>{s.date} · {s.totalScore}/100</Text>
                </View>
                <View style={[exportStyles.dot, { backgroundColor: s.passed ? Colors.success : Colors.danger }]} />
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={exportStyles.actions}>
            <TouchableOpacity style={[exportStyles.actionBtn, { backgroundColor: Colors.success + '18', borderColor: Colors.success + '40' }]} onPress={exportCSV} activeOpacity={0.8} disabled={selectedIds.size === 0}>
              <MaterialIcons name="table-chart" size={18} color={Colors.success} />
              <Text style={[exportStyles.actionBtnText, { color: Colors.success }]}>CSV / Excel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[exportStyles.actionBtn, { backgroundColor: Colors.accentDim, borderColor: Colors.accent + '40' }]} onPress={exportText} activeOpacity={0.8} disabled={selectedIds.size === 0}>
              <MaterialIcons name="share" size={18} color={Colors.accent} />
              <Text style={[exportStyles.actionBtnText, { color: Colors.accent }]}>Текст</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const exportStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.surfaceElevated, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.textMuted, alignSelf: 'center', marginVertical: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  title: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700' },
  selCount: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: '700' },
  toggleAll: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.lg, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  toggleAllText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: Spacing.lg, paddingVertical: 12 },
  itemName: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '600' },
  itemMeta: { color: Colors.textMuted, fontSize: FontSize.xs },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  actions: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 0.5, borderTopColor: Colors.border },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: Radius.md, paddingVertical: 14, borderWidth: 1 },
  actionBtnText: { fontSize: FontSize.md, fontWeight: '700' },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [filter, setFilter] = useState<'all' | 'passed' | 'failed'>('all');

  const load = useCallback(async () => {
    const data = await loadSessions(currentUser?.username);
    setSessions(data);
  }, [currentUser?.username]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleDelete = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (Platform.OS === 'web') {
      if (window.confirm('Удалить запись?\nЭто действие необратимо.')) {
        deleteSession(id, currentUser?.username).then(load);
      }
    } else {
      Alert.alert('Удалить запись?', 'Это действие необратимо.', [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Удалить', style: 'destructive', onPress: async () => { await deleteSession(id, currentUser?.username); load(); } },
      ]);
    }
  };

  const handleShare = async (s: SessionRecord) => {
    await Share.share({ message: formatSessionAsText(s) });
  };

  const handleClearAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (Platform.OS === 'web') {
      if (window.confirm('Очистить историю?\nВсе ваши записи будут удалены.')) {
        clearSessions(currentUser?.username).then(load);
      }
    } else {
      Alert.alert('Очистить историю?', 'Все ваши записи будут удалены.', [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Очистить', style: 'destructive', onPress: async () => { await clearSessions(currentUser?.username); load(); } },
      ]);
    }
  };

  const total = sessions.length;
  const passed = sessions.filter(s => s.passed).length;
  const avgScore = total > 0 ? Math.round(sessions.reduce((a, s) => a + s.totalScore, 0) / total) : 0;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
  const adultCount = sessions.filter(s => s.scenario === 'adult').length;
  const childCount = sessions.filter(s => s.scenario === 'child').length;

  const filtered = sessions.filter(s => {
    const q = search.toLowerCase().trim();
    const matchSearch = !q || (s.candidateName?.toLowerCase().includes(q)) || (s.examinerName?.toLowerCase().includes(q)) || (s.date?.includes(q));
    const matchFilter = filter === 'all' || (filter === 'passed' ? s.passed : !s.passed);
    return matchSearch && matchFilter;
  });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <ExportModal visible={showExport} onClose={() => setShowExport(false)} sessions={sessions} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>История</Text>
        <View style={styles.headerActions}>
          {total > 0 && (
            <TouchableOpacity style={styles.headerBtn} onPress={() => setShowExport(true)} activeOpacity={0.75}>
              <MaterialIcons name="file-download" size={17} color={Colors.accent} />
            </TouchableOpacity>
          )}
          {total > 0 && (
            <TouchableOpacity style={styles.headerBtn} onPress={handleClearAll} activeOpacity={0.75}>
              <MaterialIcons name="delete-sweep" size={17} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, total === 0 && { flexGrow: 1, justifyContent: 'center' }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      >
        {total > 0 && (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statsRow}>
                <StatTile val={total} label="Сессий" color={Colors.accent} />
                <StatTile val={`${passRate}%`} label="Сдали" color={Colors.success} />
                <StatTile val={avgScore} label="Ср. балл" color={avgScore >= 70 ? Colors.success : Colors.danger} />
              </View>
              <View style={styles.statsRow}>
                <StatTile val={passed} label="Сдал" color={Colors.success} />
                <StatTile val={total - passed} label="Не сдал" color={Colors.danger} />
                <StatTile val={adultCount} label="Взрослый" />
                <StatTile val={childCount} label="Ребёнок" />
              </View>
            </View>
            <View style={styles.searchBox}>
              <MaterialIcons name="search" size={17} color={Colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Поиск по имени, дате…"
                placeholderTextColor={Colors.textMuted}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
                  <MaterialIcons name="close" size={15} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.filterRow}>
              {(['all', 'passed', 'failed'] as const).map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterPill, filter === f && styles.filterPillActive]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFilter(f); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                    {f === 'all' ? 'Все' : f === 'passed' ? 'Сдали' : 'Не сдали'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {total === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.empty}>
              <MaterialIcons name="history" size={72} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>История пуста</Text>
              <Text style={styles.emptyDesc}>Завершённые сессии появятся здесь</Text>
            </View>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.empty}>
              <MaterialIcons name="search-off" size={72} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Ничего не найдено</Text>
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>
              {filtered.length === total ? `ВСЕ СЕССИИ · ${total}` : `НАЙДЕНО · ${filtered.length}`}
            </Text>
            {filtered.map(s => (
              <SessionCard key={s.id} session={s} onDelete={() => handleDelete(s.id)} onShare={() => handleShare(s)} />
            ))}
          </>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  headerTitle: { color: Colors.textPrimary, fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { width: 34, height: 34, borderRadius: 12, backgroundColor: Colors.surfaceGlass, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.borderGlass },
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: 110 },
  statsGrid: { gap: Spacing.sm, marginBottom: Spacing.sm },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, ...glassStyle, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 11, marginBottom: Spacing.sm },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.md },
  filterRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  filterPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.borderGlass, backgroundColor: Colors.surfaceGlass },
  filterPillActive: { backgroundColor: Colors.accentDim, borderColor: Colors.accent + '60' },
  filterText: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '600' },
  filterTextActive: { color: Colors.accent },
  sectionLabel: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1.2, marginBottom: Spacing.sm, textTransform: 'uppercase' },

  // Session card - slim professional
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 0.5, borderColor: Colors.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  cardLeft: { flex: 1, marginRight: 10 },
  candidateName: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600', marginBottom: 3 },
  cardMeta: { color: Colors.textMuted, fontSize: FontSize.xs },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  scoreNum: { fontSize: FontSize.xl, fontWeight: '800' },
  verdictMini: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  verdictMiniText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  critBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  critBadgeText: { color: Colors.danger, fontSize: FontSize.xs, fontWeight: '600' },

  expandedArea: { marginTop: Spacing.sm, borderTopWidth: 0.5, borderTopColor: Colors.border, paddingTop: Spacing.sm },
  sectionRow: { marginBottom: 5 },
  sectionTitle: { color: Colors.textMuted, fontSize: FontSize.xs, marginBottom: 3 },
  sectionBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionBarBg: { flex: 1, height: 3, backgroundColor: Colors.surfaceHigh, borderRadius: 2, overflow: 'hidden' },
  sectionBarFill: { height: '100%', borderRadius: 2 },
  sectionScore: { fontSize: FontSize.xs, fontWeight: '700', minWidth: 30, textAlign: 'right' },

  critBlock: { backgroundColor: Colors.dangerDim, borderRadius: Radius.sm, padding: Spacing.sm, marginVertical: Spacing.xs, borderWidth: 1, borderColor: Colors.danger + '30' },
  critBlockTitle: { color: Colors.danger, fontSize: FontSize.xs, fontWeight: '700', marginBottom: 4 },
  critBlockItem: { color: Colors.textSecondary, fontSize: FontSize.xs, lineHeight: 16 },

  cardActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: Colors.accentDim, borderRadius: Radius.sm, paddingVertical: 9, borderWidth: 1, borderColor: Colors.accent + '40' },
  actionBtnDanger: { backgroundColor: Colors.dangerDim, borderColor: Colors.danger + '40' },
  actionBtnText: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: '600' },

  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', gap: Spacing.sm, marginTop: -60 },
  emptyTitle: { color: Colors.textPrimary, fontSize: 22, fontWeight: '700', marginTop: 12 },
  emptyDesc: { color: Colors.textMuted, fontSize: 16, textAlign: 'center', maxWidth: 260 },
});
