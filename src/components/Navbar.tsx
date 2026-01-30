import React, { useState } from 'react';
import { FileSignature, Menu, X } from 'lucide-react';

interface NavbarProps {
  currentPage?: string;
}

const Navbar: React.FC<NavbarProps> = ({ currentPage = '' }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Sign', href: `${import.meta.env.BASE_URL}public-sign` },
    { name: 'Verifier', href: `${import.meta.env.BASE_URL}public-verifier` },
    { name: 'About Us', href: `${import.meta.env.BASE_URL}public-about-us` },
    { name: 'FAQ', href: `${import.meta.env.BASE_URL}faq` },
  ];

  return (
    <nav className="relative z-10 backdrop-blur-md border-b" style={{ backgroundColor: '#19183Bee', borderColor: '#708993' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <a href="/" className="flex items-center space-x-2">
            <FileSignature className="w-8 h-8" style={{ color: '#A1C2BD' }} />
            <span className="text-2xl font-bold" style={{ color: '#E7F2EF' }}>
              Pluma
            </span>
          </a>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="transition-colors duration-200 hover:opacity-80"
                style={{ 
                  color: currentPage === item.name ? '#E7F2EF' : '#A1C2BD',
                  fontWeight: currentPage === item.name ? '600' : '400'
                }}
              >
                {item.name}
              </a>
            ))}
            <a 
              href={`${import.meta.env.BASE_URL}login`}
              className="px-6 py-2 rounded-lg font-semibold transition-all duration-200 hover:opacity-90 inline-block"
              style={{ backgroundColor: '#708993', color: '#E7F2EF' }}
            >
              Login
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            style={{ color: '#A1C2BD' }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden backdrop-blur-md border-t" style={{ backgroundColor: '#19183Bf5', borderColor: '#708993' }}>
          <div className="px-4 py-4 space-y-3">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="block py-2 transition-colors duration-200 hover:opacity-80"
                style={{ 
                  color: currentPage === item.name ? '#E7F2EF' : '#A1C2BD',
                  fontWeight: currentPage === item.name ? '600' : '400'
                }}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </a>
            ))}
            <a
              href={`${import.meta.env.BASE_URL}login`}
              className="w-full px-6 py-2 rounded-lg font-semibold transition-all duration-200 hover:opacity-90"
              style={{ backgroundColor: '#708993', color: '#E7F2EF' }}
            >
              Login
            </a>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;