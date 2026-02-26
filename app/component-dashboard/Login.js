"use client";

import { useState } from "react";
import Image from 'next/image';
import Link from 'next/link';
import { Eye, EyeOff } from "lucide-react";
import { useData } from "./DataContext";

export default function Login({ onSuccess }) {
  const { login } = useData();
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login({ identifier, password });
    if (!result.success) {
      setError(result.error || 'Invalid credentials');
      setLoading(false);
      return;
    }

    onSuccess();
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
          <h1 className="text-2xl font-bold text-black mb-10">Task Manager</h1>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            Welcome Back
          </h2>
          <p className="text-slate-500">Please enter your details to log in</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6 max-w-md">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email or Username
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              required
              placeholder="john@example.com or john123"
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

          {error && (
            <div className='text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2'>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full cursor-pointer bg-[#7F40EE] hover:bg-[#671aec] text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-blue-200"
          >
            {loading ? 'LOGGING IN...' : 'LOGIN'}
          </button>
        </form>

        <p className="mt-6 text-slate-600">
          Don&apos;t have an account?{" "}
          <a href="#" className="text-[#7733ec] hover:underline font-medium">
            Sign Up
          </a>
        </p>
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
