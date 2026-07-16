"use client";

import { useEffect, useState } from "react";
import Image from 'next/image';
import Link from 'next/link';
import { Eye, EyeOff, Lock, Home, LayoutGrid } from "lucide-react";
import { useData } from "./DataContext";
import { createClient as createSupabaseClient } from '@/utils/supabase/client';

const supabase = createSupabaseClient();
const LOGIN_OPTIONS = [
  { id: 'super_admin', label: 'Super Admin' },
  { id: 'hr_admin', label: 'HR Admin' },
  { id: 'support', label: 'Support' },
  { id: 'employee', label: 'Employee' },
];

const SIMPLE_ROLE_ERROR_BY_LOGIN = {
  super_admin: 'This email is not registered as a Super Admin. Please choose the correct login type.',
  hr_admin: 'This email is not registered as an HR Admin. Please choose the correct login type.',
  support: 'This email is not registered as a Support user. Please choose the correct login type.',
  employee: 'This email is not registered as an Employee. Please choose the correct login type.',
};

function sanitizeLoginErrorMessage(message, loginAs) {
  const normalized = String(message || '').toLowerCase();

  if (normalized.includes('belongs to') && normalized.includes('correct login type')) {
    return SIMPLE_ROLE_ERROR_BY_LOGIN[loginAs] || 'This email is not registered for the selected login type.';
  }

  return message || 'Invalid credentials';
}

function ButtonSpinner() {
  return (
    <span className="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
  );
}

