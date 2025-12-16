"use client";
import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Key, User, CheckCircle, Sparkles } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase';

export default function UserSettingsPage() {
    const { user, updateProfile } = useAuth();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [fullName, setFullName] = useState('');
    const [savingName, setSavingName] = useState(false);



    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError("New passwords don't match");
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

      
    };

    // Load current full_name from profiles
    useEffect(() => {
        const load = async () => {
            if (!user) return;
            const { data, error } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', user.id)
                .single();
            if (!error) setFullName((data as any)?.full_name || '');
        };
        load();
    }, [user]);

    const handleSaveName = async () => {
        if (!user) return;
        setSavingName(true);
        setError('');
        setSuccess('');
        const { error } = await updateProfile({ full_name: fullName.trim() || null as any });
        if (error) {
            setError(error.message || 'Could not save name');
        } else {
            setSuccess('Name gespeichert. Er wird sanft in neuen Geschichten verwendet.');
        }
        setSavingName(false);
    };

    return (
        <div className="space-y-6 p-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">User Settings</h1>
                <p className="text-muted-foreground">
                    Manage your account settings and preferences
                </p>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {success && (
                <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                </Alert>
            )}

            <div className="grid gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader className='p-4'>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                User Details
                            </CardTitle>
                            <CardDescription>Your account information</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-500">User ID</label>
                                <p className="mt-1 text-sm">{user?.id}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-500">Email</label>
                                <p className="mt-1 text-sm">{user?.email}</p>
                            </div>
                            <div className="pt-2">
                                <div className="flex items-center gap-2 mb-1">
                                    <Sparkles className="h-4 w-4 text-amber-600" />
                                    <label className="text-sm font-medium text-amber-700">
                                        Vollständiger Name (für personalisierte Geschichten)
                                    </label>
                                </div>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="z. B. Anna Müller"
                                    className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                                />
                                <p className="mt-1 text-xs text-amber-700">
                                    Wird dezent (1–2×) in neuen Geschichten verwendet – nur wenn aktiviert.
                                </p>
                                <div className="mt-3">
                                    <button
                                        onClick={handleSaveName}
                                        disabled={savingName}
                                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm disabled:opacity-60"
                                    >
                                        {savingName ? 'Speichere…' : 'Name speichern'}
                                    </button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                
                </div>
            </div>
        </div>
    );
}