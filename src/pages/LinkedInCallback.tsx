import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { auth } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { saveUserData } from '../lib/db';

export default function LinkedInCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Connecting LinkedIn…');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const code = params.get('code');
    const state = params.get('state');
    const expectedState = sessionStorage.getItem('civicpath_linkedin_state');
    const returnTo = sessionStorage.getItem('civicpath_linkedin_return_to') || '/seeker';

    const cleanup = () => {
      sessionStorage.removeItem('civicpath_linkedin_state');
      sessionStorage.removeItem('civicpath_linkedin_return_to');
    };

    const run = async () => {
      if (error) throw new Error(error === 'user_cancelled_login' ? 'LinkedIn connection was canceled.' : 'LinkedIn authorization failed.');
      if (!code || !state) throw new Error('Missing LinkedIn authorization response.');
      if (!expectedState || state !== expectedState) throw new Error('LinkedIn state check failed. Please try again.');

      const res = await fetch('/api/linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'exchange', code }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'LinkedIn exchange failed.');

      const linked = data.profile || {};
      const existing = (() => {
        try { return JSON.parse(localStorage.getItem('civicpath_profile') || '{}'); } catch { return {}; }
      })();
      const mergedProfile = {
        ...existing,
        linkedinProfileName: linked.name || existing.linkedinProfileName || '',
        linkedinEmail: linked.email || existing.linkedinEmail || '',
        linkedinMemberId: linked.sub || existing.linkedinMemberId || '',
        linkedinPicture: linked.picture || existing.linkedinPicture || '',
        linkedinConnectedAt: new Date().toISOString(),
        ...(existing.logoDataUrl ? {} : (linked.picture ? { logoDataUrl: linked.picture } : {})),
      };

      localStorage.setItem('civicpath_profile', JSON.stringify(mergedProfile));
      localStorage.setItem('civicpath_linkedin_flash', 'LinkedIn profile synced successfully.');

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: linked.name || auth.currentUser.displayName || undefined,
          photoURL: linked.picture || auth.currentUser.photoURL || undefined,
        }).catch(() => {});
        await saveUserData(auth.currentUser.uid, { profile: mergedProfile }).catch(() => {});
      }

      setStatus('success');
      setMessage('LinkedIn connected. Redirecting…');
      cleanup();
      setTimeout(() => navigate(returnTo, { replace: true }), 900);
    };

    run().catch((err: any) => {
      cleanup();
      setStatus('error');
      setMessage(err?.message || 'LinkedIn connection failed.');
    });
  }, [navigate]);

  return (
    <div className="min-h-dvh bg-[#F9F7F2] flex items-center justify-center px-4" style={{ fontFamily: 'Inter,sans-serif' }}>
      <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 shadow-sm p-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          {status === 'loading' && <Loader2 className="w-6 h-6 text-[#76B900] animate-spin" />}
          {status === 'success' && <CheckCircle2 className="w-6 h-6 text-[#76B900]" />}
          {status === 'error' && <AlertCircle className="w-6 h-6 text-red-500" />}
          <span className="font-bold text-stone-900 text-lg">LinkedIn Sync</span>
        </div>
        <p className={`text-sm ${status === 'error' ? 'text-red-600' : 'text-stone-600'}`}>{message}</p>
        {status === 'error' && (
          <button
            onClick={() => navigate('/seeker', { replace: true })}
            className="mt-5 px-4 py-2 rounded-xl bg-[#76B900] text-[#111] font-bold text-sm hover:bg-[#689900] transition-colors"
          >
            Back to CivicPath
          </button>
        )}
      </div>
    </div>
  );
}
