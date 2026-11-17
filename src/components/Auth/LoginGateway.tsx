import React, { useState } from 'react';
import { Crown, Lock, Eye, EyeOff, ArrowRight, AlertCircle, HardDrive } from 'lucide-react';
import { unlockWithPassword } from '../../utils/martAuthSecurity';
import { PWAInstallButton } from '../PWAInstallButton';
import { BeforeInstallPromptEvent } from '../../hooks/usePWAInstall';

interface LoginGatewayProps {
  onUnlockSuccess: () => void;
  deferredPrompt?: BeforeInstallPromptEvent | null;
}

export const LoginGateway: React.FC<LoginGatewayProps> = ({ onUnlockSuccess, deferredPrompt }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const result = unlockWithPassword(password);
      if (!result.success) {
        setError(result.error || 'Incorrect password. Access denied.');
        setIsSubmitting(false);
        return;
      }

      setPassword('');
      onUnlockSuccess();
    } catch {
      setError('Unable to verify password. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-slate-950 flex flex-col justify-center items-center p-4 py-8 relative selection:bg-emerald-500 selection:text-white overflow-y-auto">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-emerald-950/40 via-slate-950 to-slate-950 -z-10" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 sm:p-7 text-center border-b border-slate-800/80 bg-slate-900/60">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 via-amber-500 to-yellow-600 text-slate-950 mb-4 shadow-lg shadow-amber-950/50">
            <Crown className="w-8 h-8 stroke-[2.4]" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-white">WAQAS POS SOFTWARE</h1>
          <p className="text-sm text-slate-300 mt-1.5">
            Enter application password to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 flex items-start gap-2.5 text-sm"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="waqas-unlock-password" className="block text-xs font-semibold text-slate-300 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="waqas-unlock-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter password"
                className="w-full min-h-[48px] px-4 py-3 pr-12 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-base font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer rounded-lg"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || password.length === 0}
            className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Lock className="w-4 h-4 text-slate-950" />
            <span>{isSubmitting ? 'Unlocking...' : 'Unlock Application'}</span>
            <ArrowRight className="w-4 h-4 text-slate-950" />
          </button>
        </form>

        <div className="px-6 pb-4">
          <PWAInstallButton deferredPrompt={deferredPrompt} variant="login" />
        </div>

        <div className="px-6 py-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span>Offline Password Lock</span>
          </span>
          <span className="font-mono text-slate-400">WAQAS POS</span>
        </div>
      </div>
    </div>
  );
};
