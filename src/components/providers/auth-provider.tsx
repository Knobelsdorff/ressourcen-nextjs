"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updateProfile: (updates: { full_name?: string; avatar_url?: string }) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial session check
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Track login event
        if (event === 'SIGNED_IN' && session?.user) {
          try {
            const { trackEvent } = await import('@/lib/analytics');
            trackEvent({
              eventType: 'user_login',
            }, { accessToken: session.access_token });
          } catch (error) {
            console.error('Error tracking login event:', error);
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    // Erkenne die aktuelle Domain zur Laufzeit
    const currentOrigin = window.location.origin;
    
    console.log('SignUp - Current origin:', currentOrigin);
    
    // Verwende API-Endpunkt für Multi-Account-Prävention
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        // Wenn Response kein JSON ist, versuche Text zu lesen
        const text = await response.text();
        console.error('SignUp API: Invalid JSON response:', text);
        return {
          error: new Error(`Server-Fehler (${response.status}): ${text || 'Unbekannter Fehler'}`),
          data: null
        };
      }
      
      if (!response.ok) {
        // Konvertiere API-Fehler in Supabase-Format
        const errorMessage = data.error || `Fehler bei der Registrierung (${response.status})`;
        console.error('SignUp API error:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          data: data,
        });
        return { 
          error: new Error(errorMessage),
          data: null 
        };
      }
      
      // Wenn erfolgreich, hole User-Daten von Supabase
      // Die Email-Bestätigung wird separat gehandhabt
      // User muss sich nach Bestätigung einloggen
      return { 
        error: null, 
        data: {
          user: data.user,
          session: null, // Session wird erst nach Email-Bestätigung erstellt
        }
      };
    } catch (fetchError: any) {
      console.error('SignUp API error:', fetchError);
      console.error('SignUp API error details:', {
        message: fetchError.message,
        name: fetchError.name,
        stack: fetchError.stack,
      });
      
      // Spezifische Fehlermeldungen
      let errorMessage = 'Netzwerkfehler bei der Registrierung';
      
      if (fetchError.message) {
        errorMessage = fetchError.message;
      } else if (fetchError.name === 'TypeError' && fetchError.message?.includes('fetch')) {
        errorMessage = 'Verbindungsfehler. Bitte überprüfe deine Internetverbindung.';
      }
      
      return { 
        error: new Error(errorMessage),
        data: null 
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const currentOrigin = window.location.origin;
    const redirectUrl = `${currentOrigin}/api/auth/callback?next=/reset-password`;
    
    console.log('Reset password redirect URL:', redirectUrl);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  };

  const updateProfile = async (updates: { full_name?: string; avatar_url?: string }) => {
    if (!user) return { error: new Error('No user logged in') };

    const { error } = await (supabase as any)
      .from('profiles')
      .upsert({
        id: user.id,
        ...updates,
        updated_at: new Date().toISOString(),
      } as any);
    
    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}