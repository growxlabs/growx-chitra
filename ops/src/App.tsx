import React, { useEffect, useState, useCallback } from 'react';
import { api } from './api';
import type { OperatorUser } from './types';
import { Navigation, type NavSection } from './components/Navigation';


// Pages
import { OverviewPage } from './pages/OverviewPage';
import { BusinessesPage } from './pages/BusinessesPage';
import { BusinessDetailPage } from './pages/BusinessDetailPage';
import { JobsPage } from './pages/JobsPage';
import { JobDetailPage } from './pages/JobDetailPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { PaymentDetailPage } from './pages/PaymentDetailPage';
import { CreditsPage } from './pages/CreditsPage';
import { SafetyPage } from './pages/SafetyPage';
import { DeletionsPage } from './pages/DeletionsPage';
import { SupportPage } from './pages/SupportPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<OperatorUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<NavSection>('overview');

  // Detail view drilldowns
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [creditsInitialBusinessId, setCreditsInitialBusinessId] = useState<string>('');

  const [pendingAlertsCount, setPendingAlertsCount] = useState<number>(0);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Authenticate operator identity
  useEffect(() => {
    let isMounted = true;
    setCurrentUser(null);
    setAuthError(null);
    api
      .getMe()
      .then((user) => {
        if (isMounted) {
          setCurrentUser(user);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Authentication failed';
          setAuthError(msg);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  // Fetch alert count for navigation badge
  const updateAlertsCount = useCallback(() => {
    setRefreshing(true);
    return api.getOverview('today').then((res) => {
      setPendingAlertsCount(res.alerts.uncredited_payments.length + res.alerts.pending_deletions.length + res.alerts.recent_failures.length);
    }).catch(() => {
      setPendingAlertsCount(0);
    }).finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    updateAlertsCount();
  }, [updateAlertsCount, refreshKey]);

  // Navigation callbacks
  const handleNavSelect = (section: NavSection) => {
    setActiveSection(section);
    setSelectedBusinessId(null);
    setSelectedJobId(null);
    setSelectedPaymentId(null);
    if (section !== 'credits') {
      setCreditsInitialBusinessId('');
    }
  };

  const navigateToBusiness = (id: string) => {
    setSelectedBusinessId(id);
    setSelectedJobId(null);
    setSelectedPaymentId(null);
  };

  const navigateToJob = (id: string) => {
    setSelectedJobId(id);
    setSelectedBusinessId(null);
    setSelectedPaymentId(null);
  };

  const navigateToPayment = (id: string) => {
    setSelectedPaymentId(id);
    setSelectedBusinessId(null);
    setSelectedJobId(null);
  };

  const navigateToCredits = (businessId: string) => {
    setCreditsInitialBusinessId(businessId);
    setActiveSection('credits');
    setSelectedBusinessId(null);
    setSelectedJobId(null);
    setSelectedPaymentId(null);
  };

  const handleGlobalRefresh = () => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#F4EFE6] font-sans text-[#1D1D1A]">
      {/* Sidebar Navigation */}
      <Navigation
        currentSection={activeSection}
        onSelect={handleNavSelect}
        pendingAlertsCount={pendingAlertsCount}
        operator={currentUser}
        onRefresh={handleGlobalRefresh}
        isLoading={refreshing}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Restrained Access Alert */}
        {authError && (
          <div className="bg-[#FBF8F2] border-b border-[#D8D0C4] border-l-3 border-l-[#9E4A43] px-6 py-2 text-xs font-mono text-[#9E4A43] shrink-0">
            Access required — {authError}. Authenticate through Cloudflare Access on ops.chitra.growxlabs.tech.
          </div>
        )}

        {/* Scrollable Page Body */}
        <main className="workspace-main flex-1 overflow-y-auto bg-[#F4EFE6]">
          <div className="workspace-content mx-auto pb-4" key={refreshKey}>
            {selectedBusinessId ? (
              <BusinessDetailPage
                businessId={selectedBusinessId}
                currentUser={currentUser}
                onBack={() => setSelectedBusinessId(null)}
                onNavigateToJob={navigateToJob}
              />
            ) : selectedJobId ? (
              <JobDetailPage
                jobId={selectedJobId}
                currentUser={currentUser}
                onBack={() => setSelectedJobId(null)}
                onNavigateToBusiness={navigateToBusiness}
              />
            ) : selectedPaymentId ? (
              <PaymentDetailPage
                paymentId={selectedPaymentId}
                currentUser={currentUser}
                onBack={() => setSelectedPaymentId(null)}
                onNavigateToBusiness={navigateToBusiness}
                onNavigateToCredits={navigateToCredits}
              />
            ) : (
              <>
                {activeSection === 'overview' && (
                  <OverviewPage
                    onNavigateToBusiness={navigateToBusiness}
                    onNavigateToJob={navigateToJob}
                    onNavigateToPayment={navigateToPayment}
                    onNavigate={handleNavSelect}
                  />
                )}
                {activeSection === 'businesses' && (
                  <BusinessesPage onSelectBusiness={navigateToBusiness} />
                )}
                {activeSection === 'jobs' && (
                  <JobsPage onSelectJob={navigateToJob} />
                )}
                {activeSection === 'payments' && (
                  <PaymentsPage onSelectPayment={navigateToPayment} />
                )}
                {activeSection === 'credits' && (
                  <CreditsPage
                    onSelectBusiness={navigateToBusiness}
                    onSelectJob={navigateToJob}
                    initialBusinessId={creditsInitialBusinessId}
                  />
                )}
                {activeSection === 'safety' && (
                  <SafetyPage
                    currentUser={currentUser}
                    onSelectBusiness={navigateToBusiness}
                  />
                )}
                {activeSection === 'deletions' && (
                  <DeletionsPage
                    currentUser={currentUser}
                    onSelectBusiness={navigateToBusiness}
                  />
                )}
                {activeSection === 'support' && (
                  <SupportPage
                    currentUser={currentUser}
                    onSelectBusiness={navigateToBusiness}
                  />
                )}
                {activeSection === 'settings' && (
                  <SettingsPage currentUser={currentUser} />
                )}
                {activeSection === 'audit-logs' && (
                  <AuditLogsPage />
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
