"use client"

import Image from 'next/image';
import Link from 'next/link';
import React, { useState } from 'react';

const HeaderTherapy = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [subMenuOpen, setSubMenuOpen] = useState(false);

  return (
    <header className="md:px-[53px] px-4 pt-[10px] pb-[15px] flex justify-between lg:items-end items-center border-b relative">
      <Link href="/">
        <Image width={255} height={55} alt='site logo' className='sm:w-[255px] w-[240px]' src='/images/andreas-logo.png' />
      </Link>
      {/* Desktop Navigation */}
      <nav className="hidden lg:flex">
        <ul className='flex gap-[34px] relative items-center font-trebuchet'>
          <li className='py-[10px] group'>
            <Link href="/" className="underline flex items-center">
              Psychotherapie 
              <Image width={22} height={39} className='ml-[7px]' alt='site logo' src='/icons/down-arrow.svg'/>
            </Link>
            <ul className='absolute min-w-[190px] border-[#f0f0f0] border top-full transition-all duration-300 opacity-0 invisible flex flex-col group-hover:visible group-hover:opacity-100 shadow-sm bg-white'>
              <li className='h-[70px] border-[#d62b2b] border-y-2'><Link href="/" className='px-4 h-full text-[#5b5b5b] hover:underline flex items-center justify-center'>Traumatherapie</Link></li>
              <li className='h-[50px] px-4'><Link href="/" className='px-4 h-full text-[#5b5b5b] border-[#d3d3d3] border-b hover:underline flex items-center'>Depression</Link></li>
              <li className='h-[50px] px-4'><Link href="/" className='px-4 h-full text-[#5b5b5b] border-[#d3d3d3] border-b hover:underline flex items-center'>Panik & Angst</Link></li>
              <li className='h-[50px] px-4'><Link href="/" className='px-4 h-full text-[#5b5b5b] hover:underline flex items-center'>Paartherapie</Link></li>
            </ul>
          </li>
          <li><Link href="/" className="text-[#5b5b5b] hover:underline">Reise zu dir</Link></li>
          <li><Link href="/" className="text-[#5b5b5b] hover:underline">About</Link></li>
          <li><Link href="/" className="text-[#5b5b5b] hover:underline">FAQ</Link></li>
          <li className='pt-[10px] pb-4'><Link href="/" className="bg-[#d62b2b] text-white px-[15px] pt-[10px] pb-[17px] rounded-[5px]">Gratis-Erstgespräch</Link></li>
        </ul>
      </nav>

      {/* Hamburger Button */}
      <button 
        className="lg:hidden flex flex-col gap-1" 
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        <span className="block w-6 h-0.5 bg-black"></span>
        <span className="block w-6 h-0.5 bg-black"></span>
        <span className="block w-6 h-0.5 bg-black"></span>
      </button>

      {/* Mobile Menu */}
      <div 
        className={`lg:hidden absolute top-full left-0 w-full bg-white shadow-lg transition-max-height duration-300 overflow-hidden ${mobileMenuOpen ? 'max-h-[1000px]' : 'max-h-0'}`}
      >
        <ul className='flex flex-col font-trebuchet'>
          {/* Psychotherapie with nested submenu */}
          <li className='border-b'>
            <button 
              className="w-full text-left px-4 py-4 flex justify-between items-center " 
              onClick={() => setSubMenuOpen(!subMenuOpen)}
            >
              Psychotherapie
              <span className={`transition-transform duration-300 ${subMenuOpen ? 'rotate-180' : ''}`}>&#9660;</span>
            </button>
            <ul className={`flex flex-col bg-gray-100 transition-max-height duration-300 overflow-hidden ${subMenuOpen ? 'max-h-[500px]' : 'max-h-0'}`}>
              <li className='border-b py-3'><Link href="/" className='px-4 py-3'>Traumatherapie</Link></li>
              <li className='border-b py-3'><Link href="/" className='px-4 py-3'>Depression</Link></li>
              <li className='border-b py-3'><Link href="/" className='px-4 py-3'>Panik & Angst</Link></li>
              <li className='py-3'><Link href="/" className='px-4 py-3'>Paartherapie</Link></li>
            </ul>
          </li>

          <li className='border-b py-3'><Link href="/" className='px-4 py-4'>Reise zu dir</Link></li>
          <li className='border-b py-3'><Link href="/" className='px-4 py-4'>About</Link></li>
          <li className='border-b py-3'><Link href="/" className='px-4 py-4'>FAQ</Link></li>
          <li className='px-4 py-4'>
            <Link href="/" className="block text-center bg-[#d62b2b] text-white px-[15px] pt-[10px] pb-[10px] rounded-[5px]">Gratis-Erstgespräch</Link>
          </li>
        </ul>
      </div>
    </header>
  );
};

export default HeaderTherapy;
