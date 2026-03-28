import { useEffect } from 'react';
import SeekerDashboard from './SeekerDashboard';
import { AuthContext } from '../AuthContext';

const DEMO_USER = {
  email: 'demo@civicpath.ai',
  name: 'Demo User',
  role: 'seeker' as const,
};

const DEMO_PROFILE = {
  companyName: 'Sunrise Tech Nonprofit',
  orgType: '501c3',
  location: 'Miami, FL',
  website: 'https://example.civicpath.ai',
  linkedinUrl: '',
  twitterUrl: '',
  tagline: 'AI-powered civic tech for South Florida communities',
  yearFounded: '2021',
  logoDataUrl: '',
  focusArea: 'AI-driven civic technology and STEM education',
  missionStatement: 'We exist to bridge the digital divide in underserved Miami-Dade communities by providing AI-powered tools, STEM education, and direct access to federal and state funding opportunities.',
  targetPopulation: 'Low-income youth and small businesses in Miami-Dade County',
  geographicScope: 'local',
  annualBudget: '250k-1m',
  teamSize: '6-20',
  yearsOperating: '3-10',
  impactMetrics: '500 students served · $2.1M secured · 12 grants won · 3 counties',
  teamMembersText: 'Jane Smith (Executive Director), Marcus Johnson (CTO), Ana Diaz (Grant Manager)',
  projectDescription: 'Launch a free AI literacy bootcamp serving 200 underserved students in Miami-Dade, providing hands-on training, mentorship, and direct pathways to tech careers.',
  fundingAmount: '150-500k',
  previousGrants: 'yes-small',
  backgroundInfo: 'Award-winning nonprofit with 3 years of demonstrated impact in Miami. Winners of the 2024 Florida Innovation Award. Google.org grantee.',
  resumeText: '',
  ein: '82-1234567',
  dunsNumber: '123456789',
  grantHistoryText: 'FL STEM Initiative ($75K) — Won 2024 · Miami-Dade Cultural Affairs ($15K) — Won 2023 · NSF SBIR — Applied 2025'
};

export default function DemoPage() {
  useEffect(() => {
    // Set demo profile so onboarding is skipped
    if (!localStorage.getItem('civicpath_profile') || localStorage.getItem('civicpath_demo') !== '1') {
      localStorage.setItem('civicpath_profile', JSON.stringify(DEMO_PROFILE));
      localStorage.setItem('civicpath_demo', '1');
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user: DEMO_USER,
      loading: false,
      loginWithGoogle: async () => 'popup',
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
