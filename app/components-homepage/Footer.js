import { Button } from './ui/Button';
import { Twitter, Instagram, Linkedin, Facebook } from 'lucide-react';

export function Footer() {
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
              href="/dashboard"
              size="xl"
              className="shadow-xl shadow-primary/20 hover:scale-105 transform duration-300"
            >
              Get Started - for free
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 border-t border-gray-100 pt-16">
          <div className="col-span-1 md:col-span-1 space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 text-primary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 32 32"
                  fill="none"
                  className="w-full h-full"
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
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">
              Streamlined project management for seamless collaboration and
              enhanced productivity.
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                className="p-2 rounded-full bg-gray-50 text-dark hover:bg-primary hover:text-white transition-colors"
              >
                <Twitter size={18} />
              </a>
              <a
                href="#"
                className="p-2 rounded-full bg-gray-50 text-dark hover:bg-primary hover:text-white transition-colors"
              >
                <Instagram size={18} />
              </a>
              <a
                href="#"
                className="p-2 rounded-full bg-gray-50 text-dark hover:bg-primary hover:text-white transition-colors"
              >
                <Linkedin size={18} />
              </a>
              <a
                href="#"
                className="p-2 rounded-full bg-gray-50 text-dark hover:bg-primary hover:text-white transition-colors"
              >
                <Facebook size={18} />
              </a>
            </div>
          </div>

          <div className="col-span-1">
            <h4 className="font-bold text-sm text-gray-400 mb-6 tracking-wider">
              PRODUCT
            </h4>
            <ul className="space-y-4">
              <li>
                <a href="#" className="text-dark font-medium hover:text-primary transition-colors">
                  Home
                </a>
              </li>
              <li>
                <a
                  href="#feature"
                  className="text-dark font-medium hover:text-primary transition-colors"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#pricing"
                  className="text-dark font-medium hover:text-primary transition-colors"
                >
                  Pricing
                </a>
              </li>
              <li>
                <a href="#blog" className="text-dark font-medium hover:text-primary transition-colors">
                  Blog
                </a>
              </li>
            </ul>
          </div>

          <div className="col-span-1">
            <h4 className="font-bold text-sm text-gray-400 mb-6 tracking-wider">
              COMPANY
            </h4>
            <ul className="space-y-4">
              <li>
                <a
                  href="#about"
                  className="text-dark font-medium hover:text-primary transition-colors"
                >
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="text-dark font-medium hover:text-primary transition-colors">
                  Career
                </a>
              </li>
              <li>
                <a
                  href="#contact"
                  className="text-dark font-medium hover:text-primary transition-colors"
                >
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          <div className="col-span-1">
            <h4 className="font-bold text-sm text-gray-400 mb-6 tracking-wider">
              UTILITY
            </h4>
            <ul className="space-y-4">
              <li>
                <a href="#" className="text-dark font-medium hover:text-primary transition-colors">
                  FAQs
                </a>
              </li>
              <li>
                <a href="#" className="text-dark font-medium hover:text-primary transition-colors">
                  License
                </a>
              </li>
              <li>
                <a href="#" className="text-dark font-medium hover:text-primary transition-colors">
                  404
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
