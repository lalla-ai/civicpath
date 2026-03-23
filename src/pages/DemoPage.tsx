import SeekerDashboard from './SeekerDashboard';
import { AuthContext } from '../AuthContext';

const DEMO_USER = {
  email: 'demo@civicpath.ai',
  name: 'Demo User',
  role: 'seeker' as const,
};

export default function DemoPage() {
  return (
    <AuthContext.Provider value={{
      user: DEMO_USER,
      loading: false,
      loginWithGoogle: async () => {},
      loginWithEmail: async () => {},
      signupWithEmail: async () => {},
      setRole: () => {},
      logout: () => { window.location.href = '/'; },
    }}>
      <div className="fixed top-0 left-0 right-0 z-[100] bg-[#76B900] text-[#111] text-xs font-bold text-center py-2 flex items-center justify-center gap-4">
        <span>👀 Live Demo — no account needed</span>
        <a href="/login?role=seeker" className="underline hover:no-underline">Sign up free to save your work →</a>
        <a href="/" className="ml-4 underline hover:no-underline">← Home</a>
      </div>
      <div className="pt-8">
        <SeekerDashboard />
      </div>
    </AuthContext.Provider>
  );
}
