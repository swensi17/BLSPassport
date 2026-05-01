# OnSpace App - BLS Passport

Локальное приложение для экзаменационной станции "Базовая СЛР у взрослых и детей" (ERC Guidelines 2025).

## Быстрый старт

### Вариант 1: Python скрипт (рекомендуется)
```bash
python run.py
```

### Вариант 2: Вручную

**Web версия:**
```bash
npm run web
```

**Android:**
```bash
npm run android
```

**iOS (только macOS):**
```bash
npm run ios
```

**Expo Dev Client:**
```bash
npm start
```

## Особенности

- Полностью локальное хранилище (AsyncStorage)
- Без внешних сервисов и API
- Работает офлайн
- Поддержка Web, Android, iOS
- Два режима: Администратор и Пользователь

## Коды доступа

- Администратор: `admin`
- Пользователь: `service`

## Технологии

- React Native + Expo
- TypeScript
- AsyncStorage для локального хранения
- Expo Router для навигации
