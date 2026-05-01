import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Pressable, Modal, FlatList, Alert, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Colors, Spacing, Radius, FontSize, glassStyle } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useAlert } from '@/contexts/AlertContext';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { loadExaminers, saveExaminers } from '@/constants/examiners';
import { useFocusEffect } from '@react-navigation/native';

// ── Examiner Management Modal (Admin only) ────────────────────────────────────
function ExaminerManager({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [list, setList] = useState<string[]>([]);
  const [newName, setNewName] = useState('');

  useFocusEffect(useCallback(() => {
    if (visible) loadExaminers().then(setList);
  }, [visible]));

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed || list.includes(trimmed)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = [...list, trimmed];
    setList(updated);
    await saveExaminers(updated);
    setNewName('');
  };

  const handleDelete = async (name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = list.filter(e => e !== name);
    setList(updated);
    await saveExaminers(updated);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={mgStyles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={mgStyles.sheet}>
          <View style={mgStyles.handle} />
          <View style={mgStyles.titleRow}>
            <Text style={mgStyles.title}>Список экзаменаторов</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <MaterialIcons name="close" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
          {/* Add new */}
          <View style={mgStyles.addRow}>
            <TextInput
              style={mgStyles.addInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Фамилия И.О."
              placeholderTextColor={Colors.textMuted}
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
            <TouchableOpacity
              style={[mgStyles.addBtn, !newName.trim() && { opacity: 0.4 }]}
              onPress={handleAdd} disabled={!newName.trim()} activeOpacity={0.8}
            >
              <MaterialIcons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={list}
            keyExtractor={i => i}
            style={{ maxHeight: 360 }}
            renderItem={({ item }) => (
              <View style={mgStyles.item}>
                <MaterialIcons name="person" size={16} color={Colors.textMuted} />
                <Text style={mgStyles.itemText}>{item}</Text>
                <TouchableOpacity onPress={() => handleDelete(item)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialIcons name="delete-outline" size={18} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            )}
            ItemSeparatorComponent={() => <View style={mgStyles.sep} />}
          />
        </View>
      </View>
    </Modal>
  );
}

const mgStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.surfaceElevated, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.textMuted, alignSelf: 'center', marginVertical: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  title: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700' },
  addRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  addInput: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 11, color: Colors.textPrimary, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.borderGlass },
  addBtn: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: Spacing.lg, paddingVertical: 14 },
  itemText: { flex: 1, color: Colors.textSecondary, fontSize: FontSize.md },
  sep: { height: 0.5, backgroundColor: Colors.border, marginHorizontal: Spacing.lg },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profileName, userRole, currentUser, updateProfile, updateAvatar, logout } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();

  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(profileName);
  const [showExaminerMgr, setShowExaminerMgr] = useState(false);

  const roleColor = userRole === 'admin' ? Colors.warning : Colors.accent;

  const handlePickPhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Нет доступа', 'Разрешите доступ к галерее в настройках.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      updateAvatar(result.assets[0].uri);
    }
  };

  const handleSaveName = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateProfile(name.trim() || profileName);
    setEditingName(false);
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (Platform.OS === 'web') {
      if (window.confirm('Выйти из системы?\nВы будете перенаправлены на экран входа.')) {
        logout();
        router.replace('/onboarding');
      }
    } else {
      Alert.alert('Выйти из системы?', 'Вы будете перенаправлены на экран входа.', [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти', style: 'destructive', onPress: () => {
            logout();
            router.replace('/onboarding');
          },
        },
      ]);
    }
  };

  const avatarUri = currentUser?.avatarUri;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <ExaminerManager visible={showExaminerMgr} onClose={() => setShowExaminerMgr(false)} />

      {/* iOS Styled Header */}
      <View style={styles.iosHeader}>
        <Text style={styles.iosTitle}>Профиль</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Centered Avatar Area */}
        <View style={styles.avatarCenterWrap}>
          <TouchableOpacity style={styles.largeAvatarContainer} onPress={handlePickPhoto} activeOpacity={0.85}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.largeAvatarImg} contentFit="cover" />
            ) : (
              <View style={styles.largeAvatarPlaceholder}>
                <MaterialIcons name={userRole === 'admin' ? 'shield' : 'person'} size={48} color={roleColor} />
              </View>
            )}
            <View style={styles.cameraBadge}>
              <MaterialIcons name="photo-camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.profileNameLarge}>{profileName || 'Пользователь'}</Text>
          {currentUser?.username && (
            <Text style={styles.profileUsername}>@{currentUser.username}</Text>
          )}
        </View>

        {/* Section title */}
        <Text style={styles.sectionTitle}>Ваши данные</Text>

        <View style={styles.glassCard}>
          {editingName ? (
            <View style={styles.nameEditWrap}>
              <TextInput
                style={styles.nameInput}
                value={name}
                onChangeText={setName}
                placeholder="Фамилия Имя Отчество"
                placeholderTextColor={Colors.textMuted}
                autoFocus
              />
              <View style={styles.nameEditBtns}>
                <Pressable style={styles.cancelBtn} onPress={() => { setEditingName(false); setName(profileName); }}>
                  <Text style={styles.cancelBtnText}>Отмена</Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={handleSaveName}>
                  <Text style={styles.saveBtnText}>Сохранить</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.infoRow} onPress={() => setEditingName(true)} activeOpacity={0.75}>
              <Text style={styles.infoLabel}>Имя</Text>
              <View style={{flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end'}}>
                 <Text style={styles.infoVal} numberOfLines={1}>{profileName || 'Добавить имя'}</Text>
                 <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} style={{marginLeft: 4}} />
              </View>
            </TouchableOpacity>
          )}

          {currentUser?.username && (
             <View style={[styles.infoRow, {borderTopWidth: 0.5, borderTopColor: Colors.border}]}>
               <Text style={styles.infoLabel}>Логин</Text>
               <Text style={[styles.infoVal, {color: Colors.textMuted}]}>@{currentUser.username}</Text>
             </View>
          )}
        </View>

        {/* Admin tools */}
        {userRole === 'admin' && (
          <>
            <Text style={styles.sectionTitle}>АДМИНИСТРИРОВАНИЕ</Text>
            <View style={styles.glassCard}>
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowExaminerMgr(true); }}
                activeOpacity={0.75}
              >
                <View style={[styles.menuIconBox, { backgroundColor: Colors.warning + '18' }]}>
                  <MaterialIcons name="group" size={17} color={Colors.warning} />
                </View>
                <Text style={styles.menuText}>Список экзаменаторов</Text>
                <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Station info */}
        <Text style={styles.sectionTitle}>О СТАНЦИИ</Text>
        <View style={styles.glassCard}>
          {[
            { label: 'Название', val: 'Базовая СЛР' },
            { label: 'Рекомендации', val: 'ERC Guidelines 2025' },
            { label: 'Версия', val: 'v3.2' },
          ].map((r, i, arr) => (
            <View key={i} style={[styles.infoRow, i < arr.length - 1 && { borderTopWidth: 0.5, borderTopColor: Colors.border }]} pointerEvents="none">
              <Text style={styles.infoLabel}>{r.label}</Text>
              <Text style={styles.infoVal}>{r.val}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Выйти из системы</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' }, // Pure black like App Store
  iosHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  iosTitle: { color: Colors.textPrimary, fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },

  avatarCenterWrap: { alignItems: 'center', marginBottom: Spacing.xl, marginTop: Spacing.sm },
  largeAvatarContainer: { width: 100, height: 100, borderRadius: 50, marginBottom: 12, position: 'relative' },
  largeAvatarImg: { width: '100%', height: '100%', borderRadius: 50 },
  largeAvatarPlaceholder: { width: '100%', height: '100%', borderRadius: 50, backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2C2C2E' },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#000000' },
  profileNameLarge: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 2 },
  profileUsername: { color: 'rgba(255,255,255,0.5)', fontSize: 15 },

  scroll: { paddingHorizontal: Spacing.md, paddingTop: 0, paddingBottom: 110 },

  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: -0.3, marginBottom: Spacing.sm, marginTop: Spacing.lg, paddingHorizontal: Spacing.xs },

  glassCard: { backgroundColor: '#1C1C1E', borderRadius: Radius.lg, overflow: 'hidden', marginBottom: Spacing.md },

  nameEditWrap: { padding: Spacing.md, gap: Spacing.sm },
  nameInput: { backgroundColor: '#2C2C2E', borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 12, color: Colors.textPrimary, fontSize: FontSize.md },
  nameEditBtns: { flexDirection: 'row', gap: Spacing.sm },
  cancelBtn: { flex: 1, backgroundColor: '#2C2C2E', borderRadius: Radius.sm, paddingVertical: 11, alignItems: 'center' },
  cancelBtnText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: Colors.accent, borderRadius: Radius.sm, paddingVertical: 11, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 14 },
  infoLabel: { color: Colors.textPrimary, fontSize: FontSize.md },
  infoVal: { color: Colors.textMuted, fontSize: FontSize.md, fontWeight: '400', textAlign: 'right', flexShrink: 1 },

  menuRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: 14 },
  menuIconBox: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  menuText: { flex: 1, color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '400' },

  logoutBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#1C1C1E', borderRadius: Radius.lg, paddingVertical: 16, marginTop: Spacing.lg },
  logoutText: { color: Colors.danger, fontSize: FontSize.md, fontWeight: '500' },
});
