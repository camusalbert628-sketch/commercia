import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { MobileNav } from './components/layout/MobileNav';
import { SaleModal } from './components/modals/SaleModal';
import { ExpenseModal } from './components/modals/ExpenseModal';
import { QuickActionSheet } from './components/modals/QuickActionSheet';
import { ModalProvider, useModals } from './context/ModalContext';

import { AuthPage } from './pages/AuthPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { SalesPage } from './pages/SalesPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { CashPage } from './pages/CashPage';
import { CustomersPage } from './pages/CustomersPage';
import { ProductsPage } from './pages/ProductsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { CopilotPage } from './pages/CopilotPage';
import { PlansPage } from './pages/PlansPage';
import { AdminPage } from './pages/AdminPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const {
    isSaleModalOpen,
    closeSaleModal,
    openSaleModal,
    isExpenseModalOpen,
    closeExpenseModal,
    openExpenseModal,
    triggerRefresh,
    refreshKey,
  } = useModals();

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar
          onOpenSaleModal={openSaleModal}
          onOpenExpenseModal={openExpenseModal}
        />
        <main key={refreshKey} style={{ flex: 1 }}>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>

      <MobileNav />

      {/* Global Modals & Quick Action Sheet */}
      <QuickActionSheet />
      <SaleModal
        isOpen={isSaleModalOpen}
        onClose={closeSaleModal}
        onSaleCreated={triggerRefresh}
      />
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={closeExpenseModal}
        onExpenseCreated={triggerRefresh}
      />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F8FAFC' }}>
        <div style={{ color: '#059669', fontWeight: 700, fontSize: '1.1rem' }}>
          Initialisation de COMMERCIA...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If user has no businesses yet and is not already on onboarding
  if (user && (!user.businesses || user.businesses.length === 0)) {
    return <Navigate to="/onboarding" replace />;
  }

  return <AppLayoutContent>{children}</AppLayoutContent>;
}

export function App() {
  const { fetchMe, isAuthenticated } = useAuthStore();

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return (
    <ModalProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <AuthPage />}
          />
          <Route
            path="/onboarding"
            element={!isAuthenticated ? <Navigate to="/login" replace /> : <OnboardingPage />}
          />

          {/* Protected Application Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales"
            element={
              <ProtectedRoute>
                <SalesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute>
                <ExpensesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/cash"
            element={
              <ProtectedRoute>
                <CashPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <CustomersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <ProductsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/copilot"
            element={
              <ProtectedRoute>
                <CopilotPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/plans"
            element={
              <ProtectedRoute>
                <PlansPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ModalProvider>
  );
}

export default App;
