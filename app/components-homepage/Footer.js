import { Button } from './ui/Button';
import { Twitter, Instagram, Linkedin, Facebook } from 'lucide-react';
import Image from 'next/image';

export function Footer({ taskManagerHref = '/login' }) {
  const companyLinks = [
    { label: 'About Us', href: 'https://www.bncglobal.in/about-us' },
    { label: 'Contact Us', href: 'https://www.bncglobal.in/contact-8' },
    { label: 'Careers', href: 'https://www.bncglobal.in/careers' },
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
    <footer className="py-20 px-4 bg-white overflow-hidden relative" id="contact">
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="bg-primary/5 rounded-[40px] p-8 md:p-20 text-center mb-24 border border-gray-100">
          <div className="max-w-4xl mx-auto flex flex-col items-center">
            <h2 className="text-4xl md:text-6xl font-bold text-dark mb-12 leading-tight">
              Ready to elevate your project management game? Start your free
              trial today!
            </h2>
            <Button
              href={taskManagerHref}
              size="xl"
              className="shadow-xl shadow-primary/20 hover:scale-105 transform duration-300"
            >
              Get Started - for free
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-12 border-t border-gray-100 pt-16">
          <div className="space-y-6">
            <div className="flex items-center">
              <Image
                src="/assets/logo_color.png"
                alt="TaskSphere"
                width={180}
                height={48}
                className="h-10 w-auto"
                priority
              />
              <span className="text-xl font-bold text-dark">TaskSphere</span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">
              Streamlined project management for seamless collaboration and
              enhanced productivity.
            </p>
            <div className="flex gap-4">
              {socialLinks.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="p-2 rounded-full bg-gray-50 text-dark hover:bg-primary hover:text-white transition-colors"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-sm text-gray-400 mb-6 tracking-wider">
              COMPANY
            </h4>
            <ul className="space-y-4">
              {companyLinks.map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-dark font-medium hover:text-primary transition-colors"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
