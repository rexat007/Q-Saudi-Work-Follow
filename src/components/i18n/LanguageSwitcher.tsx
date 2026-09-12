import { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useI18n } from '../../i18n';
import { Locale } from '../../i18n/types';
import { AVAILABLE_LOCALES, LOCALE_NAMES } from '../../i18n/constants';

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (newLocale: Locale) => {
    setLocale(newLocale);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef} id="language-switcher-container">
      <button
        id="language-switcher-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200/70 border border-stone-200/80 text-stone-800 transition-colors shadow-2xs"
        aria-label={t('navigation.language')}
        aria-expanded={isOpen}
      >
        <Globe className="w-3.5 h-3.5 text-stone-600" />
        <span>{LOCALE_NAMES[locale]}</span>
        <ChevronDown className={`w-3 h-3 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          id="language-switcher-dropdown"
          className="absolute right-0 mt-1 w-32 rounded-xl bg-white border border-stone-200 shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          {AVAILABLE_LOCALES.map((loc) => {
            const isSelected = loc === locale;
            return (
              <button
                key={loc}
                id={`lang-option-${loc}`}
                type="button"
                onClick={() => handleSelect(loc)}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-start transition-colors ${
                  isSelected 
                    ? 'bg-amber-50 font-bold text-amber-900' 
                    : 'text-stone-700 hover:bg-stone-50 hover:text-stone-900'
                }`}
              >
                <span>{LOCALE_NAMES[loc]}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-amber-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
