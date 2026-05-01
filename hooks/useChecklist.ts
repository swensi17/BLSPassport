import { useContext } from 'react';
import { ChecklistContext } from '@/contexts/ChecklistContext';

export function useChecklist() {
  const context = useContext(ChecklistContext);
  if (!context) throw new Error('useChecklist must be used within ChecklistProvider');
  return context;
}
