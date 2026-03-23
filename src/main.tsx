import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import LoginPage from './LoginPage.tsx'
import { AuthProvider, useAuth } from './AuthContext.tsx'
import LandingPage from './pages/LandingPage.tsx'
import SeekerDashboard from './pages/SeekerDashboard.tsx'
import FunderDashboard from './pages/FunderDashboard.tsx'

const Spinner = () => (
  <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-[#2E7D32] border-t-transparent rounded-full animate-spin" />
  </div>
);

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={user.role === 'funder' ? '/funder' : '/seeker'} replace />;
  }
  return <>{children}</>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/seeker" element={<ProtectedRoute requiredRole="seeker"><SeekerDashboard /></ProtectedRoute>} />
          <Route path="/funder" element={<ProtectedRoute requiredRole="funder"><FunderDashboard /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
