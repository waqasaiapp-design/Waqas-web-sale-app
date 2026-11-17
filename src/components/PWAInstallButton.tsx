import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2, Share2, ExternalLink } from 'lucide-react';
import { usePWAInstall, BeforeInstallPromptEvent } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  deferredPrompt?: BeforeInstallPromptEvent | null;
  variant?: 'header' | 'login';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  deferredPrompt,
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall(deferredPrompt);
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          variant === 'login'
            ? 'w-full py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer'
            : 'px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 border border-emerald-300'
        }
        title="Install WAQAS MART App (ایپ انسٹال کریں)"
      >
        <Smartphone className="w-4 h-4 shrink-0" />
        <span>{isInstallable ? 'Install App Now' : 'Install / App Setup'}</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-emerald-200">
            <div className="bg-[#057a44] p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-5 h-5 text-amber-300" />
                <h3 className="font-black text-sm">Install WAQAS MART POS App</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="p-1.5 hover:bg-white/15 rounded-xl transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              {isIOS ? (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Share2 className="w-4 h-4 text-blue-600" />
                    iPhone / iPad (Safari):
                  </p>
                  <p className="text-slate-600">
                    1. Tap the <strong>Share</strong> icon in Safari toolbar.<br />
                    2. Scroll down and tap <strong>Add to Home Screen</strong>.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1.5">
                  <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    Android Chrome / Windows Edge:
                  </p>
                  <p className="text-emerald-900 leading-relaxed">
                    1. Tap Chrome Menu (<strong>⋮</strong>) $\rightarrow$ <strong>Install app</strong> (or <strong>Create shortcut</strong>).<br />
                    2. If Chrome shows <em>&quot;This app cannot be installed&quot;</em>, open the live Development link or tap <strong>Create shortcut</strong> — it adds the WAQAS MART icon directly to your home screen!
                  </p>
                </div>
              )}

              <a
                href="/download"
                download="Waqas-Mart-POS.zip"
                className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Full Offline Package (.ZIP)</span>
              </a>

              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
