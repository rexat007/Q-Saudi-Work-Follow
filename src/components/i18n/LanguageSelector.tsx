import {LOCALES, Locale, useI18n} from '../../i18n';

export function LanguageSelector() {
  const {locale, setLocale, resource} = useI18n();
  return (
    <div className="fixed top-3 right-3 z-[60] flex items-center gap-1 rounded-xl border border-stone-200 bg-white/95 p-1 shadow-lg backdrop-blur print:hidden" aria-label={resource.common.language}>
      {(Object.keys(LOCALES) as Locale[]).map((code) => (
        <button key={code} type="button" onClick={() => setLocale(code)} aria-pressed={locale === code}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${locale === code ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-100'}`}>
          {LOCALES[code].label}
        </button>
      ))}
    </div>
  );
}
