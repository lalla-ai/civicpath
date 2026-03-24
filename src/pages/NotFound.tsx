import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  useEffect(() => {
    document.title = '404 — Page Not Found | CivicPath';
  }, []);

  return (
    <div className="min-h-screen bg-[#F9F7F2] flex flex-col items-center justify-center p-6 font-sans text-center">
      <div className="max-w-md w-full">
        <div className="text-8xl font-[900] text-[#76B900] mb-2">404</div>
        <h1 className="text-2xl font-bold text-stone-900 mb-3">Page not found</h1>
        <p className="text-stone-500 text-sm mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="px-6 py-3 bg-[#76B900] text-[#111111] font-bold rounded-xl hover:bg-[#689900] transition-colors text-sm"
          >
            ← Back to Home
          </Link>
          <Link
            to="/login?role=seeker"
            className="px-6 py-3 border border-stone-200 text-stone-700 font-bold rounded-xl hover:bg-stone-100 transition-colors text-sm"
          >
            Find My Grant →
          </Link>
        </div>
      </div>
    </div>
  );
}
