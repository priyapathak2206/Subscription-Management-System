import React from 'react';
import { Check, X } from 'lucide-react';

interface Props {
  password: string;
  confirmPassword?: string;
}

export const LivePasswordChecklist: React.FC<Props> = ({ password, confirmPassword }) => {
  const minLength = password.length >= 9;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const passwordsMatch = confirmPassword !== undefined ? password.length > 0 && password === confirmPassword : true;

  const rules = [
    { label: 'More than 8 characters (min. 9)', passed: minLength },
    { label: 'At least one uppercase letter (A-Z)', passed: hasUppercase },
    { label: 'At least one lowercase letter (a-z)', passed: hasLowercase },
    { label: 'At least one special character (!@#$...)', passed: hasSpecial },
  ];

  if (confirmPassword !== undefined) {
    rules.push({ label: 'Passwords match exactly', passed: passwordsMatch });
  }

  const passedCount = rules.filter((r) => r.passed).length;
  const progressPercent = Math.round((passedCount / rules.length) * 100);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5 text-xs text-slate-700">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-600">Password Requirements</span>
        <span className="font-medium text-slate-500">{passedCount} of {rules.length} met</span>
      </div>

      {/* Strength indicator bar */}
      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            progressPercent === 100
              ? 'bg-emerald-500'
              : progressPercent >= 60
              ? 'bg-amber-500'
              : 'bg-rose-500'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
        {rules.map((rule, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-1.5 transition-colors ${
              rule.passed ? 'text-emerald-700 font-medium' : 'text-slate-400'
            }`}
          >
            {rule.passed ? (
              <span className="bg-emerald-100 text-emerald-700 rounded-full p-0.5">
                <Check className="w-3 h-3 stroke-[3]" />
              </span>
            ) : (
              <span className="bg-slate-200 text-slate-400 rounded-full p-0.5">
                <X className="w-3 h-3 stroke-[2.5]" />
              </span>
            )}
            <span>{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
