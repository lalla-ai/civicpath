import { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', label: 'English',   flag: '🇺🇸' },
  { code: 'es', label: 'Español',   flag: '🇪🇸' },
  { code: 'fr', label: 'Français',  flag: '🇫🇷' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'zh', label: '中文',       flag: '🇨🇳' },
  { code: 'ar', label: 'العربية',   flag: '🇸🇦' },
  { code: 'ur', label: 'اردو',      flag: '🇵🇰' },
];

interface Props { variant?: 'light' | 'dark' }

export default function LanguageSwitcher({ variant = 'light' }: Props) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGUAGES.find(l => l.code === i18n.language.split('-')[0]) ?? LANGUAGES[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const btnCls = variant === 'dark'
    ? 'text-stone-400 hover:text-stone-200 border-stone-700 bg-stone-900 hover:border-stone-500'
    : 'text-stone-500 hover:text-stone-900 border-stone-200 bg-white hover:border-stone-400';

  return (
    <div ref={ref} className="relative" style={{ direction: 'ltr' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all ${btnCls}`}
        aria-label="Select language"
      >
        <Globe className="w-3.5 h-3.5 shrink-0" />
        <span>{current.flag}</span>
        <span className="hidden sm:inline">{current.code.toUpperCase()}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden z-[300] animate-in fade-in duration-100">
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => { i18n.changeLanguage(l.code); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                l.code === current.code
                  ? 'bg-[#76B900]/10 text-[#5a9000] font-bold'
                  : 'text-stone-700 hover:bg-stone-50'
              }`}
            >
              <span className="text-base leading-none">{l.flag}</span>
              <span className="flex-1">{l.label}</span>
              {l.code === current.code && <span className="w-1.5 h-1.5 rounded-full bg-[#76B900]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
