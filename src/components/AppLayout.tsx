"use client";
import React from 'react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-gray-100">
            <main>
                {children}
            </main>
        </div>
    );
}