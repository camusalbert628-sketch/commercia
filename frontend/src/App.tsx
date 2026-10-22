import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { MobileNav } from './components/layout/MobileNav';
import { SaleModal } from './components/modals/SaleModal';
import { ExpenseModal } from './components/modals/ExpenseModal';

import { AuthPage } from './pages/AuthPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { SalesPage } from './pages/SalesPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { CustomersPage } from './pages/CustomersPage';
import { ProductsPage } from './pages/ProductsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { CopilotPage } from './pages/CopilotPage';
import { PlansPage } from './pages/PlansPage';
import { AdminPage } from './pages/AdminPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';

function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = () => setRefreshTrigger(prev => prev + 1);

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar
          onOpenSaleModal={() => setIsSaleModalOpen(true)}
          onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
        />
        <main key={refreshTrigger} style={{ flex: 1 }}>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>

      <MobileNav onOpenQuickSale={() => setIsSaleModalOpen(true)} />

      {/* Global Modals */}
      <SaleModal
        isOpen={isSaleModalOpen}
        onClose={() => setIsSaleModalOpen(false)}
        onSaleCreated={handleRefresh}
      />
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onExpenseCreated={handleRefresh}
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
          Initialisation de RS-BIZZ...
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

  return <AppLayout>{children}</AppLayout>;
}

export function App() {
  const { fetchMe, isAuthenticated } = useAuthStore();
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return (
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
              <DashboardPage
                onOpenSaleModal={() => setIsSaleModalOpen(true)}
                onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sales"
          element={
            <ProtectedRoute>
              <SalesPage onOpenSaleModal={() => setIsSaleModalOpen(true)} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/expenses"
          element={
            <ProtectedRoute>
              <ExpensesPage onOpenExpenseModal={() => setIsExpenseModalOpen(true)} />
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
  );
}

export default App;
