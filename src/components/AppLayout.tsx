"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {
    Home,
    User,
    LogOut,
    Key, Files, LucideListTodo,
    ChevronDown,
} from 'lucide-react';
import { useAuth } from './providers/auth-provider';
import { createSPAClient } from '@/lib/supabase/client';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const [isUserDropdownOpen, setUserDropdownOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    const { user } = useAuth();

    const handleLogout = async () => {
        const supabase = createSPAClient();
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Logout error:', error);
        }
        setUserDropdownOpen(false);
        router.push('/');
    };

    const getInitials = (email: string) => {
        const parts = email.split('@')[0].split(/[._-]/);
        return parts.length > 1
            ? (parts[0][0] + parts[1][0]).toUpperCase()
            : parts[0].slice(0, 2).toUpperCase();
    };

    const productName = process.env.NEXT_PUBLIC_PRODUCTNAME;

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header ohne Sidebar */}
            <div className="sticky top-0 z-10 flex items-center justify-between h-16 bg-white shadow-sm px-4">
                <div className="flex items-center space-x-4">
                    <span className="text-xl font-semibold text-primary-600">{productName}</span>
                </div>

                <div className="relative ml-auto">
                    <button
                        onClick={() => setUserDropdownOpen(!isUserDropdownOpen)}
                        className="flex items-center space-x-2 text-sm text-gray-700 hover:text-gray-900"
                    >
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-primary-700 font-medium">
                                {user ? getInitials(user.email as string)  : '??'}
                            </span>
                        </div>
                        <span>{user?.email || 'Loading...'}</span>
                        <ChevronDown className="h-4 w-4"/>
                    </button>

                    {isUserDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg border">
                            <div className="p-2 border-b border-gray-100">
                                <p className="text-xs text-gray-500">Signed in as</p>
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    {user?.email}
                                </p>
                            </div>
                            <div className="py-1">
                               
                                <button
                                    onClick={() => {
                                        handleLogout();
                                        setUserDropdownOpen(false);
                                    }}
                                    className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                    <LogOut className="mr-3 h-4 w-4 text-red-400"/>
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Hauptinhalt ohne Sidebar-Offset */}
            <main>
                {children}
            </main>
        </div>
    );
}