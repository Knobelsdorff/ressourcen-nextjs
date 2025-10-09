"use client"
import React from 'react'
import { useAuth } from './providers/auth-provider';
import Link from 'next/link';
import { Button } from './ui/button';
import { AuthModal } from './modals/auth-modal';

const AuthAwareButtons = () => {
    const {user}=  useAuth();
  return (
   <>
   {user ? (
    <Link href="/dashboard">
                <Button
                
                
                
                
                className="hidden sm:flex text-xs sm:text-xs md:text-sm lg:text-sm"
                >
                  Dashboard
                </Button>
                  </Link>
              ) : (
              
                  <AuthModal buttonSizeMobile="xsmall" />
               
              )}
   </>
  )
}

export default AuthAwareButtons