import { Star } from 'lucide-react'
import React, { useState } from 'react'
import { motion } from "framer-motion";
import { useAuth } from "@/components/providers/auth-provider";

const FeedbackModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [name, setName] = useState('');
    const [message, setMessage] = useState('');
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const { user } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!user?.email) {
            setError('Nicht eingeloggt');
            return;
        }

        if (!name.trim()) {
            setError('Bitte geben Sie Ihren Namen ein');
            return;
        }

        if (!message.trim()) {
            setError('Bitte geben Sie eine Nachricht ein');
            return;
        }

        if (rating === 0) {
            setError('Bitte wählen Sie eine Bewertung');
            return;
        }

        setLoading(true);

        try {
            // Prepare form data
            const formData = new FormData();
            formData.append('name', name.trim());
            formData.append('message', message.trim());
            formData.append('rating', rating.toString());
            formData.append('userEmail', user.email);

            // Send feedback form data to API
            const response = await fetch('/api/feedback', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Fehler beim Senden der Nachricht');
                return;
            }

            // Success
            setSuccess('Feedback erfolgreich gesendet');
            setName('');
            setMessage('');
            setRating(0);

            setTimeout(() => {
                setIsOpen(false);
                setSuccess('');
            }, 1500);
        } catch (err) {
            console.error('Submit error:', err);
            setError('Unerwarteter Fehler');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setSuccess('');
        setError('');
        setName('');
        setMessage('');
        setRating(0);
        setIsOpen(false);
    };

    return (
        <div className='w-full'>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-3 sm:p-4 px-4 py-3 w-full bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
            >
                <Star className="w-5 h-5 text-purple-600" />
                <div className="text-left">
                    <p className="font-medium text-purple-900">Feedback</p>
                    <p className="text-purple-700 text-sm">Verbesserungsvorschläge</p>
                </div>
            </button>
            {isOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-2xl max-w-xl w-full sm:p-8 p-4 relative my-8"
                    >
                        <div className="mx-auto sm:w-16 sm:h-16 w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center sm:mb-4 mb-2">
                            <Star className="sm:w-8 sm:h-8 w-6 h-6 text-purple-600" />
                        </div>

                        <h2 className="sm:text-2xl text-xl font-bold text-purple-900 mb-2 text-center">
                            Feedback geben
                        </h2>
                        <p className="text-center text-purple-700 text-sm mb-4">
                            Teilen Sie uns Ihre Verbesserungsvorschläge mit
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                    Name
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    placeholder="Ihr Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full p-2 border sm:text-base text-sm rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Bewertung
                                </label>
                                <div className="flex gap-2 justify-center py-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            onMouseEnter={() => setHoveredRating(star)}
                                            onMouseLeave={() => setHoveredRating(0)}
                                            className="transition-transform hover:scale-110"
                                        >
                                            <Star
                                                className={`sm:w-10 sm:h-10 w-8 h-8 transition-colors ${
                                                    star <= (hoveredRating || rating)
                                                        ? 'fill-purple-500 text-purple-500'
                                                        : 'text-gray-300'
                                                }`}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                                    Ihre Nachricht
                                </label>
                                <textarea
                                    id="message"
                                    placeholder="Teilen Sie uns Ihre Verbesserungsvorschläge mit..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={5}
                                    className="w-full p-2 border sm:text-base text-sm rounded focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                                    required
                                />
                            </div>

                            {error && <p className="text-red-600 sm:text-sm text-xs">{error}</p>}
                            {success && <p className="text-green-600 sm:text-sm text-xs">{success}</p>}

                            <div className="flex sm:flex-row flex-col-reverse gap-3 pt-2">
                                <button
                                    type="button"
                                    className="text-purple-600 px-6 py-2 rounded-lg border border-purple-600 hover:bg-slate-200 transition-all duration-300 font-medium max-sm:text-sm max-sm:w-full"
                                    onClick={handleClose}
                                    disabled={loading}
                                >
                                    Abbrechen
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-2.5 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-300 font-medium max-sm:text-sm max-sm:w-full disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Wird gesendet...' : 'Feedback senden'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default FeedbackModal;