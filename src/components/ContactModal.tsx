import { MessageCircle, X, Upload } from 'lucide-react'
import React, { useState } from 'react'
import { motion } from "framer-motion";
import { useAuth } from "@/components/providers/auth-provider";

// Easy to configure screenshot limit
const MAX_SCREENSHOTS = 3;

const ContactModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [name, setName] = useState('');
    const [message, setMessage] = useState('');
    const [screenshots, setScreenshots] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const { user } = useAuth();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);

        if (screenshots.length + files.length > MAX_SCREENSHOTS) {
            setError(`Maximal ${MAX_SCREENSHOTS} Screenshots erlaubt`);
            return;
        }

        // Validate file types
        const validFiles = files.filter(file => {
            const isImage = file.type.startsWith('image/');
            if (!isImage) {
                setError('Nur Bilddateien sind erlaubt');
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) return;

        // Create preview URLs
        const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
        setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
        setScreenshots(prev => [...prev, ...validFiles]);
        setError('');
    };

    const removeScreenshot = (index: number) => {
        // Revoke object URL to prevent memory leaks
        URL.revokeObjectURL(previewUrls[index]);
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
        setScreenshots(prev => prev.filter((_, i) => i !== index));
    };

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

        setLoading(true);

        try {
            // Prepare form data with all fields and screenshots
            const formData = new FormData();
            formData.append('name', name.trim());
            formData.append('message', message.trim());
            formData.append('userEmail', user.email);

            // Append all screenshots
            screenshots.forEach((screenshot) => {
                formData.append('screenshots', screenshot);
            });

            // Send contact form data to API (including screenshot uploads)
            const response = await fetch('/api/contact', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Fehler beim Senden der Nachricht');
                return;
            }

            // Success
            setSuccess('Nachricht erfolgreich gesendet');
            setName('');
            setMessage('');
            setScreenshots([]);
            setPreviewUrls([]);

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
        setScreenshots([]);
        // Clean up preview URLs
        previewUrls.forEach(url => URL.revokeObjectURL(url));
        setPreviewUrls([]);
        setIsOpen(false);
    };

    return (
        <div className='w-full'>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-3 sm:p-4 px-4 py-3 w-full bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
            >
                <MessageCircle className="w-5 h-5 text-green-600" />
                <div className="text-left">
                    <p className="font-medium text-green-900">Kontakt</p>
                    <p className="text-green-700 text-sm">Support kontaktieren</p>
                </div>
            </button>
            {isOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-2xl shadow-2xl max-w-xl w-full sm:p-8 p-4 relative my-8"
                    >
                        <div className="mx-auto sm:w-16 sm:h-16 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center sm:mb-4 mb-2">
                            <MessageCircle className="sm:w-8 sm:h-8 w-6 h-6 text-green-600" />
                        </div>

                        <h2 className="sm:text-2xl text-xl font-bold text-green-900 mb-2 text-center">
                            Support kontaktieren
                        </h2>
                        <p className="text-center text-green-700 text-sm mb-4">
                            Senden Sie uns Ihre Nachricht oder Feedback
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
                                    className="w-full p-2 border sm:text-base text-sm rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                                    Nachricht
                                </label>
                                <textarea
                                    id="message"
                                    placeholder="Ihre Nachricht..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={5}
                                    className="w-full p-2 border sm:text-base text-sm rounded focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Screenshots (optional, max {MAX_SCREENSHOTS})
                                </label>

                                {screenshots.length < MAX_SCREENSHOTS && (
                                    <label className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 transition-colors cursor-pointer">
                                        <Upload className="w-5 h-5 text-gray-500" />
                                        <span className="text-sm text-gray-600">
                                            Screenshot hochladen ({screenshots.length}/{MAX_SCREENSHOTS})
                                        </span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                    </label>
                                )}

                                {previewUrls.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2 mt-3">
                                        {previewUrls.map((url, index) => (
                                            <div key={index} className="relative group">
                                                <img
                                                    src={url}
                                                    alt={`Screenshot ${index + 1}`}
                                                    className="w-full h-24 object-cover rounded-lg border"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeScreenshot(index)}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {error && <p className="text-red-600 sm:text-sm text-xs">{error}</p>}
                            {success && <p className="text-green-600 sm:text-sm text-xs">{success}</p>}

                            <div className="flex sm:flex-row flex-col-reverse gap-3 pt-2">
                                <button
                                    type="button"
                                    className="text-green-600 px-6 py-2 rounded-lg border border-green-600 hover:bg-slate-200 transition-all duration-300 font-medium max-sm:text-sm max-sm:w-full"
                                    onClick={handleClose}
                                    disabled={loading}
                                >
                                    Abbrechen
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-2.5 rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-300 font-medium max-sm:text-sm max-sm:w-full disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Wird gesendet...' : 'Nachricht senden'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default ContactModal;