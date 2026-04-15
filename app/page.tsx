'use client';
import { useState } from 'react';

export default function Home() {
  const [status, setStatus] = useState('Ready to test the engine.');

  const runSync = async () => {
    setStatus('Crawler running... fetching from Slack securely...');
    try {
      const response = await fetch('/api/slack-sync', {
        method: 'POST',
      });
      const data = await response.json();

      // Display the result on the screen
      setStatus(JSON.stringify(data, null, 2));
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-8">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-2 text-slate-800">
          VM Sync Engine
        </h1>
        <p className="text-slate-500 mb-8">
          Click below to trigger the crawler.
        </p>

        <button
          onClick={runSync}
          className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          Fetch Latest Slack Executions
        </button>

        <div className="mt-8 text-left">
          <p className="text-sm font-semibold text-slate-400 mb-2">
            SERVER RESPONSE:
          </p>
          <pre className="bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
            {status}
          </pre>
        </div>
      </div>
    </div>
  );
}
