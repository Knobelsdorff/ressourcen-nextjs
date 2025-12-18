import { Key, Lock } from 'lucide-react'
import React, { useState } from 'react'
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/auth-provider";

const ChangePassword = () => {
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [changePassword, setChangePassword] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const { user } = useAuth();

    // change password func
    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (!user?.email) {
            setPasswordError('Nicht eingeloggt');
            return;
        }

        if (newPassword.length < 8) {
            setPasswordError('Neues Passwort muss mindestens 8 Zeichen haben');
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError('Passwörter stimmen nicht überein');
            return;
        }

        setPasswordLoading(true);

        try {
            // 1️⃣ Re-authenticate with current password
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: currentPassword,
            });

            if (signInError) {
                setPasswordError('Aktuelles Passwort ist falsch');
                return;
            }

            // 2️⃣ Update password
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (updateError) {
                setPasswordError(updateError.message);
                return;
            }

            // 3️⃣ Success
            setPasswordSuccess('Passwort erfolgreich geändert');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => {
                setChangePassword(false);
                setPasswordSuccess('')
            }, 500);
        } catch (err) {
            setPasswordError('Unerwarteter Fehler');
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleClose = ()=> {
        setPasswordSuccess('')
        setPasswordError('');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setChangePassword(false)
    }
    return (
        <div className='w-full'>
            <button onClick={() => setChangePassword(true)} className="flex items-center gap-3 sm:p-4 px-4 py-3 w-full bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                <Key className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                    <p className="font-medium text-blue-900">Passwort ändern</p>
                    <p className="text-blue-700 text-sm">Sicherheitseinstellungen</p>
                </div>
            </button>
            {changePassword && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-2xl max-w-xl w-full sm:p-8 p-4 relative my-8"
                    >
                        <div className="mx-auto sm:w-16 sm:h-16 w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center sm:mb-4 mb-2">
                            <Lock className="sm:w-8 sm:h-8 w-6 h-6 text-amber-600" />
                        </div>
            
                        <h2 className="sm:text-2xl text-xl font-bold text-amber-900 mb-2 text-center">
                        Passwort ändern
                        </h2>
                        <form onSubmit={handleChangePassword} className="space-y-3">
                            <input
                                type="password"
                                placeholder="Aktuelles Passwort"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full p-2 border sm:text-base text-sm rounded"
                            />

                            <input
                                type="password"
                                placeholder="Neues Passwort"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full p-2 border sm:text-base text-sm rounded"
                            />

                            <input
                                type="password"
                                placeholder="Neues Passwort bestätigen"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full p-2 border sm:text-base text-sm rounded"
                            />

                            {passwordError && <p className="text-red-600 sm:text-sm text-xs">{passwordError}</p>}
                            {passwordSuccess && <p className="text-green-600 sm:text-sm text-xs">{passwordSuccess}</p>}
                            <div className="flex sm:flex-row flex-col-reverse gap-3">
                                <button
                                    type="button"
                                    className="text-amber-600 px-6 py-2 rounded-lg border border-amber-600 hover:bg-slate-200 transition-all duration-300 font-medium max-sm:text-sm max-sm:w-full"
                                    onClick={handleClose}
                                >
                                    {'Cancel'}
                                </button>
                                <button
                                    type="submit"
                                    disabled={passwordLoading}
                                    className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-2.5 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all duration-300 font-medium max-sm:text-sm max-sm:w-full"
                                >
                                    {passwordLoading ? 'Speichern...' : 'Passwort ändern'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    )
}

export default ChangePassword