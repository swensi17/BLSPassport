import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, Animated, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const BG_IMAGE = 'https://i.ibb.co/whDjHtbd/7bb4cbf680b45e28e844f8209b40a705-1.jpg';

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);

  const fullText = 'Добро пожаловать';
  const [displayedText, setDisplayedText] = useState('');
  const [isDone, setIsDone] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index <= fullText.length) {
        setDisplayedText(fullText.substring(0, index));
        index++;
      } else {
        setIsDone(true);
        clearInterval(timer);
      }
    }, 80);
    return () => clearInterval(timer);
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 7, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -7, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = () => {
    if (!username.trim()) {
      setError('Введите ваше имя');
      shake();
      return;
    }
    const ok = login(username.trim(), code);
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('Неверное кодовое слово');
      shake();
      setTimeout(() => setError(null), 3000);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      
      {/* Full Screen Background Image */}
      <Image source={{ uri: BG_IMAGE }} style={styles.bgImage} contentFit="cover" />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={styles.flex} />

        {/* Bottom Content Area */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)', '#000000', '#000000']}
          locations={[0, 0.15, 0.4, 1]}
          style={[styles.bottomContainer, { paddingBottom: insets.bottom + 30 }]}
        >
          <View style={styles.titleContainer}>
            <Text style={styles.title}>
              <Text style={styles.whiteText}>{displayedText}</Text>
            </Text>
          </View>
          <Text style={styles.subtitle}>Платформа оценки навыков BLS</Text>

          <Animated.View style={[styles.formWrap, { transform: [{ translateX: shakeAnim }] }]}>
            {/* Username Input */}
            <View style={[styles.inputBox, error === 'Введите ваше имя' && { borderColor: '#FF4B4B', borderWidth: 1 }]}>
              <MaterialIcons name="person" size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={v => { setUsername(v); setError(null); }}
                placeholder="Ваше ФИО"
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoCapitalize="words"
                returnKeyType="next"
              />
              {username.length > 0 && (
                <TouchableOpacity onPress={() => setUsername('')} activeOpacity={0.7} style={{ padding: 4 }}>
                  <MaterialIcons name="cancel" size={18} color="rgba(255,255,255,0.3)" />
                </TouchableOpacity>
              )}
            </View>

            {/* Code Input */}
            <View style={[styles.inputBox, error === 'Неверное кодовое слово' && { borderColor: '#FF4B4B', borderWidth: 1 }]}>
              <MaterialIcons name="lock" size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { letterSpacing: showCode ? 0 : 4 }]}
                value={code}
                onChangeText={v => { setCode(v); setError(null); }}
                placeholder="Кодовое слово"
                placeholderTextColor="rgba(255,255,255,0.3)"
                secureTextEntry={!showCode}
                autoCapitalize="none"
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowCode(p => !p)} activeOpacity={0.7} style={{ padding: 4 }}>
                <MaterialIcons name={showCode ? 'visibility' : 'visibility-off'} size={18} color="rgba(255,255,255,0.3)" />
              </TouchableOpacity>
            </View>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error" size={14} color="#FF4B4B" />
                <Text style={styles.errorTextLabel}>{error}</Text>
              </View>
            ) : <View style={{ height: 20 }} />}
          </Animated.View>

          {/* White Continue Button */}
          <TouchableOpacity
            style={[styles.primaryBtn, (!username.trim() || !code.trim()) && { opacity: 0.5 }]}
            onPress={handleLogin}
            disabled={!username.trim() || !code.trim()}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Продолжить</Text>
          </TouchableOpacity>

        </LinearGradient>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  flex: { flex: 1 },
  bgImage: { position: 'absolute', width: '100%', height: '100%' },

  bottomContainer: {
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 100, // Reduced top padding for better reachability
    alignItems: 'center',
  },

  titleContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
  },
  whiteText: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
  },
  accentText: {
    color: '#FF8C42', // Warm Sunset Orange
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,

  },

  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
  },

  formWrap: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 28, // Matched with button radius
    paddingHorizontal: 20,
    height: 56,
  },
  inputIcon: { marginRight: 12 },
  input: { 
    flex: 1, 
    color: '#ffffff', 
    fontSize: 16, 
    fontWeight: '500',
    outlineStyle: 'none' // For web to prevent default focus border
  } as any,

  errorContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4, height: 20 },
  errorTextLabel: { color: '#FF4B4B', fontSize: 13, fontWeight: '500' },

  primaryBtn: {
    width: '100%',
    height: 56,
    backgroundColor: '#ffffff',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  primaryBtnText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '700',
  },
});
