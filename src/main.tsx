import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import LoginPage from './LoginPage.tsx'
import { AuthProvider, useAuth } from './AuthContext.tsx'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-[#F9F7F2] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#2E7D32] border-t-transparent rounded-full animate-spin" /></div>;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<ProtectedRoute><App /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
