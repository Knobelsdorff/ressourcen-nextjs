"use client";

import { Menu } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-500 to-orange-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 sm:w-7 sm:h-7 bg-white rounded flex items-center justify-center">
              <div className="w-4 h-4 sm:w-5 sm:h-5 bg-orange-500 rounded-sm transform rotate-12"></div>
            </div>
            <span className="text-white text-xl sm:text-2xl font-semibold tracking-tight">
              AICORE
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            <button className="text-white hover:text-orange-100 transition-colors text-sm">
              Home
            </button>
            <button className="text-white hover:text-orange-100 transition-colors text-sm flex items-center gap-1">
              Platform
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button className="text-white hover:text-orange-100 transition-colors text-sm">
              Agents
            </button>
            <button className="text-white hover:text-orange-100 transition-colors text-sm">
              Docs
            </button>
            <button className="text-white hover:text-orange-100 transition-colors text-sm">
              Resources
            </button>
            <button className="text-white hover:text-orange-100 transition-colors text-sm">
              Pricing
            </button>
          </div>

          {/* Get Started Button - Desktop */}
          <button className="hidden lg:block bg-white text-orange-600 px-6 py-2 rounded-full font-medium text-sm hover:bg-orange-50 transition-colors">
            Get Started
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden text-white p-2"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden pb-4 space-y-3">
            <button className="block w-full text-left text-white hover:text-orange-100 transition-colors text-sm py-2">
              Home
            </button>
            <button className="block w-full text-left text-white hover:text-orange-100 transition-colors text-sm py-2">
              Platform
            </button>
            <button className="block w-full text-left text-white hover:text-orange-100 transition-colors text-sm py-2">
              Agents
            </button>
            <button className="block w-full text-left text-white hover:text-orange-100 transition-colors text-sm py-2">
              Docs
            </button>
            <button className="block w-full text-left text-white hover:text-orange-100 transition-colors text-sm py-2">
              Resources
            </button>
            <button className="block w-full text-left text-white hover:text-orange-100 transition-colors text-sm py-2">
              Pricing
            </button>
            <button className="bg-white text-orange-600 px-6 py-2 rounded-full font-medium text-sm w-full mt-4">
              Get Started
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
