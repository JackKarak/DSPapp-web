/**
 * Modal Management Hook
 * Centralized state management for all modal interactions
 * Eliminates 8+ separate useState calls for modals
 */

import { useState, useCallback } from 'react';

export interface ModalState {
  testBank: boolean;
  accountDetails: boolean;
  pointAppeal: boolean;
  accountDeletion: boolean;
  eventFeedback: boolean;
}

export const useModalManager = () => {
  const [modals, setModals] = useState<ModalState>({
    testBank: false,
    accountDetails: false,
    pointAppeal: false,
    accountDeletion: false,
    eventFeedback: false,
  });

  const openModal = useCallback((modalName: keyof ModalState) => {
    setModals(prev => ({ ...prev, [modalName]: true }));
  }, []);

  const closeModal = useCallback((modalName: keyof ModalState) => {
    setModals(prev => ({ ...prev, [modalName]: false }));
  }, []);

  const closeAllModals = useCallback(() => {
    setModals({
      testBank: false,
      accountDetails: false,
      pointAppeal: false,
      accountDeletion: false,
      eventFeedback: false,
    });
  }, []);

  return {
    modals,
    openModal,
    closeModal,
    closeAllModals,
  };
};
