import React, { useState } from 'react';
import { Download, Share, X, Check } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-colors"
        title="تثبيت التطبيق على جهازك للعمل بدون إنترنت PWA"
      >
        <Download className="w-3.5 h-3.5" />
        <span>تثبيت التطبيق (PWA)</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-900 shadow-2xs transition-colors"
          title="تثبيت على أجهزة آيفون / آيباد"
        >
          <Share className="w-3.5 h-3.5" />
          <span>تثبيت PWA</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-stone-200 text-right space-y-4" dir="rtl">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h3 className="text-sm font-bold text-stone-900">تثبيت التطبيق على أجهزة iOS</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3 text-xs text-stone-600 leading-relaxed">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                  <span>اضغط على زر <strong>المشاركة (Share)</strong> في شريط متصفح سفاري.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                  <span>مرر للأسفل واختر <strong>إضافة إلى الصفحة الرئيسية (Add to Home Screen)</strong>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-[10px] shrink-0"><Check className="w-3 h-3" /></span>
                  <span>سيعمل التطبيق كبرنامج مستقل بالكامل بدون إنترنت عبر تقنية Offline PWA.</span>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 text-xs transition-colors"
              >
                فهمت ذلك
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
