'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Menu, X, LogOut } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export function Navbar({
  workspaceHref = '/login',
  workspaceLabel = 'Login',
  othersHref = '/other-modules',
  isOthersActive = false,
  isAuthenticated = false,
  user = null,
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const handleScroll = (event) => {
      const target = event.target;
      const scrollTop =
        target === document || target === window
          ? window.scrollY
          : target?.scrollTop || 0;
      setIsScrolled(scrollTop > 20);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: workspaceLabel, href: workspaceHref, external: false },
  ];

  const avatarSrc = user?.avatarUrl || null;
  const avatarInitial = user?.name?.trim()?.charAt(0)?.toUpperCase() || 'U';
  const employeeId = user?.employeeId || user?.email || 'USER';
  const displayName = user?.name || employeeId;

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Failed to sign out:', error);
    } finally {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/70 backdrop-blur-md border-b border-slate-100 shadow-sm py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-16 w-52 flex items-center justify-start bg-transparent transition-transform duration-300 group-hover:scale-105">
              <Image
                src="/assets/6a9fabaa-d09b-4d25-9e8c-75bad4b9389f.png"
                alt="Universe One logo"
                width={208}
                height={64}
                className="h-full w-auto object-contain"
                priority
              />
            </div>
          </Link>

          {isAuthenticated ? (
            <div className="hidden md:flex items-center gap-2.5 rounded-full border border-slate-200/80 bg-slate-100/60 px-3 py-1.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] backdrop-blur-sm">
              <Link
                href={othersHref}
                className={`px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 hover:scale-105 active:scale-95 ${
                  isOthersActive
                    ? 'bg-[#0372CC] text-white shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.6),_0_2px_6px_rgba(3,114,204,0.3)]'
                    : 'text-slate-700 hover:text-white hover:bg-[#0372CC] hover:shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.6),_0_2px_6px_rgba(3,114,204,0.3)]'
                }`}
              >
                Others
              </Link>
              <div className="flex items-center gap-3 rounded-full bg-slate-50 px-3 py-1.5 shadow-xs">
                <div className="relative h-9 w-9 overflow-hidden rounded-full border border-violet-100 bg-violet-100">
                  {avatarSrc ? (
                    <Image src={avatarSrc} alt={user?.name || 'User'} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-bold text-violet-700">
                      {avatarInitial}
                    </div>
                  )}
                </div>
                <div className="text-sm font-semibold text-slate-700">{displayName}</div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-300 hover:text-white hover:bg-[#0372CC] hover:shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.6),_0_2px_6px_rgba(3,114,204,0.3)] hover:scale-105 active:scale-95 disabled:opacity-60"
              >
                <LogOut size={16} />
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-1.5 bg-slate-100/60 p-1.5 rounded-full border border-slate-200/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] backdrop-blur-sm">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 rounded-full transition-all duration-300 hover:text-white hover:bg-[#0372CC] hover:shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.6),_0_2px_6px_rgba(3,114,204,0.3)] hover:scale-105 active:scale-95"
                >
                  {link.name}
                </Link>
              ))}
              <Link
                href={othersHref}
                className={`px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 hover:scale-105 active:scale-95 ${
                  isOthersActive
                    ? 'bg-[#0372CC] text-white shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.6),_0_2px_6px_rgba(3,114,204,0.3)]'
                    : 'text-slate-700 hover:text-white hover:bg-[#0372CC] hover:shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.6),_0_2px_6px_rgba(3,114,204,0.3)]'
                }`}
              >
                Others
              </Link>
            </div>
          )}

          <button
            className="md:hidden p-2 text-dark"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-100 p-4 flex flex-col gap-4 shadow-lg">
          {isAuthenticated ? (
            <>
              <div className="flex items-center gap-3 px-2">
                <div className="relative h-10 w-10 overflow-hidden rounded-full border border-violet-100 bg-violet-100">
                  {avatarSrc ? (
                    <Image src={avatarSrc} alt={user?.name || 'User'} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-bold text-violet-700">
                      {avatarInitial}
                    </div>
                  )}
                </div>
                <div className="text-sm font-semibold text-slate-700">{displayName}</div>
              </div>
              <Link
                href={othersHref}
                className={`text-left text-base font-medium py-2 px-4 rounded-lg transition-colors ${
                  isOthersActive ? 'bg-dark text-white' : 'text-dark hover:bg-gray-50'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Others
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-left text-base font-medium py-2 px-4 rounded-lg text-dark hover:bg-gray-50 disabled:opacity-60"
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </>
          ) : (
            <>
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-base font-medium text-dark py-2 px-4 hover:bg-gray-50 rounded-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <Link
                href={othersHref}
                className={`text-left text-base font-medium py-2 px-4 rounded-lg transition-colors ${
                  isOthersActive ? 'bg-dark text-white' : 'text-dark hover:bg-gray-50'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Others
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
