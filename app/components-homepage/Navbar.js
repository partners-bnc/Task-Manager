'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

export function Navbar({
  isOthersOpen = false,
  onToggleOthers = () => {},
  workspaceHref = '/login',
  workspaceLabel = 'Login',
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '#', external: true },
    { name: workspaceLabel, href: workspaceHref, external: false },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/80 backdrop-blur-md border-b border-gray-100 py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between">
          <a href="#" className="flex items-center gap-2 group">
            <div className="w-15 h-15 flex items-center justify-center bg-transparent transform transition-transform group-hover:rotate-12">
              <Image
                src="/assets/logo_color.png"
                alt="BNC logo"
                width={100}
                height={100}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <span className="text-xl font-bold text-dark">TaskSphere</span>
          </a>

          <div className="hidden md:flex items-center gap-1 bg-gray-50/50 p-1 rounded-full border border-gray-100 backdrop-blur-sm">
            {navLinks.map((link) => (
              link.external ? (
                <a
                  key={link.name}
                  href={link.href}
                  className="px-4 py-2 text-sm font-medium text-dark hover:bg-dark hover:text-white rounded-full transition-colors"
                >
                  {link.name}
                </a>
              ) : (
                <Link
                  key={link.name}
                  href={link.href}
                  className="px-4 py-2 text-sm font-medium text-dark hover:bg-dark hover:text-white rounded-full transition-colors"
                >
                  {link.name}
                </Link>
              )
            ))}
            <button
              type="button"
              onClick={onToggleOthers}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                isOthersOpen ? 'bg-dark text-white' : 'text-dark hover:bg-dark hover:text-white'
              }`}
            >
              Others
            </button>
          </div>

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
          {navLinks.map((link) => (
            link.external ? (
              <a
                key={link.name}
                href={link.href}
                className="text-base font-medium text-dark py-2 px-4 hover:bg-gray-50 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </a>
            ) : (
              <Link
                key={link.name}
                href={link.href}
                className="text-base font-medium text-dark py-2 px-4 hover:bg-gray-50 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            )
          ))}
          <button
            type="button"
            className={`text-left text-base font-medium py-2 px-4 rounded-lg transition-colors ${
              isOthersOpen ? 'bg-dark text-white' : 'text-dark hover:bg-gray-50'
            }`}
            onClick={() => {
              onToggleOthers();
              setIsMobileMenuOpen(false);
            }}
          >
            Others
          </button>
        </div>
      )}
    </nav>
  );
}
