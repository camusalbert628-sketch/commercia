import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { MobileNav } from './components/layout/MobileNav';
import { SaleModal } from './components/modals/SaleModal';
import { ExpenseModal } from './components/modals/ExpenseModal';
import { QuickActionSheet } from './components/modals/QuickActionSheet';
import { ModalProvider, useModals } from './context/ModalContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { CommerciaChatbot } from './components/chatbot/CommerciaChatbot';
import { OfflineSyncBanner } from './components/common/OfflineSyncBanner';
import { ProRouteGuard } from './components/common/ProRouteGuard';

// Lazy-loaded pages for mobile performance and fast initial load
const AuthPage = lazy(() => import('./pages/AuthPage').then(m => ({ default: m.AuthPage })));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const SalesPage = lazy(() => import('./pages/SalesPage').then(m => ({ default: m.SalesPage })));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage').then(m => ({ default: m.ExpensesPage })));
const CashPage = lazy(() => import('./pages/CashPage').then(m => ({ default: m.CashPage })));
const CustomersPage = lazy(() => import('./pages/CustomersPage').then(m => ({ default: m.CustomersPage })));
const ProductsPage = lazy(() => import('./pages/ProductsPage').then(m => ({ default: m.ProductsPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const CopilotPage = lazy(() => import('./pages/CopilotPage').then(m => ({ default: m.CopilotPage })));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage').then(m => ({ default: m.SubscriptionPage })));
const GrowthPage = lazy(() => import('./pages/GrowthPage').then(m => ({ default: m.GrowthPage })));
const TreasuryPage = lazy(() => import('./pages/TreasuryPage').then(m => ({ default: m.TreasuryPage })));
const DeliveriesPage = lazy(() => import('./pages/DeliveriesPage').then(m => ({ default: m.DeliveriesPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })));

function PageLoadingFallback() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px' }}>
      <div
        style={{
          width: '36px',
          height: '36px',
          border: '3px solid #E2E8F0',
          borderTopColor: '#0062FF',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <div style={{ color: '#64748B', fontSize: '0.88rem', fontWeight: 600 }}>
        Chargement de COMMERCIA...
      </div>
    </div>
  );
}

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
      <OfflineSyncBanner />
      <Sidebar />
      <div className="main-content">
        <Navbar
          onOpenSaleModal={openSaleModal}
          onOpenExpenseModal={openExpenseModal}
        />
        <main key={refreshKey} style={{ flex: 1 }}>
          <ErrorBoundary>
            <Suspense fallback={<PageLoadingFallback />}>
              {children}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      <MobileNav onOpenQuickSale={openSaleModal} />

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

      {/* Global Omniscient AI Chatbot */}
      <CommerciaChatbot />
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
        <Suspense fallback={<PageLoadingFallback />}>
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
                <ProRouteGuard featureName="Clients & Carnet de Crédits">
                  <CustomersPage />
                </ProRouteGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <ProRouteGuard featureName="Stock & Alertes Ruptures">
                  <ProductsPage />
                </ProRouteGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/deliveries"
            element={
              <ProtectedRoute>
                <ProRouteGuard featureName="Livraisons & Expéditions E-commerce">
                  <DeliveriesPage />
                </ProRouteGuard>
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
                <ProRouteGuard featureName="Copilote IA COMMERCIA">
                  <CopilotPage />
                </ProRouteGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/growth"
            element={
              <ProtectedRoute>
                <ProRouteGuard featureName="Croissance & Acquisition">
                  <GrowthPage />
                </ProRouteGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/treasury"
            element={
              <ProtectedRoute>
                <ProRouteGuard featureName="Trésorerie & Scénarios">
                  <TreasuryPage />
                </ProRouteGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/subscription"
            element={
              <ProtectedRoute>
                <SubscriptionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/plans"
            element={
              <ProtectedRoute>
                <SubscriptionPage />
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
      </Suspense>
    </BrowserRouter>
  </ModalProvider>
  );
}

export default App;
