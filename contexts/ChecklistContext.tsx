import React, { createContext, useState, ReactNode, useCallback } from 'react';
import { ScoreOption, CHECKLIST_ADULT, CHECKLIST_CHILD } from '@/constants/data';

type ScoresMap = Record<string, ScoreOption>;
type CriticalErrorsMap = Record<string, boolean>;

interface SessionMeta {
  examName: string;
  scenarioNumber: string;
  date: string;
  candidateNumber: string;
  candidateName: string;
  examinerName: string;
  startTime: string;
  endTime: string;
  manikinType: string;
  aedAvailable: boolean;
  feedbackManikin: boolean;
}

interface ChecklistContextType {
  activeScenario: 'adult' | 'child';
  setActiveScenario: (s: 'adult' | 'child') => void;

  adultScores: ScoresMap;
  childScores: ScoresMap;
  setScore: (itemId: string, value: ScoreOption) => void;

  adultCriticalErrors: CriticalErrorsMap;
  childCriticalErrors: CriticalErrorsMap;
  setCriticalError: (errorId: string, value: boolean) => void;

  sessionMeta: SessionMeta;
  updateSessionMeta: (fields: Partial<SessionMeta>) => void;

  getScore: (itemId: string) => ScoreOption;
  getTotalScore: () => number;
  getMaxScore: () => number;
  getCriticalErrors: () => CriticalErrorsMap;
  hasCriticalError: () => boolean;

  resetChecklist: () => void;
}

export const ChecklistContext = createContext<ChecklistContextType | undefined>(undefined);

const defaultMeta: SessionMeta = {
  examName: '',
  scenarioNumber: '001',
  date: '',
  candidateNumber: '',
  candidateName: '',
  examinerName: '',
  startTime: '',
  endTime: '',
  manikinType: 'Взрослый',
  aedAvailable: true,
  feedbackManikin: true,
};

export function ChecklistProvider({ children }: { children: ReactNode }) {
  const [activeScenario, setActiveScenario] = useState<'adult' | 'child'>('adult');
  const [adultScores, setAdultScores] = useState<ScoresMap>({});
  const [childScores, setChildScores] = useState<ScoresMap>({});
  const [adultCriticalErrors, setAdultCriticalErrors] = useState<CriticalErrorsMap>({});
  const [childCriticalErrors, setChildCriticalErrors] = useState<CriticalErrorsMap>({});
  const [sessionMeta, setSessionMeta] = useState<SessionMeta>(defaultMeta);

  const setScore = useCallback((itemId: string, value: ScoreOption) => {
    if (activeScenario === 'adult') {
      setAdultScores(prev => ({ ...prev, [itemId]: value }));
    } else {
      setChildScores(prev => ({ ...prev, [itemId]: value }));
    }
  }, [activeScenario]);

  const setCriticalError = useCallback((errorId: string, value: boolean) => {
    if (activeScenario === 'adult') {
      setAdultCriticalErrors(prev => ({ ...prev, [errorId]: value }));
    } else {
      setChildCriticalErrors(prev => ({ ...prev, [errorId]: value }));
    }
  }, [activeScenario]);

  const updateSessionMeta = useCallback((fields: Partial<SessionMeta>) => {
    setSessionMeta(prev => ({ ...prev, ...fields }));
  }, []);

  const getScore = useCallback((itemId: string): ScoreOption => {
    const scores = activeScenario === 'adult' ? adultScores : childScores;
    return scores[itemId] ?? null;
  }, [activeScenario, adultScores, childScores]);

  const getTotalScore = useCallback((): number => {
    const checklist = activeScenario === 'adult' ? CHECKLIST_ADULT : CHECKLIST_CHILD;
    const scores = activeScenario === 'adult' ? adultScores : childScores;
    let total = 0;
    for (const section of checklist) {
      for (const item of section.items) {
        const s = scores[item.id];
        if (s === 'yes') total += item.maxScore;
        else if (s === 'partial') total += Math.round(item.maxScore * 0.5);
      }
    }
    return total;
  }, [activeScenario, adultScores, childScores]);

  const getMaxScore = useCallback(() => 100, []);

  const getCriticalErrors = useCallback((): CriticalErrorsMap => {
    return activeScenario === 'adult' ? adultCriticalErrors : childCriticalErrors;
  }, [activeScenario, adultCriticalErrors, childCriticalErrors]);

  const hasCriticalError = useCallback((): boolean => {
    const errors = activeScenario === 'adult' ? adultCriticalErrors : childCriticalErrors;
    return Object.values(errors).some(v => v === true);
  }, [activeScenario, adultCriticalErrors, childCriticalErrors]);

  const resetChecklist = useCallback(() => {
    if (activeScenario === 'adult') {
      setAdultScores({});
      setAdultCriticalErrors({});
    } else {
      setChildScores({});
      setChildCriticalErrors({});
    }
  }, [activeScenario]);

  return (
    <ChecklistContext.Provider value={{
      activeScenario, setActiveScenario,
      adultScores, childScores, setScore,
      adultCriticalErrors, childCriticalErrors, setCriticalError,
      sessionMeta, updateSessionMeta,
      getScore, getTotalScore, getMaxScore, getCriticalErrors, hasCriticalError,
      resetChecklist,
    }}>
      {children}
    </ChecklistContext.Provider>
  );
}
