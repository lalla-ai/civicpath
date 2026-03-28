import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'pt', label: 'Português' },
  { code: 'ar', label: 'العربية' },
  { code: 'zh', label: '中文' },
  { code: 'ur', label: 'اردو' }
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors cursor-pointer group relative">
      <Globe className="w-4 h-4" />
      <select
        value={i18n.language.split('-')[0]}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className="appearance-none bg-transparent outline-none text-xs font-semibold cursor-pointer w-full"
      >
        {languages.map(lang => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}
