import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Platform, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Colors } from '@/constants/theme';

function TabBarIcon({ name, focused, color }: { name: any; focused: boolean; color: string }) {
  return (
    <View style={[tabStyles.iconWrap]}>
      <MaterialIcons name={name} size={24} color={color} />
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
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
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0,
          shadowRadius: 0,
        },
        tabBarBackground: () => (
          <View style={{ flex: 1, overflow: 'hidden', borderRadius: 34, backgroundColor: 'transparent' }}>
            <BlurView 
              intensity={Platform.OS === 'ios' ? 80 : 100} 
              tint="dark" 
              style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,15,15,0.7)' }]} 
            />
          </View>
        ),
        tabBarItemStyle: {
          paddingVertical: 8,
        },
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.1,
          marginTop: 2,
        },
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        sceneContainerStyle: { backgroundColor: '#000' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Главная',
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name="home" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="checklist"
        options={{
          title: 'Экзамен',
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name="fact-check" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="study"
        options={{
          title: 'Обучение',
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name="school" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'История',
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name="history" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профиль',
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name="person" focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const tabStyles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center', 
    justifyContent: 'center',
  },
});
