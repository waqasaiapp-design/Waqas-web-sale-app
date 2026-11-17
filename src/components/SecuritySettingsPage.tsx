import React from 'react';
import { ShieldCheck, Lock } from 'lucide-react';
import { FullScreenPageHeader } from './FullScreenPageHeader';

interface SecuritySettingsPageProps {
  onBackToHome?: () => void;
}

export const SecuritySettingsPage: React.FC<SecuritySettingsPageProps> = ({ onBackToHome }) => {
  return (
    <div className="h-full flex flex-col w-full bg-[#f8fafc] text-slate-900 font-sans select-none overflow-hidden">
      <FullScreenPageHeader
        title="Device Security"
        urduTitle="ڈیوائس سیکیورٹی"
        icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />}
        onBackToHome={onBackToHome}
      />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Application Password Lock Active</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            WAQAS POS SOFTWARE requires the offline application password on every launch. Password changes are disabled.
          </p>
          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="mt-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              Return to Home
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
