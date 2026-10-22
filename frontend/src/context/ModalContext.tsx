import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ModalContextType {
  isSaleModalOpen: boolean;
  openSaleModal: () => void;
  closeSaleModal: () => void;
  isExpenseModalOpen: boolean;
  openExpenseModal: () => void;
  closeExpenseModal: () => void;
  isQuickActionOpen: boolean;
  openQuickAction: () => void;
  closeQuickAction: () => void;
  refreshKey: number;
  triggerRefresh: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const openSaleModal = () => {
    setIsQuickActionOpen(false);
    setIsSaleModalOpen(true);
  };
  const closeSaleModal = () => setIsSaleModalOpen(false);

  const openExpenseModal = () => {
    setIsQuickActionOpen(false);
    setIsExpenseModalOpen(true);
  };
  const closeExpenseModal = () => setIsExpenseModalOpen(false);

  const openQuickAction = () => setIsQuickActionOpen(true);
  const closeQuickAction = () => setIsQuickActionOpen(false);

  const triggerRefresh = () => setRefreshKey(prev => prev + 1);

  return (
    <ModalContext.Provider
      value={{
        isSaleModalOpen,
        openSaleModal,
        closeSaleModal,
        isExpenseModalOpen,
        openExpenseModal,
        closeExpenseModal,
        isQuickActionOpen,
        openQuickAction,
        closeQuickAction,
        refreshKey,
        triggerRefresh,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};

export const useModals = (): ModalContextType => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModals must be used within a ModalProvider');
  }
  return context;
};
