"use client";

import { useEffect, useState } from "react";
import Image from 'next/image';
import Link from 'next/link';
import { Eye, EyeOff, Lock } from "lucide-react";
import { useData } from "./DataContext";
import { createClient as createSupabaseClient } from '@/utils/supabase/client';

const supabase = createSupabaseClient();
const LOGIN_OPTIONS = [
  { id: 'super_admin', label: 'Super Admin' },
  { id: 'hr_admin', label: 'HR Admin' },
  { id: 'employee', label: 'Employee' },
];

const SIMPLE_ROLE_ERROR_BY_LOGIN = {
  super_admin: 'This email is not registered as a Super Admin. Please choose the correct login type.',
  hr_admin: 'This email is not registered as an HR Admin. Please choose the correct login type.',
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
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
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
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

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
      {/* Left Side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-12 lg:px-24 z-10 bg-white relative">
        <div className="absolute top-6 right-6">
          <Link
            href="/"
            className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Home
          </Link>
        </div>
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-black mb-10">Sanctum Enterprise Suite</h1>
          {!isRecoveryMode && !isForgotPasswordMode ? (
            <div className="mb-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Sign In As
              </p>
              <div className="relative flex w-full max-w-[28rem] rounded-full bg-[#F1F4F5] p-1.5 shadow-[inset_0_1px_1px_rgba(148,163,184,0.16)]">
                <div
                  className="pointer-events-none absolute inset-y-1.5 left-1.5 rounded-full bg-[#7F40EE] shadow-[0_12px_28px_rgba(127,64,238,0.22)] transition-transform duration-300 ease-out"
                  style={{
                    width: 'calc((100% - 0.75rem) / 3)',
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
                        className={`relative z-10 flex flex-1 items-center justify-center gap-2 rounded-full px-2.5 py-2.5 text-[13px] font-semibold transition-colors duration-300 ${
                          isActive ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      {isActive ? <Lock size={16} strokeWidth={2.2} /> : null}
                      <span className="whitespace-nowrap">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            {isRecoveryMode ? 'Reset Password' : isForgotPasswordMode ? 'Forgot Password' : 'Welcome Back'}
          </h2>
          <p className="text-slate-500">
            {isRecoveryMode
              ? 'Create a new password to finish your first sign-in.'
              : isForgotPasswordMode
                ? 'Enter your employee ID or work email and we will send a reset link if the account exists.'
                : 'Use the central login and choose the correct workspace before signing in.'}
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
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Work Email
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  required
                  placeholder="john@example.com"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    placeholder="Min 8 Characters"
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-black"
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
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Work Email
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                required
                placeholder="john@example.com"
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-black"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
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
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-black disabled:bg-slate-50 disabled:text-slate-400"
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
                <label className="block text-sm font-medium text-slate-700 mb-2">
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
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-black disabled:bg-slate-50 disabled:text-slate-400"
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
            <div className='text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2'>
              {info}
            </div>
          )}

          {error && (
            <div className='text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2'>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (isRecoveryMode && !recoveryReady)}
            className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#7F40EE] py-3 font-bold text-white transition-all duration-200 hover:bg-[#671aec] hover:shadow-[0_18px_36px_rgba(127,64,238,0.28)] disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
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
          <div className="mt-6 max-w-md text-sm">
            <button
              type="button"
              onClick={() => {
                setIsForgotPasswordMode((prev) => !prev);
                setError('');
                setInfo('');
              }}
              className="font-medium text-[#7733ec] hover:underline"
            >
              {isForgotPasswordMode ? 'Back to login' : 'Forgot password?'}
            </button>
          </div>
        )}
      </div>

      {/* Right Side - Design & Connections */}
      <div className="hidden lg:flex w-1/2 bg-[#7F40EE] relative overflow-hidden flex-col justify-between p-12">
        {/* Ambient Background Blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-20 translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400 rounded-full blur-3xl opacity-20 -translate-x-1/2 translate-y-1/2"></div>

        {/* Subtle Shiny Reflection / Glass Effect */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-10 left-0" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-30" />
        </div>

        {/* Connecting Lines (SVG Layer) */}
        {/* We use absolute positioning to draw lines between the flex areas */}
        {/* Connecting Lines (SVG Layer) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-50"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Line from Top Card (Right Edge) to User Group (Top-Left) */}
          <path
            d="M 89 25 H 96 V 42 H 16 V 48"
            fill="none"
            stroke="white"
            strokeWidth="0.3"
            strokeDasharray="1 1"
            className="drop-shadow-sm"
          />

          {/* Line from User Group (Bottom-Left) to Bottom Card (Left Edge) */}
          <path
            d="M 16 52 V 70 H 55"
            fill="none"
            stroke="white"
            strokeWidth="0.3"
            strokeDasharray="1 1"
            className="drop-shadow-sm"
          />

          <path
            d="M 60 52 V 70 H 55"
            fill="none"
            stroke="white"
            strokeWidth="0.3"
            strokeDasharray="1 1"
            className="drop-shadow-sm"
          />
        </svg>

        {/* Grid/Flex Container for Cards */}
        <div className="relative z-10 flex flex-col h-full justify-center gap-10">
          {/* TOP CARD (Right Aligned) */}
          <div className="flex justify-end pr-10">
            <div className="bg-white p-6 rounded-2xl shadow-2xl w-96 transform transition-transform hover:scale-105 duration-300">
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-purple-100 text-purple-600 text-xs rounded font-medium">
                    Pending
                  </span>
                  <span className="px-2 py-1 bg-orange-100 text-orange-600 text-xs rounded font-medium">
                    Medium Priority
                  </span>
                </div>
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] text-gray-500 font-bold overflow-hidden"
                    >
                      <Image
                        src={`https://picsum.photos/id/${10 + i}/50/50`}
                        alt="avatar"
                        width={24}
                        height={24}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <h3 className="font-bold text-slate-800 mb-2">
                Social Media Campaign
              </h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Develop a content plan for the upcoming product launch.
              </p>
              <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                <span>Task Done 4/10</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4">
                <div className="bg-blue-500 h-1.5 rounded-full w-[40%]"></div>
              </div>
              <div className="flex justify-between items-center text-xs font-medium text-slate-500">
                <div>
                  <div className="text-slate-400 text-[10px]">Start Date</div>
                  <div>16th Mar 2025</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-400 text-[10px]">Due Date</div>
                  <div>21th Mar 2025</div>
                </div>
              </div>
            </div>
          </div>

          {/* MIDDLE USERS (Left Aligned) */}
          <div className="flex justify-start pl-10 gap-6">
            <div className="bg-white p-4 rounded-xl shadow-xl flex items-center gap-3 w-64 transform transition-transform hover:scale-105 duration-300">
              <Image
                src="https://picsum.photos/id/11/50/50"
                alt="Adam"
                width={40}
                height={40}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <div className="font-bold text-sm text-slate-800">
                  Adam Cole
                </div>
                <div className="text-xs text-slate-500">
                  adam@timetoprogram.com
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-xl flex items-center gap-3 w-64 transform transition-transform hover:scale-105 duration-300">
              <Image
                src="https://picsum.photos/id/12/50/50"
                alt="Luke"
                width={40}
                height={40}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <div className="font-bold text-sm text-slate-800">
                  Luke Ryan
                </div>
                <div className="text-xs text-slate-500">
                  luke@timetoprogram.com
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM CARD (Right Aligned) */}
          <div className="flex justify-end pr-10">
            <div className="bg-white p-6 rounded-2xl shadow-2xl w-96 transform transition-transform hover:scale-105 duration-300">
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-sky-100 text-sky-600 text-xs rounded font-medium">
                    In progress
                  </span>
                  <span className="px-2 py-1 bg-orange-100 text-orange-600 text-xs rounded font-medium">
                    Medium Priority
                  </span>
                </div>
                <div className="flex -space-x-2">
                  {[4, 5].map((i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] text-gray-500 font-bold overflow-hidden"
                    >
                      <Image
                        src={`https://picsum.photos/id/${15 + i}/50/50`}
                        alt="avatar"
                        width={24}
                        height={24}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <h3 className="font-bold text-slate-800 mb-2">Create App UI</h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Design and implement the main dashboard user interface with
                responsive components.
              </p>
              <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
                <span>Task Done 7/10</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4">
                <div className="bg-blue-500 h-1.5 rounded-full w-[70%]"></div>
              </div>
              <div className="flex justify-between items-center text-xs font-medium text-slate-500">
                <div>
                  <div className="text-slate-400 text-[10px]">Start Date</div>
                  <div>10th Dec 2025</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-400 text-[10px]">Due Date</div>
                  <div>15th Jan 2026</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grid Pattern Overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20 z-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        ></div>
      </div>
    </div>
  );
}
