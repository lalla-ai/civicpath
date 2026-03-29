import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import './i18n'
import ErrorBoundary from './components/ErrorBoundary'
import { AuthProvider, useAuth } from './AuthContext.tsx'
import OmninorChat from './components/OmninorChat.tsx'
import SovereignTerminal from './components/SovereignTerminal.tsx'

const Spinner = () => (
  <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-[#76B900] border-t-transparent rounded-full animate-spin" />
  </div>
);

// Lazy load all heavy routes
const NotFound = lazy(() => import('./pages/NotFound'));
const MyLallaPage = lazy(() => import('./pages/MyLallaPage'));
const MyLallaPricing = lazy(() => import('./pages/MyLallaPricing'));
const LoginPage = lazy(() => import('./LoginPage.tsx'));
const LandingPage = lazy(() => import('./pages/LandingPage.tsx'));
const SeekerDashboard = lazy(() => import('./pages/SeekerDashboard.tsx'));
const FunderDashboard = lazy(() => import('./pages/FunderDashboard.tsx'));
const Pricing = lazy(() => import('./pages/Pricing.tsx'));
const Privacy = lazy(() => import('./pages/Privacy.tsx'));
const Terms = lazy(() => import('./pages/Terms.tsx'));
const DemoPage = lazy(() => import('./pages/DemoPage.tsx'));
const SharePage = lazy(() => import('./pages/SharePage.tsx'));
const LinkedInCallback = lazy(() => import('./pages/LinkedInCallback.tsx'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Detect if running on mylalla.ai domain
const isMyLallaDomain = typeof window !== 'undefined' &&
  (window.location.hostname === 'mylalla.ai' || window.location.hostname === 'www.mylalla.ai');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<Spinner />}>
          <Routes>
            {/* If on mylalla.ai domain, serve MyLalla as root */}
            <Route path="/" element={isMyLallaDomain ? <MyLallaPage /> : <LandingPage />} />
            <Route path="/pricing" element={isMyLallaDomain ? <MyLallaPricing /> : <Pricing />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/seeker" element={<ProtectedRoute><SeekerDashboard /></ProtectedRoute>} />
            <Route path="/find-my-grant" element={<ProtectedRoute><SeekerDashboard /></ProtectedRoute>} />
            <Route path="/funder" element={<ProtectedRoute><FunderDashboard /></ProtectedRoute>} />
            <Route path="/demo" element={<DemoPage />} />
            <Route path="/workspace" element={<DemoPage />} />
            <Route path="/share" element={<SharePage />} />
            <Route path="/linkedin/callback" element={<LinkedInCallback />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/mylalla" element={<MyLallaPage />} />
            <Route path="/mylalla/pricing" element={<MyLallaPricing />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <OmninorChat />
        <SovereignTerminal />
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
