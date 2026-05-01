import React, { createContext, useContext, ReactNode } from 'react';
import { Alert } from 'react-native';

interface AlertContextType {
  showAlert: (title: string, message?: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const showAlert = (title: string, message?: string) => {
    Alert.alert(title, message);
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return context;
}
