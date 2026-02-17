'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from './ui/Button';

export function Navbar() {
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
    { name: 'Login', href: '/dashboard', external: false },
    { name: 'Admin', href: '/admin', external: false },
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
            <div className="w-8 h-8 flex items-center justify-center bg-transparent transform transition-transform group-hover:rotate-12">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 32 32"
                fill="none"
                className="w-full h-full text-primary"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M20.4446 9.34824C19.129 8.4692 17.5822 8 16 8V0C19.1645 0 22.2579 0.938384 24.8891 2.69649C27.5203 4.45458 29.571 6.95345 30.7821 9.87704C31.993 12.8006 32.3099 16.0178 31.6926 19.1214C31.0752 22.2251 29.5514 25.0761 27.3137 27.3137C25.0761 29.5514 22.2251 31.0752 19.1214 31.6926C16.0178 32.3099 12.8006 31.993 9.87704 30.7821C6.95344 29.571 4.45458 27.5203 2.69649 24.8891C0.938384 22.2579 0 19.1645 0 16H8C8 17.5822 8.4692 19.129 9.34824 20.4446C10.2273 21.7602 11.4767 22.7855 12.9386 23.391C14.4003 23.9966 16.0089 24.155 17.5607 23.8462C19.1126 23.5376 20.538 22.7757 21.6569 21.6569C22.7757 20.538 23.5376 19.1126 23.8462 17.5607C24.155 16.0089 23.9966 14.4003 23.391 12.9386C22.7855 11.4767 21.7602 10.2273 20.4446 9.34824Z"
                  fill="currentColor"
                ></path>
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M16 8C16 9.05058 15.7931 10.0909 15.391 11.0615C14.989 12.0321 14.3997 12.914 13.6569 13.6569C12.914 14.3997 12.0321 14.989 11.0615 15.391C10.0909 15.7931 9.05057 16 8 16L8 24C10.1011 24 12.1817 23.5862 14.1229 22.7821C16.0642 21.978 17.828 20.7994 19.3137 19.3137C20.7994 17.828 21.978 16.0642 22.7821 14.1229C23.5862 12.1817 24 10.1011 24 8L16 8Z"
                  fill="currentColor"
                ></path>
              </svg>
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
          <Button className="w-full justify-center">Purchase Template</Button>
        </div>
      )}
    </nav>
  );
}