export default function Login({ onSuccess }) {
  const { login } = useData();
  const [showPassword, setShowPassword] = useState(false);
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);
  const [showRecoveryConfirmPassword, setShowRecoveryConfirmPassword] = useState(false);
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loginAs, setLoginAs] = useState('employee');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isRecoveryMode, setIsRecoveryMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('recovery') === '1';
    }
    return false;
  });
  const [recoveryReady, setRecoveryReady] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('recovery') === '1';
    }
    return false;
  });
  const activeLoginIndex = Math.max(0, LOGIN_OPTIONS.findIndex((option) => option.id === loginAs));

  useEffect(() => {
    let active = true;

    const setupRecoverySession = async () => {
      if (typeof window === 'undefined') return;

      const currentUrl = new URL(window.location.href);
      const searchParams = currentUrl.searchParams;
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const recoveryType = searchParams.get('type') || hashParams.get('type');
      const code = searchParams.get('code');
      const accessToken = searchParams.get('access_token') || hashParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token') || hashParams.get('refresh_token');

      if (recoveryType !== 'recovery' && !code && !accessToken) {
        return;
      }

      if (!active) return;

      setIsRecoveryMode(true);
      setIsForgotPasswordMode(false);
      setRecoveryReady(false);
      setError('');
      setInfo('Validating your reset link...');

      let authError = null;

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        authError = exchangeError;
      } else if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        authError = sessionError;
      } else {
        authError = new Error('This password reset link is incomplete.');
      }

      if (!active) return;

      if (authError) {
        setError(authError.message || 'This password reset link is invalid or expired.');
        setInfo('');
        setRecoveryReady(false);
        return;
      }

      window.history.replaceState({}, '', '/login?recovery=1');
      setRecoveryReady(true);
      setInfo('Reset link verified. Set a new password to finish signing in.');
    };

    setupRecoverySession();

    return () => {
      active = false;
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login({ identifier, password, loginAs });
    if (!result.success) {
      setError(sanitizeLoginErrorMessage(result.error, loginAs));
      setLoading(false);
      return;
    }

    onSuccess?.();
  };

  const handleForgotPasswordSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');

    const normalizedIdentifier = identifier.trim();

    if (!normalizedIdentifier) {
      setError('Employee ID or work email is required.');
      setLoading(false);
      return;
    }

    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: normalizedIdentifier }),
    });

    const result = await response.json();

    if (!response.ok) {
      setError(result.error || 'Failed to send password reset link.');
      setLoading(false);
      return;
    }

    setInfo(result.message || 'If an account exists, we sent a password reset link.');
    setLoading(false);
  };

  const handleRecoverySubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    const response = await fetch('/api/auth/employee-recovery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword }),
    });

    const result = await response.json();

    if (!response.ok) {
      setError(result.error || 'Failed to update password.');
      setLoading(false);
      return;
    }

    setInfo(result.message || 'Password updated successfully.');
    setLoading(false);

    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-white">
      {/* Left Side - Design & Connections (Animation) */}
      <div className="hidden lg:flex w-1/2 bg-slate-50 relative overflow-hidden flex-col justify-center items-center p-12">
        {/* Curvy Divider SVG (Inside White Mask, on the Right Edge) */}
        <div className="absolute top-0 bottom-0 right-0 w-24 h-full pointer-events-none z-20">
          <svg
            className="h-full w-full text-white fill-current"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <path d="M 100 0 C 20 25 20 75 100 100 L 100 0 Z" />
          </svg>
        </div>

        {/* Animated SVG Illustration */}
        <div className="relative z-10 w-full max-w-lg h-auto flex items-center justify-center p-4">
          <Image
            src="/assets/Animation/login.svg"
            alt="Login Animation"
            width={429}
            height={444}
            className="w-full h-auto object-contain"
            priority
          />
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 md:px-12 lg:px-28 z-10 bg-white relative">
        <div className="absolute top-6 right-6">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 w-9 h-9 text-slate-600 hover:bg-slate-50 hover:text-[#0372CC] transition-colors"
            title="Home"
          >
            <Home size={17} strokeWidth={2} />
          </Link>
        </div>
        <div className="mb-12">
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center shrink-0">
                <svg
                  width="38"
                  height="38"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[#0372CC]"
                >
                  <style>{`
                    @keyframes gridPulse {
                      0%, 100% { transform: scale(1); opacity: 1; }
                      50% { transform: scale(0.7); opacity: 0.5; }
                    }
                    .animate-grid-sq-1 { animation: gridPulse 2s infinite ease-in-out; }
                    .animate-grid-sq-2 { animation: gridPulse 2s infinite ease-in-out; animation-delay: 0.3s; }
                    .animate-grid-sq-3 { animation: gridPulse 2s infinite ease-in-out; animation-delay: 0.6s; }
                    .animate-grid-sq-4 { animation: gridPulse 2s infinite ease-in-out; animation-delay: 0.9s; }
                  `}</style>
                  <rect x="3" y="3" width="7" height="7" rx="1.5" className="animate-grid-sq-1" style={{ transformOrigin: '6.5px 6.5px' }} />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" className="animate-grid-sq-2" style={{ transformOrigin: '17.5px 6.5px' }} />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" className="animate-grid-sq-3" style={{ transformOrigin: '17.5px 17.5px' }} />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" className="animate-grid-sq-4" style={{ transformOrigin: '6.5px 17.5px' }} />
                </svg>
              </div>
              <div className="flex flex-col justify-center">
                <h1 className="text-xl lg:text-2xl font-semibold text-slate-900 tracking-tight leading-none mb-1">
                  BNC Workspace
                </h1>
                <p className="text-[10px] lg:text-xs font-normal text-slate-400 uppercase tracking-[0.25em] leading-none">
                  Enterprise Platform
                </p>
              </div>
            </div>
          </div>
          {!isRecoveryMode && !isForgotPasswordMode ? (
            <div className="mb-8">
              <p className="mb-3 text-xs font-normal text-slate-400 uppercase tracking-[0.25em]">
                Sign In As
              </p>
              <div className="relative flex w-full rounded-full bg-[#F1F4F5] p-1 md:p-1.5 shadow-[inset_0_1px_1px_rgba(148,163,184,0.16)]">
                <div
                  className="pointer-events-none absolute inset-y-1 md:inset-y-1.5 left-1 md:left-1.5 rounded-full bg-[#0372CC] shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),_0_6px_16px_rgba(3,114,204,0.28)] border border-white/20 transition-transform duration-300 ease-out"
                  style={{
                    width: 'calc((100% - 0.5rem) / 4)',
                    transform: `translateX(calc(${activeLoginIndex} * 100%))`,
                  }}
                />
                {LOGIN_OPTIONS.map((option) => {
                  const isActive = loginAs === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setLoginAs(option.id)}
                      className={`relative z-10 flex flex-1 items-center justify-center gap-1 md:gap-2 rounded-full px-1 md:px-2.5 py-2 md:py-2.5 text-[11px] md:text-[13px] font-semibold transition-colors duration-300 ${isActive ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      {isActive ? <Lock size={14} strokeWidth={2.2} className="hidden sm:inline" /> : null}
                      <span className="whitespace-nowrap">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-1.5 tracking-tight">
            {isRecoveryMode ? 'Reset Password' : isForgotPasswordMode ? 'Forgot Password' : (
              <span style={{ fontFamily: "'Georgia', 'Times New Roman', serif", fontStyle: 'italic', letterSpacing: '-0.01em' }}>
                Welcome Back
              </span>
            )}
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            {isRecoveryMode
              ? 'Create a new password to finish your first sign-in.'
              : isForgotPasswordMode
                ? 'Enter your employee ID or work email and we will send a reset link if the account exists.'
                : 'Sign in to your account and access your workspace.'}
          </p>
        </div>

        <form
          onSubmit={
            isRecoveryMode
              ? handleRecoverySubmit
              : isForgotPasswordMode
                ? handleForgotPasswordSubmit
                : handleLogin
          }
          className="space-y-6 max-w-md"
        >
          {!isRecoveryMode && !isForgotPasswordMode ? (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 mb-2.5">
                  Work Email
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  required
                  placeholder="john@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#0372CC] focus:ring-2 focus:ring-[#0372CC]/10 outline-none transition-all text-black placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 mb-2.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    placeholder="Min 8 Characters"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#0372CC] focus:ring-2 focus:ring-[#0372CC]/10 outline-none transition-all text-black placeholder-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </>
          ) : !isRecoveryMode ? (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 mb-2.5">
                Work Email
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                required
                placeholder="john@example.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#0372CC] focus:ring-2 focus:ring-[#0372CC]/10 outline-none transition-all text-black placeholder-slate-400"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 mb-2.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showRecoveryPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    required
                    minLength={8}
                    disabled={!recoveryReady || loading}
                    placeholder="Minimum 8 characters"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#0372CC] focus:ring-2 focus:ring-[#0372CC]/10 outline-none transition-all text-black placeholder-slate-400 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRecoveryPassword(!showRecoveryPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showRecoveryPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 mb-2.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showRecoveryConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    minLength={8}
                    disabled={!recoveryReady || loading}
                    placeholder="Repeat your new password"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[#0372CC] focus:ring-2 focus:ring-[#0372CC]/10 outline-none transition-all text-black placeholder-slate-400 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRecoveryConfirmPassword(!showRecoveryConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showRecoveryConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </>
          )}

          {info && (
            <div className='text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3'>
              {info}
            </div>
          )}

          {error && (
            <div className='text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3'>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (isRecoveryMode && !recoveryReady)}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#0372CC] hover:bg-[#025aab] py-3.5 font-bold text-white text-base transition-all duration-300 shadow-[inset_0_1.5px_2.5px_rgba(255,255,255,0.55),_0_8px_24px_rgba(3,114,204,0.35)] border border-white/25 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
          >
            {loading ? <ButtonSpinner /> : null}
            <span>
              {isRecoveryMode
                ? (loading ? 'Updating password...' : 'Set New Password')
                : isForgotPasswordMode
                  ? (loading ? 'Sending reset link...' : 'Send Reset Link')
                  : (loading ? 'Logging in...' : 'Login')}
            </span>
          </button>
        </form>

        {!isRecoveryMode && (
          <div className="mt-6 max-w-md">
            <button
              type="button"
              onClick={() => {
                setIsForgotPasswordMode((prev) => !prev);
                setError('');
                setInfo('');
              }}
              className="text-xs font-normal text-slate-400 hover:text-[#0372CC] transition-colors duration-200 uppercase tracking-widest"
            >
              {isForgotPasswordMode ? 'Back to login' : 'Forgot password?'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
