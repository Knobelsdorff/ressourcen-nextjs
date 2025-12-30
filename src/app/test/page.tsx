'use client';

import { useEffect, useState } from 'react';

export default function TestPage() {
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    // Get the full URL from the browser
    setCurrentUrl(window.location.href);

    // Optional: Update if URL changes (for hash/query changes)
    const handleUrlChange = () => {
      setCurrentUrl(window.location.href);
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">URL Test Page</h1>

        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-600 mb-2">Current URL:</h2>
            <div className="bg-gray-100 p-4 rounded-md break-all">
              <code className="text-blue-600 text-sm">{currentUrl || 'Loading...'}</code>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 mb-1">Protocol:</h3>
              <p className="text-sm text-gray-900">{currentUrl ? new URL(currentUrl).protocol : '-'}</p>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-500 mb-1">Host:</h3>
              <p className="text-sm text-gray-900">{currentUrl ? new URL(currentUrl).host : '-'}</p>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-500 mb-1">Pathname:</h3>
              <p className="text-sm text-gray-900">{currentUrl ? new URL(currentUrl).pathname : '-'}</p>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-500 mb-1">Search:</h3>
              <p className="text-sm text-gray-900">{currentUrl ? new URL(currentUrl).search || '(none)' : '-'}</p>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-500 mb-1">Hash:</h3>
              <p className="text-sm text-gray-900">{currentUrl ? new URL(currentUrl).hash || '(none)' : '-'}</p>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-500 mb-1">Origin:</h3>
              <p className="text-sm text-gray-900">{currentUrl ? new URL(currentUrl).origin : '-'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
