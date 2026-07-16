import { Button } from './ui/Button';
import { Twitter, Instagram, Linkedin, Facebook } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export function Footer({ taskManagerHref = '/login' }) {
  const companyLinks = [
    { label: 'Company Homepage', href: 'https://www.bncglobal.in' },
    { label: 'About BNC Global', href: 'https://www.bncglobal.in/about-us' },
    { label: 'Contact Support', href: 'https://www.bncglobal.in/contact-8' },
    { label: 'Careers', href: 'https://www.bncglobal.in/careers' },
  ];

  const workspaceLinks = [
    { label: 'Auditing', href: '/other-modules' },
    { label: 'Task Management', href: taskManagerHref },
    { label: 'HRM (Attendance & Operations)', href: '/other-modules' },
    { label: 'CRM (Client Pipeline)', href: '/other-modules' },
  ];

  const employeePortals = [
    { label: 'Employee Intake Portal', href: '/employee-intake' },
    { label: 'Workspace Switcher', href: '/other-modules' },
    { label: 'IT Helpdesk Support', href: 'mailto:it-support@bncglobal.in' },
  ];

  const socialLinks = [
    { label: 'X', href: 'https://twitter.com/GoyalSummit', icon: Twitter },
    { label: 'Instagram', href: 'https://www.instagram.com/bncglobal.in/', icon: Instagram },
    {
      label: 'LinkedIn',
      href: 'https://www.linkedin.com/company/broccoli-and-carrots-global-services-pvt--ltd-/',
      icon: Linkedin,
    },
    { label: 'Facebook', href: 'https://www.facebook.com/BcgsConsulting/', icon: Facebook },
  ];

  return (
    <footer className="py-24 px-4 bg-white overflow-hidden relative text-slate-600 border-t border-slate-100" id="contact">
      
      {/* Background radial effects for light theme */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(3,114,204,0.04),transparent_35%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.02),transparent_35%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Corporate Employee CTA Block - Styled in White/Light Slate */}
        <div className="bg-slate-50 rounded-[32px] p-8 md:p-16 text-center mb-20 border border-slate-100 shadow-xs">
          <div className="max-w-3xl mx-auto flex flex-col items-center">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#0372CC] mb-4">
              Internal Employee Portal
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight leading-tight">
              Ready to Access Your Workspace?
            </h2>
            <p className="text-slate-600 text-sm md:text-base max-w-xl mb-8 leading-relaxed">
              Log in with your corporate credentials to access Universe One project management, auditing, human resources, and client relationship management modules.
            </p>
            <Button
              href={taskManagerHref}
              size="xl"
              className="!bg-[#0372CC] hover:!bg-[#025aab] text-white shadow-lg !shadow-[inset_0_1.5px_2.5px_rgba(255,255,255,0.55),_0_8px_24px_rgba(3,114,204,0.35)] border border-white/25 hover:scale-105 active:scale-95 transform duration-300 px-8 py-4 rounded-full font-bold"
            >
              Launch Workspaces
            </Button>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 pt-8 border-t border-slate-100">
          
          {/* Logo & Description */}
          <div className="space-y-6 lg:col-span-1">
            <div className="flex items-center gap-2">
              <Image
                src="/assets/6a9fabaa-d09b-4d25-9e8c-75bad4b9389f.png"
                alt="Universe One"
                width={180}
                height={56}
                className="h-14 w-auto object-contain"
                priority
              />
            </div>
            <p className="text-slate-500 text-xs leading-relaxed">
              BNC Global Consultech Internal ERP & Operations Suite. Designed exclusively for employee collaboration, compliance tracking, human resources, and client pipeline management.
            </p>
            <div className="flex gap-3">
              {socialLinks.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="p-2.5 rounded-full bg-slate-50 text-slate-600 hover:bg-[#0372CC] hover:text-white transition-all duration-300 shadow-xs border border-slate-100"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Column 2: Workspaces */}
          <div>
            <h4 className="font-extrabold text-xs text-slate-900 uppercase mb-6 tracking-widest">
              Business Workspaces
            </h4>
            <ul className="space-y-3.5">
              {workspaceLinks.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-slate-500 text-sm font-semibold hover:text-[#0372CC] transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Employee Portals */}
          <div>
            <h4 className="font-extrabold text-xs text-slate-900 uppercase mb-6 tracking-widest">
              Employee Portals
            </h4>
            <ul className="space-y-3.5">
              {employeePortals.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-slate-500 text-sm font-semibold hover:text-[#0372CC] transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Corporate */}
          <div>
            <h4 className="font-extrabold text-xs text-slate-900 uppercase mb-6 tracking-widest">
              Corporate Links
            </h4>
            <ul className="space-y-3.5">
              {companyLinks.map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-500 text-sm font-semibold hover:text-[#0372CC] transition-colors"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Footer Bottom copyright */}
        <div className="mt-16 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Broccoli & Carrots Global Services Pvt. Ltd. (BNC Global). All rights reserved.</p>
          <p className="font-medium text-slate-400">Internal Use Only</p>
        </div>

      </div>
    </footer>
  );
}
