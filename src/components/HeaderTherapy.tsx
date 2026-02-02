"use client"

import Image from 'next/image';
import Link from 'next/link';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from "@/components/providers/auth-provider";
import { useRouter, usePathname } from "next/navigation";

const THERAPY_HOME_URL = "https://www.knobelsdorff-therapie.de/";

const HeaderTherapy = () => {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Handler für "Startseite" - redirect to therapy website
  const handleHomeClick = () => {
    setMobileMenuOpen(false);
    window.location.href = THERAPY_HOME_URL;
  };

  // Handler für "Eine Power Story entdecken" - Weiterleitung zu Ankommen-Seite
  const handleDiscoverPowerStory = () => {
    setMobileMenuOpen(false);
    setTimeout(() => {
      router.push("/ankommen");
    }, 100);
  };

  // Handler für "Mein Zugang"
  const handleAccessClick = () => {
    setMobileMenuOpen(false);
    router.push("/zugang");                                                             
  };

  const handleLogout = async () => {
    setMobileMenuOpen(false);                         
    await signOut();
  };

  if (loading) {
    return (
      <header className="md:px-[53px] px-4 pt-[10px] pb-[15px] flex justify-between  items-center border-b relative">
        <div className="sm:w-[255px] w-[240px] h-[55px] bg-gray-200 rounded animate-pulse"></div>
        <div className="w-32 h-8 bg-gray-200 rounded animate-pulse"></div>
      </header>
    );
  }

  // Hide header on /ankommen and /zugang pages (after loading check)
  if (pathname === '/ankommen' || pathname === '/zugang' || pathname === '/zugang-erhalten') {
    return null;
  }

  return (
    <header className="max-h-[82px] md:px-[53px] px-4 pt-[10px] pb-[15px] flex justify-between  items-center border-b relative">
      <a
        href={THERAPY_HOME_URL}
        className="hover:opacity-80 transition-opacity"
      >
        <Image width={255} height={55} alt='site logo' className='sm:w-[255px] w-[240px]' src='/images/andreas-logo.png' />
      </a>

      {/* Desktop Navigation */}
      <nav className="hidden lg:flex">
        <ul className='flex gap-[34px] relative items-center font-trebuchet'>
          {user ? (
            <>
              {/* Eingeloggte User */}
              <li className='py-[10px]'>
                <button onClick={handleHomeClick} className="text-[#5b5b5b] hover:underline">
                  Startseite
                </button>
              </li>
              <li className='py-[10px]'>
                <Link href="/dashboard" className="text-[#5b5b5b] hover:underline">
                  Dashboard
                </Link>
              </li>
              <li className='py-[10px]'>
                <button onClick={handleLogout} className="text-[#5b5b5b] hover:underline">
                  Abmelden
                </button>
              </li>
              <li className='pt-[10px] pb-4'>
                <button onClick={handleDiscoverPowerStory} className="bg-[#d62b2b] text-white px-[15px] pt-[10px] pb-[17px] rounded-[5px] hover:bg-[#b82424] transition-colors">
                  Eine Power Story entdecken
                </button>
              </li>
            </>
          ) : (
            <>
              {/* Nicht eingeloggte User */}
              <li className='py-[10px]'>
                <button onClick={handleHomeClick} className="text-[#5b5b5b] hover:underline">
                  Startseite
                </button>
              </li>
              <li className='py-[10px]'>
                <button onClick={handleAccessClick} className="text-[#5b5b5b] hover:underline">
                  Mein Zugang
                </button>
              </li>
              <li className='pt-[10px] pb-4'>
                <button onClick={handleDiscoverPowerStory} className="bg-[#d62b2b] text-white px-[15px] pt-[10px] pb-[17px] rounded-[5px] hover:bg-[#b82424] transition-colors">
                  Eine Power Story entdecken
                </button>
              </li>
            </>
          )}
        </ul>
      </nav>

      {/* Hamburger Button */}
      <button
        className="lg:hidden flex flex-col gap-1"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Menü öffnen"
      >
        <span className="block w-6 h-0.5 bg-black"></span>
        <span className="block w-6 h-0.5 bg-black"></span>
        <span className="block w-6 h-0.5 bg-black"></span>
      </button>

      {/* Mobile Menu */}
      <div
        className={`lg:hidden absolute top-full left-0 w-full bg-white shadow-lg transition-max-height duration-300 overflow-hidden z-50 ${mobileMenuOpen ? 'max-h-[1000px]' : 'max-h-0'}`}
      >
        <ul className='flex flex-col font-trebuchet'>
          {user ? (
            <>
              {/* Eingeloggte User Mobile */}
              <li className='border-b py-3'>
                <button onClick={handleHomeClick} className='px-4 py-3 w-full text-left hover:bg-gray-50'>
                  Startseite
                </button>
              </li>
              <li className='border-b py-3'>
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className='px-4 py-3 block hover:bg-gray-50'>
                  Dashboard
                </Link>
              </li>
              <li className='border-b py-3'>
                <button onClick={handleLogout} className='px-4 py-3 w-full text-left hover:bg-gray-50'>
                  Abmelden
                </button>
              </li>
              <li className='px-4 py-4'>
                <button onClick={handleDiscoverPowerStory} className="block w-full text-center bg-[#d62b2b] text-white px-[15px] pt-[10px] pb-[10px] rounded-[5px] hover:bg-[#b82424] transition-colors">
                  Eine Power Story entdecken
                </button>
              </li>
            </>
          ) : (
            <>
              {/* Nicht eingeloggte User Mobile */}
              <li className='border-b py-3'>
                <button onClick={handleHomeClick} className='px-4 py-3 w-full text-left hover:bg-gray-50'>
                  Startseite
                </button>
              </li>
              <li className='border-b py-3'>
                <button onClick={handleAccessClick} className='px-4 py-3 w-full text-left hover:bg-gray-50'>
                  Mein Zugang
                </button>
              </li>
              <li className='px-4 py-4'>
                <button onClick={handleDiscoverPowerStory} className="block w-full text-center bg-[#d62b2b] text-white px-[15px] pt-[10px] pb-[10px] rounded-[5px] hover:bg-[#b82424] transition-colors">
                  Eine Power Story entdecken
                </button>
              </li>
            </>
          )}
        </ul>
      </div>
    </header>
  );
};

export default HeaderTherapy;
