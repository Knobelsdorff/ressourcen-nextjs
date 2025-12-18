import { Trash2, AlertTriangle } from 'lucide-react'
import React, { useState } from 'react'
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";


const DeleteAccount = () => {
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const [password, setPassword] = useState('');
    const [confirmText, setConfirmText] = useState('');


    const { user } = useAuth();
    const router = useRouter();

    const handleDeleteAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (confirmText !== 'DELETE') {
            setDeleteError('Bitte "DELETE" eingeben');
            return;
        }

        setDeleteError('');

        if (!user?.email) {
            setDeleteError('Nicht eingeloggt');
            return;
        }

        if (!password) {
            setDeleteError('Passwort erforderlich');
            return;
        }

        setDeleteLoading(true);

        try {
            // 1️⃣ Re-authenticate
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password,
            });

            if (signInError) {
                throw new Error('Passwort ist falsch');
            }

            // 2️⃣ Call server delete API
            const session = (await supabase.auth.getSession()).data.session;

            const res = await fetch('/api/account/delete', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session?.access_token}`,
                },
            });

            if (!res.ok) {
                throw new Error('Account konnte nicht gelöscht werden');
            }

            // 3️⃣ Logout & redirect
            await supabase.auth.signOut();
            router.push('/');

        } catch (err: any) {
            setDeleteError(err.message || 'Unerwarteter Fehler');
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleClose = () => {
        setDeleteOpen(false)
        setDeleteLoading(false)
        setDeleteError('')
        setPassword('')
        setConfirmText('')
    }

    return (
        <div className='w-full'>
            <button
                onClick={() => setDeleteOpen(true)}
                className="flex items-center gap-3 sm:p-4 px-4 py-3 w-full bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
                <Trash2 className="w-5 h-5 text-red-600" />
                <div className="text-left">
                    <p className="font-medium text-red-900">Account löschen</p>
                    <p className="text-red-700 text-sm">Dauerhaft entfernen</p>
                </div>
            </button>
            {deleteOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-2xl max-w-xl w-full sm:p-8 p-4 relative my-8"
                    >
                        <div className="mx-auto sm:w-16 sm:h-16 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center sm:mb-4 mb-2">
                            <AlertTriangle className="sm:w-8 sm:h-8 w-6 h-6 text-red-600" />
                        </div>

                        <h2 className="sm:text-2xl text-xl font-bold text-red-900 mb-2 text-center">
                            Account endgültig löschen
                        </h2>

                        <p className="text-center text-red-700 sm:text-sm text-xs mb-4">
                            Diese Aktion ist nicht rückgängig zu machen.
                        </p>

                        <form onSubmit={handleDeleteAccount} className="space-y-3">
                            <input
                                type="password"
                                placeholder="Passwort zur Bestätigung"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-2 border sm:text-base text-sm rounded"
                            />


                            <input
                                type="text"
                                placeholder='Type "DELETE" to confirm'
                                value={confirmText}
                                onChange={(e) => {
                                    setConfirmText(e.target.value)
                                    setDeleteError('');
                                }
                                }
                                className="w-full p-2 border sm:text-base text-sm rounded"
                            />


                            {deleteError && (
                                <p className="text-red-600 sm:text-sm text-xs">
                                    {deleteError}
                                </p>
                            )}

                            <div className="flex sm:flex-row flex-col-reverse gap-3">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="text-red-600 px-6 py-2 rounded-lg border border-red-600 hover:bg-slate-200 transition-all duration-300 font-medium max-sm:text-sm max-sm:w-full"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={deleteLoading || confirmText !== 'DELETE'}
                                    className="bg-red-600 text-white px-6 py-2.5 rounded-lg hover:bg-red-700 transition-all duration-300 font-medium max-sm:text-sm max-sm:w-full"
                                >
                                    {deleteLoading ? 'Lösche...' : 'Account löschen'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    )
}

export default DeleteAccount