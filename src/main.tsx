import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import './i18n'
import ErrorBoundary from './components/ErrorBoundary'
import NotFound from './pages/NotFound'
import MyLallaPage from './pages/MyLallaPage'
import MyLallaPricing from './pages/MyLallaPricing'
import LoginPage from './LoginPage.tsx'
import { AuthProvider, useAuth } from './AuthContext.tsx'
import LandingPage from './pages/LandingPage.tsx'
import SeekerDashboard from './pages/SeekerDashboard.tsx'
import FunderDashboard from './pages/FunderDashboard.tsx'
import Pricing from './pages/Pricing.tsx'
import Privacy from './pages/Privacy.tsx'
import Terms from './pages/Terms.tsx'
import DemoPage from './pages/DemoPage.tsx'
import SharePage from './pages/SharePage.tsx'
import LinkedInCallback from './pages/LinkedInCallback.tsx'
import OmninorChat from './components/OmninorChat.tsx'
import SovereignTerminal from './components/SovereignTerminal.tsx'

const Spinner = () => (
  <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-[#76B900] border-t-transparent rounded-full animate-spin" />
  </div>
);

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
        <Routes>
          {/* If on mylalla.ai domain, serve MyLalla as root */}
          <Route path="/" element={isMyLallaDomain ? <MyLallaPage /> : <LandingPage />} />
          <Route path="/pricing" element={isMyLallaDomain ? <MyLallaPricing /> : <Pricing />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/seeker" element={<SeekerDashboard />} />
          <Route path="/find-my-grant" element={<SeekerDashboard />} />
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
        <OmninorChat />
        <SovereignTerminal />
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
